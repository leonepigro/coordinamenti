import { generaTurni, salvaAssegnazioni } from "./scheduler";
import { ottimizzaGiornata } from "./router";
import { inviaRiepilogoGiornaliero, inviaAggiornamentoPianificazione } from "./notifiche";
import { prisma } from "./db";

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "genera_turni",
      description:
        "Genera e salva automaticamente i turni per un periodo, assegnando operatori agli utenti rispettando skill, operatori preferiti, disponibilità, preferenza turno (part-time) e ore contrattuali. I preferiti girano a rotazione.",
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
        "Trova i migliori sostituti per un operatore assente. IMPORTANTE: devi prima chiamare get_operatori per ottenere l'ID numerico intero dell'operatore (campo 'id'). Non usare mai stringhe come 'nessuno' o nomi come valore di operatoreAssenteId. Il turno è opzionale: se non specificato cerca sostituti per entrambi i turni.",
      parameters: {
        type: "object",
        properties: {
          operatoreAssenteId: {
            type: "number",
            description: "ID numerico intero dell'operatore assente, ricavato dal campo 'id' di get_operatori",
          },
          data: { type: "string", description: "Data YYYY-MM-DD" },
          turno: { type: "string", enum: ["mattina", "pomeriggio"], description: "Turno specifico (opzionale)" },
        },
        required: ["operatoreAssenteId", "data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cerca_operatore",
      description: "Cerca un OPERATORE (chi eroga il servizio) per nome e restituisce il suo ID. Usare solo per operatori/caregivers, MAI per utenti/pazienti/assistiti.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome o cognome parziale dell'operatore da cercare" },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cerca_utente",
      description: "Cerca un UTENTE (paziente/assistito che riceve il servizio) per nome e restituisce il suo ID. Usare quando il coordinatore menziona un utente/paziente per nome, prima di get_piani_assistenziali o altri tool che richiedono utenteId.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome o cognome parziale dell'utente/paziente da cercare" },
        },
        required: ["nome"],
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
        "Restituisce le equipe configurate (gruppi di operatori) con nome e membri.",
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

export async function eseguiTool(nome: string, args: Record<string, any> = {}): Promise<string> {
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
          etichetta: `OP${o.id}`,
          qualifica: o.qualifica,
          oreSettimanali: o.oreSettimanali,
          preferenzaTurno: o.preferenzaTurno ?? "tutti",
          indirizzo: o.indirizzo ?? null,
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
            include: { tipoServizio: true, skills: { include: { skill: true } } },
          },
          operatoriPreferiti: { include: { operatore: { select: { id: true, nome: true, qualifica: true } } } },
        },
        orderBy: { nome: "asc" },
      });
      return JSON.stringify(
        utenti.map((u) => ({
          id: u.id,
          etichetta: `U${u.id}`,
          oreSettimanali: u.oreSettimanali,
          indirizzo: u.indirizzo ?? null,
          ...(u.note ? { note: u.note } : {}),
          preferiti: u.operatoriPreferiti.map((p) => `OP${p.operatore.id}`),
          piani: u.piani.map((p) => ({
            servizio: p.tipoServizio.nome,
            giorni: p.giorniSettimana,
            durata: p.durata ?? p.tipoServizio.durata,
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
          utenteId: i.utente.id,
          utente: `U${i.utente.id}`,
          operatoreId: i.operatore?.id ?? null,
          operatore: i.operatore ? `OP${i.operatore.id}` : "non assegnato",
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

      const whereInterventi: any = {
        operatoreId: args.operatoreAssenteId,
        data: { gte: inizio, lte: fine },
      };
      if (args.turno) whereInterventi.turno = args.turno;

      const interventiAssente = await prisma.intervento.findMany({
        where: whereInterventi,
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

      const valutati = candidati.map((c) => {
        const disponibile = !idIndisponibili.has(c.id);
        const skillC = new Set(c.skills.map((s) => s.skillId));
        const skillOk = skillNecessarie.size === 0 || [...skillNecessarie].every((s) => skillC.has(s));
        const turnoOk = !args.turno || !c.preferenzaTurno || c.preferenzaTurno === args.turno;
        const punteggio = (disponibile ? 2 : 0) + (skillOk ? 1 : 0);
        return {
          etichetta: `OP${c.id}`,
          qualifica: c.qualifica,
          disponibile,
          skillOk,
          turnoOk,
          punteggio,
        };
      }).sort((a, b) => b.punteggio - a.punteggio);

      return JSON.stringify({
        assente: `OP${assente.id}`,
        interventiDaCoprire: interventiAssente.map((i) => ({
          utente: `U${i.utente.id}`,
          servizio: i.tipoServizio?.nome,
          durata: i.durata,
        })),
        candidati: valutati,
      });
    }

    case "cerca_operatore": {
      const risultati = await prisma.operatore.findMany({
        where: { attivo: true, nome: { contains: args.nome, mode: "insensitive" } },
        select: { id: true, qualifica: true },
      });
      if (risultati.length === 0) return JSON.stringify({ errore: `Nessun operatore trovato con nome "${args.nome}"` });
      return JSON.stringify(risultati.map((o) => ({ id: o.id, etichetta: `OP${o.id}`, qualifica: o.qualifica })));
    }

    case "cerca_utente": {
      const risultati = await prisma.utente.findMany({
        where: { attivo: true, nome: { contains: args.nome, mode: "insensitive" } },
        select: { id: true, indirizzo: true },
      });
      if (risultati.length === 0) return JSON.stringify({ errore: `Nessun utente trovato con nome "${args.nome}"` });
      return JSON.stringify(risultati.map((u) => ({ id: u.id, etichetta: `U${u.id}` })));
    }

    case "get_skill": {
      const skill = await prisma.skill.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });
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
          membri: { include: { operatore: true } },
        },
      });
      return JSON.stringify(
        equipe.map((e) => ({
          id: e.id,
          nome: e.nome,
          membri: e.membri.map((m) => ({
            operatoreId: m.operatore.id,
            operatore: `OP${m.operatore.id}`,
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
        include: { utente: true, tipoServizio: true, skills: { include: { skill: true } } },
        orderBy: { id: "asc" },
      });
      return JSON.stringify(
        piani.map((p) => ({
          id: p.id,
          utenteId: p.utente.id,
          utente: `U${p.utente.id}`,
          servizio: p.tipoServizio.nome,
          giorni: p.giorniSettimana,
          ora: p.oraInizio,
          durata: p.durata ?? p.tipoServizio.durata,
          vincoloSesso: p.vincoloSesso,
          vincoloNazionalita: p.vincoloNazionalita,
          skillPersonalizzate: p.skills.length > 0 ? p.skills.map((s) => s.skill.nome) : null,
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
          operatoreId: i.operatore.id,
          operatore: `OP${i.operatore.id}`,
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
