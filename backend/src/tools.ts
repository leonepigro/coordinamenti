import { generaTurni, salvaAssegnazioni } from "./scheduler";
import { ottimizzaGiornata } from "./router";
import { inviaRiepilogoGiornaliero, inviaAggiornamentoPianificazione } from "./notifiche";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "genera_turni",
      description:
        "Genera e salva automaticamente i turni per un periodo, assegnando operatori agli utenti rispettando skill, equipe, disponibilità e ore contrattuali.",
      parameters: {
        type: "object",
        properties: {
          dataInizio: { type: "string", description: "Data inizio YYYY-MM-DD" },
          dataFine: { type: "string", description: "Data fine YYYY-MM-DD" },
        },
        required: ["dataInizio", "dataFine"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ottimizza_percorso",
      description:
        "Ottimizza l'ordine degli interventi giornalieri di un operatore per minimizzare i km percorsi.",
      parameters: {
        type: "object",
        properties: {
          operatoreId: { type: "number", description: "ID operatore" },
          data: { type: "string", description: "Data YYYY-MM-DD" },
        },
        required: ["operatoreId", "data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_operatori",
      description:
        "Restituisce la lista degli operatori attivi con qualifica e skill.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_utenti",
      description:
        "Restituisce la lista degli utenti attivi con piano assistenziale e ore settimanali.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_interventi_giorno",
      description:
        "Restituisce gli interventi pianificati per una data, opzionalmente filtrati per operatore.",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data YYYY-MM-DD" },
          operatoreId: {
            type: "number",
            description: "ID operatore (opzionale)",
          },
        },
        required: ["data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "trova_sostituto",
      description:
        "Trova i migliori sostituti per un operatore assente in una data e turno, rispettando le skill richieste.",
      parameters: {
        type: "object",
        properties: {
          operatoreAssenteId: {
            type: "number",
            description: "ID operatore assente",
          },
          data: { type: "string", description: "Data YYYY-MM-DD" },
          turno: { type: "string", enum: ["mattina", "pomeriggio"] },
        },
        required: ["operatoreAssenteId", "data", "turno"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_skill",
      description: "Restituisce tutte le skill disponibili nel sistema.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_tipi_servizio",
      description:
        "Restituisce tutti i tipi di servizio con durata e skill richieste.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_equipe",
      description:
        "Restituisce le equipe configurate con i loro membri e l'utente associato.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_piani_assistenziali",
      description:
        "Restituisce i piani assistenziali attivi, opzionalmente filtrati per utente.",
      parameters: {
        type: "object",
        properties: {
          utenteId: { type: "number", description: "ID utente (opzionale)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_indisponibilita",
      description:
        "Restituisce le indisponibilità degli operatori, opzionalmente filtrate per operatore.",
      parameters: {
        type: "object",
        properties: {
          operatoreId: {
            type: "number",
            description: "ID operatore (opzionale)",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_statistiche",
      description:
        "Restituisce statistiche generali: numero operatori, utenti, interventi della settimana corrente, ore pianificate.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_qualifiche",
      description: "Restituisce tutte le qualifiche professionali disponibili nel sistema.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "aggiungi_qualifica",
      description: "Aggiunge una nuova qualifica professionale al sistema (es. Fisioterapista, Infermiere).",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome della qualifica da aggiungere" },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "invia_email_riepilogo",
      description:
        "Invia via email il riepilogo degli interventi del giorno agli operatori che hanno un indirizzo email e almeno un intervento pianificato.",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data YYYY-MM-DD per cui inviare il riepilogo (default: oggi)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "invia_email_aggiornamento",
      description:
        "Invia via email gli aggiornamenti della pianificazione agli operatori per un intervallo di date. Utile dopo aver generato o modificato i turni.",
      parameters: {
        type: "object",
        properties: {
          dataInizio: { type: "string", description: "Data inizio YYYY-MM-DD" },
          dataFine: { type: "string", description: "Data fine YYYY-MM-DD" },
        },
        required: ["dataInizio", "dataFine"],
      },
    },
  },
];

export async function eseguiTool(nome: string, args: any): Promise<string> {
  switch (nome) {
    case "genera_turni": {
      const { assegnate, scoperti } = await generaTurni(
        new Date(args.dataInizio),
        new Date(args.dataFine),
      );
      await salvaAssegnazioni(assegnate, scoperti);
      return JSON.stringify({
        assegnati: assegnate.length,
        scoperti: scoperti.length,
        messaggio: `Generati ${assegnate.length} interventi${scoperti.length > 0 ? `, ${scoperti.length} scoperti` : ""}`,
      });
    }

    case "ottimizza_percorso": {
      const percorso = await ottimizzaGiornata(
        args.operatoreId,
        new Date(args.data),
      );
      return JSON.stringify({ percorso });
    }

    case "get_operatori": {
      const operatori = await prisma.operatore.findMany({
        where: { attivo: true },
        include: { skills: { include: { skill: true } } },
        orderBy: { nome: "asc" },
      });
      return JSON.stringify(
        operatori.map((o) => ({
          id: o.id,
          nome: o.nome,
          qualifica: o.qualifica,
          oreSettimanali: o.oreSettimanali,
          preferenzaTurno: o.preferenzaTurno,
          telefono: o.telefono,
          skills: o.skills.map((s) => s.skill.nome),
        })),
      );
    }

    case "get_utenti": {
      const utenti = await prisma.utente.findMany({
        where: { attivo: true },
        include: {
          piani: {
            where: { attivo: true },
            include: { tipoServizio: true },
          },
        },
        orderBy: { nome: "asc" },
      });
      return JSON.stringify(
        utenti.map((u) => ({
          id: u.id,
          nome: u.nome,
          indirizzo: u.indirizzo,
          oreSettimanali: u.oreSettimanali,
          note: u.note,
          piani: u.piani.map((p) => ({
            servizio: p.tipoServizio.nome,
            giorni: p.giorniSettimana,
            ora: p.oraInizio,
            durata: p.tipoServizio.durata,
          })),
        })),
      );
    }

    case "get_interventi_giorno": {
      const inizio = new Date(args.data);
      inizio.setHours(0, 0, 0, 0);
      const fine = new Date(args.data);
      fine.setHours(23, 59, 59, 999);

      const where: any = { data: { gte: inizio, lte: fine } };
      if (args.operatoreId) where.operatoreId = args.operatoreId;

      const interventi = await prisma.intervento.findMany({
        where,
        include: { operatore: true, utente: true, tipoServizio: true },
        orderBy: [{ turno: "asc" }, { ordineGiornata: "asc" }],
      });

      return JSON.stringify(
        interventi.map((i) => ({
          id: i.id,
          utente: i.utente.nome,
          operatore: i.operatore?.nome ?? "non assegnato",
          servizio: i.tipoServizio?.nome ?? "—",
          turno: i.turno,
          durata: i.durata,
          completato: i.completato,
        })),
      );
    }

    case "trova_sostituto": {
      const assente = await prisma.operatore.findUnique({
        where: { id: args.operatoreAssenteId },
        include: { skills: true },
      });
      if (!assente) return JSON.stringify({ errore: "Operatore non trovato" });

      const inizio = new Date(args.data);
      inizio.setHours(0, 0, 0, 0);
      const fine = new Date(args.data);
      fine.setHours(23, 59, 59, 999);

      const interventiAssente = await prisma.intervento.findMany({
        where: {
          operatoreId: args.operatoreAssenteId,
          turno: args.turno,
          data: { gte: inizio, lte: fine },
        },
        include: { tipoServizio: { include: { skills: true } }, utente: true },
      });

      const skillNecessarie = new Set(
        interventiAssente.flatMap(
          (i) => i.tipoServizio?.skills.map((s) => s.skillId) ?? [],
        ),
      );

      const indisponibili = await prisma.indisponibilita.findMany({
        where: { data: { gte: inizio, lte: fine } },
      });
      const idIndisponibili = new Set(indisponibili.map((i) => i.operatoreId));

      const candidati = await prisma.operatore.findMany({
        where: { attivo: true, id: { not: assente.id } },
        include: { skills: true },
      });

      const idonei = candidati
        .filter((c) => !idIndisponibili.has(c.id))
        .filter((c) => {
          const skillC = new Set(c.skills.map((s) => s.skillId));
          return [...skillNecessarie].every((s) => skillC.has(s));
        })
        .map((c) => ({
          id: c.id,
          nome: c.nome,
          qualifica: c.qualifica,
          preferenzaTurno: c.preferenzaTurno,
          corrispondeTurno: c.preferenzaTurno === args.turno,
        }))
        .sort(
          (a, b) => (b.corrispondeTurno ? 1 : 0) - (a.corrispondeTurno ? 1 : 0),
        );

      return JSON.stringify({
        assenteNome: assente.nome,
        interventiDaCoprire: interventiAssente.map((i) => ({
          utente: i.utente.nome,
          servizio: i.tipoServizio?.nome,
          durata: i.durata,
        })),
        candidati: idonei.slice(0, 3),
      });
    }

    case "get_skill": {
      const skill = await prisma.skill.findMany({ orderBy: { nome: "asc" } });
      return JSON.stringify(skill);
    }

    case "get_tipi_servizio": {
      const tipi = await prisma.tipoServizio.findMany({
        include: { skills: { include: { skill: true } } },
        orderBy: { nome: "asc" },
      });
      return JSON.stringify(
        tipi.map((t) => ({
          id: t.id,
          nome: t.nome,
          durata: t.durata,
          descrizione: t.descrizione,
          skillRichieste: t.skills.map((s) => s.skill.nome),
        })),
      );
    }

    case "get_equipe": {
      const equipe = await prisma.equipe.findMany({
        include: {
          utente: true,
          membri: { include: { operatore: true } },
        },
      });
      return JSON.stringify(
        equipe.map((e) => ({
          id: e.id,
          nome: e.nome,
          utente: e.utente.nome,
          membri: e.membri.map((m) => ({
            operatore: m.operatore.nome,
            qualifica: m.operatore.qualifica,
            ruolo: m.ruolo,
          })),
        })),
      );
    }

    case "get_piani_assistenziali": {
      const where: any = { attivo: true };
      if (args.utenteId) where.utenteId = args.utenteId;
      const piani = await prisma.pianoAssistenziale.findMany({
        where,
        include: { utente: true, tipoServizio: true },
        orderBy: { id: "asc" },
      });
      return JSON.stringify(
        piani.map((p) => ({
          id: p.id,
          utente: p.utente.nome,
          servizio: p.tipoServizio.nome,
          giorni: p.giorniSettimana,
          ora: p.oraInizio,
          durata: p.tipoServizio.durata,
        })),
      );
    }

    case "get_indisponibilita": {
      const where: any = {};
      if (args.operatoreId) where.operatoreId = args.operatoreId;
      const lista = await prisma.indisponibilita.findMany({
        where,
        include: { operatore: true },
        orderBy: { data: "asc" },
      });
      return JSON.stringify(
        lista.map((i) => ({
          id: i.id,
          operatore: i.operatore.nome,
          data: i.data,
          motivo: i.motivo,
        })),
      );
    }

    case "get_statistiche": {
      const oggi = new Date();
      const lunedi = new Date(oggi);
      lunedi.setDate(oggi.getDate() - oggi.getDay() + 1);
      lunedi.setHours(0, 0, 0, 0);
      const domenica = new Date(lunedi);
      domenica.setDate(lunedi.getDate() + 6);
      domenica.setHours(23, 59, 59, 999);

      const [nOperatori, nUtenti, nInterventi, nIndisponibilita] =
        await Promise.all([
          prisma.operatore.count({ where: { attivo: true } }),
          prisma.utente.count({ where: { attivo: true } }),
          prisma.intervento.count({
            where: { data: { gte: lunedi, lte: domenica } },
          }),
          prisma.indisponibilita.count({ where: { data: { gte: oggi } } }),
        ]);

      const interventiSettimana = await prisma.intervento.findMany({
        where: { data: { gte: lunedi, lte: domenica } },
        select: { durata: true },
      });
      const orePianificate = interventiSettimana.reduce(
        (tot, i) => tot + i.durata / 60,
        0,
      );

      return JSON.stringify({
        operatoriAttivi: nOperatori,
        utentiInCarico: nUtenti,
        interventiSettimana: nInterventi,
        orePianificate: orePianificate.toFixed(1),
        indisponibilitaFuture: nIndisponibilita,
      });
    }

    case "get_qualifiche": {
      const qualifiche = await prisma.qualifica.findMany({ orderBy: { nome: "asc" } });
      return JSON.stringify(qualifiche);
    }

    case "aggiungi_qualifica": {
      if (!args.nome?.trim()) return JSON.stringify({ errore: "Nome obbligatorio" });
      try {
        const q = await prisma.qualifica.create({ data: { nome: args.nome.trim() } });
        return JSON.stringify({ ok: true, qualifica: q });
      } catch {
        return JSON.stringify({ errore: "Qualifica già esistente" });
      }
    }

    case "invia_email_riepilogo": {
      const data = args.data ? new Date(args.data) : new Date();
      const inviati = await inviaRiepilogoGiornaliero(data);
      return JSON.stringify({
        ok: true,
        inviati,
        messaggio: inviati === 0
          ? "Nessuna email inviata (nessun operatore con email e interventi, oppure RESEND non configurato)"
          : `${inviati} email inviate con successo`,
      });
    }

    case "invia_email_aggiornamento": {
      const inviati = await inviaAggiornamentoPianificazione(
        new Date(args.dataInizio),
        new Date(args.dataFine),
      );
      return JSON.stringify({
        ok: true,
        inviati,
        messaggio: inviati === 0
          ? "Nessuna email inviata"
          : `${inviati} email inviate per il periodo`,
      });
    }

    default:
      return JSON.stringify({ errore: `Tool sconosciuto: ${nome}` });
  }
}
