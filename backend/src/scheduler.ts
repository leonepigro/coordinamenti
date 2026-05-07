import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

type Turno = "mattina" | "pomeriggio";

interface SlotIntervento {
  utenteId: number;
  turno: Turno;
  data: Date;
  durata: number;
  tipoServizioId: number;
  skillRichieste: number[];
  vincoloSesso: string | null;
  vincoloNazionalita: string | null;
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
    include: {
      skills: { include: { skill: true } },
      commesse: true,
    },
  });

  // Carica utenti con i piani assistenziali e skill richieste
  const utenti = await prisma.utente.findMany({
    where: { attivo: true },
    include: {
      piani: {
        where: { attivo: true },
        include: {
          tipoServizio: { include: { skills: true } },
          skills: true,
        },
      },
      commessa: true,
      operatoriPreferiti: { select: { operatoreId: true } },
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

        const skillRichieste = piano.skills.length > 0
          ? piano.skills.map((s) => s.skillId)
          : piano.tipoServizio.skills.map((s) => s.skillId);

        slots.push({
          utenteId: utente.id,
          turno: oraToTurno(piano.oraInizio),
          data: new Date(cursor),
          durata: piano.durata ?? piano.tipoServizio.durata,
          tipoServizioId: piano.tipoServizioId,
          skillRichieste,
          vincoloSesso: piano.vincoloSesso,
          vincoloNazionalita: piano.vincoloNazionalita,
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Traccia minuti usati per operatore/giorno/turno
  const minutiUsati = new Map<string, number>();
  // Traccia quante volte ogni operatore è stato assegnato a ciascun utente (per rotazione)
  const contaPerUtente = new Map<string, number>();

  const assegnate: AssegnazioneIntervento[] = [];
  const scoperti: SlotIntervento[] = [];

  for (const slot of slots) {
    const dataStr = slot.data.toISOString().slice(0, 10);

    const utente = utenti.find((u) => u.id === slot.utenteId);

    // Pool completo: commessa + skill + disponibili + turno capiente + preferenza turno
    const tuttiCandidati = operatori.filter((op) => {
      if (setIndisponibili.has(`${op.id}-${dataStr}`)) return false;

      if (utente?.commessaId && op.commesse.length > 0) {
        if (!op.commesse.some((c) => c.commessaId === utente.commessaId)) return false;
      }

      // Vincolo turno part-time: esclude se operatore ha preferenza diversa dallo slot
      if (op.preferenzaTurno && op.preferenzaTurno !== slot.turno) return false;

      if (slot.vincoloSesso && op.sesso !== slot.vincoloSesso) return false;
      if (slot.vincoloNazionalita && op.nazionalita !== slot.vincoloNazionalita) return false;

      const skillOp = new Set(op.skills.map((s) => s.skillId));
      if (!slot.skillRichieste.every((s) => skillOp.has(s))) return false;

      if ((oreSettimana.get(op.id) ?? 0) >= op.oreSettimanali) return false;

      const chiave = getChiave(op.id, slot.data, slot.turno);
      const occupati = minutiUsati.get(chiave) ?? 0;
      if (occupati + slot.durata > MINUTI_PER_TURNO[slot.turno]) return false;

      return true;
    });

    // Preferenza: usa operatori preferiti dell'utente se almeno uno disponibile
    const preferiti = new Set(utente?.operatoriPreferiti?.map((p) => p.operatoreId) ?? []);
    const candidatiPreferiti = preferiti.size > 0
      ? tuttiCandidati.filter((op) => preferiti.has(op.id))
      : [];
    const usaPreferiti = candidatiPreferiti.length > 0;
    const candidati = usaPreferiti ? candidatiPreferiti : tuttiCandidati;

    if (candidati.length === 0) {
      // Slot non coperto — salvato in DB con operatoreId null per gestione manuale
      scoperti.push(slot);
      continue;
    }

    if (usaPreferiti) {
      // Rotazione tra preferiti: chi ha lavorato meno per QUESTO utente va prima
      candidati.sort((a, b) => {
        const countA = contaPerUtente.get(`${slot.utenteId}-${a.id}`) ?? 0;
        const countB = contaPerUtente.get(`${slot.utenteId}-${b.id}`) ?? 0;
        if (countA !== countB) return countA - countB;
        return (oreSettimana.get(a.id) ?? 0) - (oreSettimana.get(b.id) ?? 0);
      });
    } else {
      // Fallback pool: bilanciamento ore globale
      candidati.sort((a, b) => (oreSettimana.get(a.id) ?? 0) - (oreSettimana.get(b.id) ?? 0));
    }

    const scelto = candidati[0];
    const chiave = getChiave(scelto.id, slot.data, slot.turno);

    minutiUsati.set(chiave, (minutiUsati.get(chiave) ?? 0) + slot.durata);
    oreSettimana.set(scelto.id, (oreSettimana.get(scelto.id) ?? 0) + slot.durata / 60);
    contaPerUtente.set(
      `${slot.utenteId}-${scelto.id}`,
      (contaPerUtente.get(`${slot.utenteId}-${scelto.id}`) ?? 0) + 1,
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
