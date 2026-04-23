import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Turno = "mattina" | "pomeriggio";

interface SlotIntervento {
  utenteId: number;
  turno: Turno;
  data: Date;
  durata: number;
  tipoServizioId: number;
  skillRichieste: number[];
}

interface AssegnazioneIntervento extends SlotIntervento {
  operatoreId: number;
  operatoreNome: string;
}

export interface RisultatoGenerazione {
  assegnate: AssegnazioneIntervento[];
  scoperti: SlotIntervento[];
}

const MINUTI_PER_TURNO: Record<Turno, number> = {
  mattina: 390,  // 8:00 - 14:30
  pomeriggio: 360, // 14:30 - 18:30
};

function oraToTurno(ora: string): Turno {
  const h = parseInt(ora.split(":")[0]);
  return h < 13 ? "mattina" : "pomeriggio";
}

function getChiave(operatoreId: number, data: Date, turno: Turno): string {
  return `${operatoreId}-${data.toISOString().slice(0, 10)}-${turno}`;
}

function lunedi(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function domenica(d: Date): Date {
  const date = lunedi(d);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function generaTurni(
  dataInizio: Date,
  dataFine: Date,
): Promise<RisultatoGenerazione> {
  // Carica operatori con le loro skill
  const operatori = await prisma.operatore.findMany({
    where: { attivo: true },
    include: { skills: { include: { skill: true } } },
  });

  // Carica utenti con i piani assistenziali e skill richieste
  const utenti = await prisma.utente.findMany({
    where: { attivo: true },
    include: {
      piani: {
        where: { attivo: true },
        include: {
          tipoServizio: {
            include: { skills: true },
          },
        },
      },
      equipe: {
        include: { membri: true },
      },
    },
  });

  // Carica indisponibilità nel periodo
  const indisponibilita = await prisma.indisponibilita.findMany({
    where: { data: { gte: dataInizio, lte: dataFine } },
  });
  const setIndisponibili = new Set(
    indisponibilita.map(
      (i) => `${i.operatoreId}-${i.data.toISOString().slice(0, 10)}`,
    ),
  );

  // Seed ore settimanali da interventi già esistenti nelle stesse settimane
  // ma al di fuori del range di rigenerazione (non verranno cancellati)
  const inizioSettimane = lunedi(dataInizio);
  const fineSettimane = domenica(dataFine);

  const oreSettimana = new Map<number, number>();
  operatori.forEach((o) => oreSettimana.set(o.id, 0));

  const interventiPreesistenti = await prisma.intervento.findMany({
    where: {
      operatoreId: { not: null },
      OR: [
        { data: { gte: inizioSettimane, lt: dataInizio } },
        { data: { gt: dataFine, lte: fineSettimane } },
      ],
    },
    select: { operatoreId: true, durata: true },
  });
  interventiPreesistenti.forEach((i) => {
    if (i.operatoreId !== null) {
      oreSettimana.set(
        i.operatoreId,
        (oreSettimana.get(i.operatoreId) ?? 0) + i.durata / 60,
      );
    }
  });

  // Genera slot da coprire leggendo i piani assistenziali
  const slots: SlotIntervento[] = [];
  const cursor = new Date(dataInizio);

  while (cursor <= dataFine) {
    const giornoSettimana = cursor.getDay(); // 0=dom, 1=lun...
    const giornoStr = giornoSettimana.toString();

    for (const utente of utenti) {
      for (const piano of utente.piani) {
        const giorni = piano.giorniSettimana.split(",");
        if (!giorni.includes(giornoStr)) continue;

        const skillRichieste = piano.tipoServizio.skills.map((s) => s.skillId);

        slots.push({
          utenteId: utente.id,
          turno: oraToTurno(piano.oraInizio),
          data: new Date(cursor),
          durata: piano.tipoServizio.durata,
          tipoServizioId: piano.tipoServizioId,
          skillRichieste,
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Traccia minuti usati per operatore/giorno/turno
  const minutiUsati = new Map<string, number>();

  const assegnate: AssegnazioneIntervento[] = [];
  const scoperti: SlotIntervento[] = [];

  for (const slot of slots) {
    const dataStr = slot.data.toISOString().slice(0, 10);

    // Trova l'equipe dell'utente per questo slot
    const utente = utenti.find((u) => u.id === slot.utenteId);
    const equipe = utente?.equipe[0];
    const idEquipe = equipe?.membri.map((m) => m.operatoreId) ?? [];

    // Candidati: skill compatibili + disponibili + turno capiente
    const candidati = operatori.filter((op) => {
      if (setIndisponibili.has(`${op.id}-${dataStr}`)) return false;

      const skillOp = new Set(op.skills.map((s) => s.skillId));
      if (!slot.skillRichieste.every((s) => skillOp.has(s))) return false;

      if ((oreSettimana.get(op.id) ?? 0) >= op.oreSettimanali) return false;

      const chiave = getChiave(op.id, slot.data, slot.turno);
      const occupati = minutiUsati.get(chiave) ?? 0;
      if (occupati + slot.durata > MINUTI_PER_TURNO[slot.turno]) return false;

      return true;
    });

    if (candidati.length === 0) {
      // Slot non coperto — salvato in DB con operatoreId null per gestione manuale
      scoperti.push(slot);
      continue;
    }

    // Ordina: prima membri dell'equipe, poi per ore usate (bilanciamento)
    candidati.sort((a, b) => {
      const aInEquipe = idEquipe.includes(a.id) ? 0 : 1;
      const bInEquipe = idEquipe.includes(b.id) ? 0 : 1;
      if (aInEquipe !== bInEquipe) return aInEquipe - bInEquipe;
      return (oreSettimana.get(a.id) ?? 0) - (oreSettimana.get(b.id) ?? 0);
    });

    const scelto = candidati[0];
    const chiave = getChiave(scelto.id, slot.data, slot.turno);

    minutiUsati.set(chiave, (minutiUsati.get(chiave) ?? 0) + slot.durata);
    oreSettimana.set(
      scelto.id,
      (oreSettimana.get(scelto.id) ?? 0) + slot.durata / 60,
    );

    assegnate.push({
      ...slot,
      operatoreId: scelto.id,
      operatoreNome: scelto.nome,
    });
  }

  return { assegnate, scoperti };
}

export async function salvaAssegnazioni(
  assegnate: AssegnazioneIntervento[],
  scoperti: SlotIntervento[],
) {
  const tuttiSlot = [
    ...assegnate.map((a) => a.data),
    ...scoperti.map((s) => s.data),
  ];
  if (tuttiSlot.length === 0) return;

  const dataMin = tuttiSlot.reduce((m, d) => (d < m ? d : m));
  const dataMax = tuttiSlot.reduce((m, d) => (d > m ? d : m));

  await prisma.intervento.deleteMany({
    where: { data: { gte: dataMin, lte: dataMax }, completato: false },
  });

  const datiAssegnati = assegnate.map((a) => ({
    utenteId: a.utenteId,
    operatoreId: a.operatoreId,
    tipoServizioId: a.tipoServizioId,
    data: a.data,
    turno: a.turno,
    durata: a.durata,
  }));

  const datiScoperti = scoperti.map((s) => ({
    utenteId: s.utenteId,
    operatoreId: null as null,
    tipoServizioId: s.tipoServizioId,
    data: s.data,
    turno: s.turno,
    durata: s.durata,
  }));

  await prisma.intervento.createMany({
    data: [...datiAssegnati, ...datiScoperti],
  });
}
