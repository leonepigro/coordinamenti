import express from "express";
import cors from "cors";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(express.json());

const ollama = new OpenAI({
  baseURL: "http://127.0.0.1:11434/v1",
  apiKey: "ollama",
});

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const JWT_SECRET = process.env.JWT_SECRET ?? "fallback_secret";
const PAOLA_HASH = bcrypt.hashSync(
  process.env.PAOLA_PASSWORD ?? "coordinamenti2026",
  10,
);
import { generaTurni, salvaAssegnazioni } from "./scheduler";

app.post("/api/scheduling/genera", async (req, res) => {
  try {
    const { dataInizio, dataFine } = req.body;
    const inizio = new Date(dataInizio);
    const fine = new Date(dataFine);

    const assegnazioni = await generaTurni(inizio, fine);
    await salvaAssegnazioni(assegnazioni);

    res.json({
      ok: true,
      totale: assegnazioni.length,
      assegnazioni,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

import { ottimizzaGiornata, geocodifica } from "./router";

app.post("/api/routing/ottimizza", async (req, res) => {
  try {
    const { operatoreId, data } = req.body;
    const risultato = await ottimizzaGiornata(operatoreId, new Date(data));
    res.json({ ok: true, ...risultato });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Geocodifica un indirizzo e aggiorna le coordinate nel DB
app.post("/api/geocodifica/operatore/:id", async (req, res) => {
  try {
    const op = await prisma.operatore.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!op) return res.status(404).json({ ok: false });
    const coords = await geocodifica(op.indirizzo);
    if (!coords)
      return res
        .status(400)
        .json({ ok: false, error: "Indirizzo non trovato" });
    await prisma.operatore.update({
      where: { id: op.id },
      data: { lat: coords.lat, lon: coords.lon },
    });
    res.json({ ok: true, ...coords });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Operatori
app.get("/api/operatori", async (req, res) => {
  const operatori = await prisma.operatore.findMany({
    where: { attivo: true },
    include: { skills: { include: { skill: true } } },
    orderBy: { nome: "asc" },
  });
  res.json(operatori);
});

// Utenti
app.get("/api/utenti", async (req, res) => {
  const utenti = await prisma.utente.findMany({
    where: { attivo: true },
    include: {
      piani: {
        where: { attivo: true },
        include: { tipoServizio: true },
      },
      equipe: {
        include: {
          membri: {
            include: { operatore: true },
          },
        },
      },
    },
    orderBy: { nome: "asc" },
  });
  res.json(utenti);
});

// Interventi per data o settimana
app.get("/api/interventi", async (req, res) => {
  const { data, dataInizio, dataFine } = req.query as any;

  let where: any = {};

  if (data) {
    const d = new Date(data);
    const inizio = new Date(d);
    inizio.setHours(0, 0, 0, 0);
    const fine = new Date(d);
    fine.setHours(23, 59, 59, 999);
    where.data = { gte: inizio, lte: fine };
  } else if (dataInizio && dataFine) {
    const inizio = new Date(dataInizio);
    inizio.setHours(0, 0, 0, 0);
    const fine = new Date(dataFine);
    fine.setHours(23, 59, 59, 999);
    where.data = { gte: inizio, lte: fine };
  }

  const interventi = await prisma.intervento.findMany({
    where,
    include: {
      operatore: true,
      utente: true,
      tipoServizio: true,
    },
    orderBy: [{ data: "asc" }, { turno: "asc" }, { ordineGiornata: "asc" }],
  });

  res.json(interventi);
});
// --- SKILL ---
app.get("/api/skill", async (req, res) => {
  const skill = await prisma.skill.findMany({ orderBy: { nome: "asc" } });
  res.json(skill);
});

app.post("/api/skill", async (req, res) => {
  const { nome, descrizione } = req.body;
  const skill = await prisma.skill.create({ data: { nome, descrizione } });
  res.json(skill);
});

app.delete("/api/skill/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Rimuovi la skill dagli operatori
    await prisma.operatoreSkill.deleteMany({ where: { skillId: id } });
    // Rimuovi la skill dai tipi servizio
    await prisma.servizioSkill.deleteMany({ where: { skillId: id } });
    // Poi elimina la skill
    await prisma.skill.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- OPERATORI ---
app.post("/api/operatori", async (req, res) => {
  const {
    nome,
    qualifica,
    oreSettimanali,
    indirizzo,
    preferenzaTurno,
    telefono,
    mezzoTrasporto,
    skillIds,
    lat,
    lon,
  } = req.body;
  const coords = lat && lon ? { lat, lon } : await geocodifica(indirizzo);
  const operatore = await prisma.operatore.create({
    data: {
      nome,
      qualifica,
      oreSettimanali,
      indirizzo,
      preferenzaTurno,
      telefono,
      mezzoTrasporto,
      lat: coords?.lat,
      lon: coords?.lon,
      skills: { create: skillIds.map((id: number) => ({ skillId: id })) },
    },
    include: { skills: { include: { skill: true } } },
  });
  res.json(operatore);
});

app.put("/api/operatori/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    nome,
    qualifica,
    oreSettimanali,
    indirizzo,
    preferenzaTurno,
    telefono,
    mezzoTrasporto,
    skillIds,
    lat,
    lon,
  } = req.body;
  const coords = lat && lon ? { lat, lon } : await geocodifica(indirizzo);
  await prisma.operatoreSkill.deleteMany({ where: { operatoreId: id } });
  const operatore = await prisma.operatore.update({
    where: { id },
    data: {
      nome,
      qualifica,
      oreSettimanali,
      indirizzo,
      preferenzaTurno,
      telefono,
      mezzoTrasporto,
      lat: coords?.lat,
      lon: coords?.lon,
      skills: { create: skillIds.map((id: number) => ({ skillId: id })) },
    },
    include: { skills: { include: { skill: true } } },
  });
  res.json(operatore);
});

app.delete("/api/operatori/:id", async (req, res) => {
  await prisma.operatore.update({
    where: { id: parseInt(req.params.id) },
    data: { attivo: false },
  });
  res.json({ ok: true });
});

// --- UTENTI ---

app.post("/api/utenti", async (req, res) => {
  const { nome, indirizzo, oreSettimanali, note, piani, lat, lon } = req.body;
  const coords = lat && lon ? { lat, lon } : await geocodifica(indirizzo);
  const utente = await prisma.utente.create({
    data: {
      nome,
      indirizzo,
      oreSettimanali,
      note,
      lat: coords?.lat,
      lon: coords?.lon,
      piani: {
        create: piani.map((p: any) => ({
          tipoServizioId: p.tipoServizioId,
          giorniSettimana: p.giorniSettimana,
          oraInizio: p.oraInizio,
        })),
      },
    },
    include: { piani: { include: { tipoServizio: true } } },
  });
  res.json(utente);
});

app.put("/api/utenti/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, indirizzo, oreSettimanali, note, piani, lat, lon } = req.body;
  const coords = lat && lon ? { lat, lon } : await geocodifica(indirizzo);
  await prisma.pianoAssistenziale.deleteMany({ where: { utenteId: id } });
  const utente = await prisma.utente.update({
    where: { id },
    data: {
      nome,
      indirizzo,
      oreSettimanali,
      note,
      lat: coords?.lat,
      lon: coords?.lon,
      piani: {
        create: piani.map((p: any) => ({
          tipoServizioId: p.tipoServizioId,
          giorniSettimana: p.giorniSettimana,
          oraInizio: p.oraInizio,
        })),
      },
    },
    include: { piani: { include: { tipoServizio: true } } },
  });
  res.json(utente);
});

app.delete("/api/utenti/:id", async (req, res) => {
  await prisma.utente.update({
    where: { id: parseInt(req.params.id) },
    data: { attivo: false },
  });
  res.json({ ok: true });
});

// --- EQUIPE ---
app.get("/api/equipe", async (req, res) => {
  const equipe = await prisma.equipe.findMany({
    include: {
      utente: true,
      membri: { include: { operatore: true } },
    },
  });
  res.json(equipe);
});

app.post("/api/equipe", async (req, res) => {
  const { utenteId, nome, membri } = req.body;
  const equipe = await prisma.equipe.create({
    data: {
      utenteId,
      nome,
      membri: {
        create: membri.map((m: any) => ({
          operatoreId: m.operatoreId,
          ruolo: m.ruolo,
        })),
      },
    },
    include: { membri: { include: { operatore: true } }, utente: true },
  });
  res.json(equipe);
});

app.put("/api/equipe/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, membri } = req.body;
  await prisma.equipeMembro.deleteMany({ where: { equipeId: id } });
  const equipe = await prisma.equipe.update({
    where: { id },
    data: {
      nome,
      membri: {
        create: membri.map((m: any) => ({
          operatoreId: m.operatoreId,
          ruolo: m.ruolo,
        })),
      },
    },
    include: { membri: { include: { operatore: true } }, utente: true },
  });
  res.json(equipe);
});

app.delete("/api/equipe/:id", async (req, res) => {
  await prisma.equipeMembro.deleteMany({
    where: { equipeId: parseInt(req.params.id) },
  });
  await prisma.equipe.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

app.get("/api/tipi-servizio", async (req, res) => {
  const tipi = await prisma.tipoServizio.findMany({ orderBy: { nome: "asc" } });
  res.json(tipi);
});

// --- INDISPONIBILITÀ ---
app.get("/api/indisponibilita", async (req, res) => {
  const { operatoreId } = req.query as any;
  const where: any = {};
  if (operatoreId) where.operatoreId = parseInt(operatoreId);
  const lista = await prisma.indisponibilita.findMany({
    where,
    include: { operatore: true },
    orderBy: { data: "asc" },
  });
  res.json(lista);
});

app.post("/api/indisponibilita", async (req, res) => {
  const { operatoreId, data, motivo } = req.body;
  const ind = await prisma.indisponibilita.create({
    data: { operatoreId, data: new Date(data), motivo },
    include: { operatore: true },
  });
  res.json(ind);
});

app.delete("/api/indisponibilita/:id", async (req, res) => {
  await prisma.indisponibilita.delete({
    where: { id: parseInt(req.params.id) },
  });
  res.json({ ok: true });
});
app.post("/api/indisponibilita/ricalcola", async (req, res) => {
  const { operatoreId, data } = req.body;

  const inizio = new Date(data);
  inizio.setHours(0, 0, 0, 0);
  const fine = new Date(data);
  fine.setHours(23, 59, 59, 999);

  // Trova gli interventi dell'operatore assente in quella data
  const interventi = await prisma.intervento.findMany({
    where: {
      operatoreId,
      data: { gte: inizio, lte: fine },
      completato: false,
    },
    include: {
      tipoServizio: { include: { skills: true } },
      utente: true,
    },
  });

  if (interventi.length === 0) {
    return res.json({
      ok: true,
      messaggio: "Nessun intervento da riassegnare",
      riassegnati: [],
    });
  }

  // Trova indisponibili quel giorno
  const indisponibili = await prisma.indisponibilita.findMany({
    where: { data: { gte: inizio, lte: fine } },
  });
  const idIndisponibili = new Set(indisponibili.map((i) => i.operatoreId));

  // Carica tutti gli operatori con skill
  const operatori = await prisma.operatore.findMany({
    where: { attivo: true, id: { not: operatoreId } },
    include: { skills: true },
  });

  const GERARCHIA: Record<string, number> = {
    Infermiere: 3,
    Fisioterapista: 2,
    OSS: 1,
    ASA: 0,
  };

  // Traccia minuti già usati per non sovraccaricare
  const minutiUsati = new Map<string, number>();

  const riassegnati = [];
  const nonCoperti = [];

  for (const intervento of interventi) {
    const skillNecessarie = new Set(
      intervento.tipoServizio?.skills.map((s) => s.skillId) ?? [],
    );

    const candidati = operatori
      .filter((op) => !idIndisponibili.has(op.id))
      .filter((op) => {
        const skillOp = new Set(op.skills.map((s) => s.skillId));
        return [...skillNecessarie].every((s) => skillOp.has(s));
      })
      .filter((op) => {
        const chiave = `${op.id}-${intervento.turno}`;
        const usati = minutiUsati.get(chiave) ?? 0;
        return usati + intervento.durata <= 390;
      })
      .sort(
        (a, b) => (GERARCHIA[a.qualifica] ?? 0) - (GERARCHIA[b.qualifica] ?? 0),
      );

    if (candidati.length === 0) {
      nonCoperti.push({
        interventoId: intervento.id,
        utente: intervento.utente.nome,
        servizio: intervento.tipoServizio?.nome,
      });
      continue;
    }

    // Preferisci operatori dell'equipe dell'utente
    const equipe = await prisma.equipe.findFirst({
      where: { utenteId: intervento.utenteId },
      include: { membri: true },
    });
    const idEquipe = equipe?.membri.map((m) => m.operatoreId) ?? [];

    candidati.sort((a, b) => {
      const aInEquipe = idEquipe.includes(a.id) ? 0 : 1;
      const bInEquipe = idEquipe.includes(b.id) ? 0 : 1;
      return aInEquipe - bInEquipe;
    });

    const scelto = candidati[0];
    const chiave = `${scelto.id}-${intervento.turno}`;
    minutiUsati.set(chiave, (minutiUsati.get(chiave) ?? 0) + intervento.durata);

    await prisma.intervento.update({
      where: { id: intervento.id },
      data: { operatoreId: scelto.id },
    });

    riassegnati.push({
      interventoId: intervento.id,
      utente: intervento.utente.nome,
      servizio: intervento.tipoServizio?.nome,
      nuovoOperatore: scelto.nome,
    });
  }

  res.json({
    ok: true,
    riassegnati,
    nonCoperti,
    messaggio: `${riassegnati.length} interventi riassegnati, ${nonCoperti.length} non coperti`,
  });
});

app.put("/api/skill/:id", async (req, res) => {
  const { nome, descrizione } = req.body;
  const skill = await prisma.skill.update({
    where: { id: parseInt(req.params.id) },
    data: { nome, descrizione },
  });
  res.json(skill);
});

app.delete("/api/interventi", async (req, res) => {
  const { dataInizio, dataFine } = req.query as any;

  const where: any = { completato: false };

  if (dataInizio && dataFine) {
    const inizio = new Date(dataInizio);
    inizio.setHours(0, 0, 0, 0);
    const fine = new Date(dataFine);
    fine.setHours(23, 59, 59, 999);
    where.data = { gte: inizio, lte: fine };
  }
  console.debug("cancellazione interventi", where);
  const { count } = await prisma.intervento.deleteMany({ where });
  res.json({ ok: true, eliminati: count });
});
// --- PIANI ASSISTENZIALI ---
app.get("/api/piani", async (req, res) => {
  const { utenteId } = req.query as any;
  const piani = await prisma.pianoAssistenziale.findMany({
    where: utenteId
      ? { utenteId: parseInt(utenteId), attivo: true }
      : { attivo: true },
    include: { tipoServizio: true, utente: true },
    orderBy: { id: "asc" },
  });
  res.json(piani);
});

app.post("/api/piani", async (req, res) => {
  const { utenteId, tipoServizioId, giorniSettimana, oraInizio } = req.body;
  const piano = await prisma.pianoAssistenziale.create({
    data: {
      utenteId,
      tipoServizioId: parseInt(tipoServizioId),
      giorniSettimana,
      oraInizio,
    },
    include: { tipoServizio: true, utente: true },
  });
  res.json(piano);
});

app.put("/api/piani/:id", async (req, res) => {
  const { tipoServizioId, giorniSettimana, oraInizio } = req.body;
  const piano = await prisma.pianoAssistenziale.update({
    where: { id: parseInt(req.params.id) },
    data: {
      tipoServizioId: parseInt(tipoServizioId),
      giorniSettimana,
      oraInizio,
    },
    include: { tipoServizio: true, utente: true },
  });
  res.json(piano);
});

app.get("/api/tipi-servizio", async (req, res) => {
  const tipi = await prisma.tipoServizio.findMany({
    orderBy: { nome: "asc" },
    include: { skills: { include: { skill: true } } },
  });
  res.json(tipi);
});

app.delete("/api/piani/:id", async (req, res) => {
  await prisma.pianoAssistenziale.update({
    where: { id: parseInt(req.params.id) },
    data: { attivo: false },
  });
  res.json({ ok: true });
});
// --- TIPI SERVIZIO ---
app.post("/api/tipi-servizio", async (req, res) => {
  const { nome, durata, descrizione, skillIds } = req.body;
  const tipo = await prisma.tipoServizio.create({
    data: {
      nome,
      durata: parseInt(durata),
      descrizione,
      skills: { create: skillIds.map((id: number) => ({ skillId: id })) },
    },
    include: { skills: { include: { skill: true } } },
  });
  res.json(tipo);
});

app.put("/api/tipi-servizio/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, durata, descrizione, skillIds } = req.body;
  await prisma.servizioSkill.deleteMany({ where: { tipoServizioId: id } });
  const tipo = await prisma.tipoServizio.update({
    where: { id },
    data: {
      nome,
      durata: parseInt(durata),
      descrizione,
      skills: { create: skillIds.map((id: number) => ({ skillId: id })) },
    },
    include: { skills: { include: { skill: true } } },
  });
  res.json(tipo);
});
app.delete("/api/tipi-servizio/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Elimina interventi collegati
    await prisma.intervento.deleteMany({ where: { tipoServizioId: id } });
    // Elimina piani assistenziali collegati
    await prisma.pianoAssistenziale.deleteMany({
      where: { tipoServizioId: id },
    });
    // Elimina skill collegate
    await prisma.servizioSkill.deleteMany({ where: { tipoServizioId: id } });
    // Elimina il servizio
    await prisma.tipoServizio.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});
app.get("/api/briefing", async (req, res) => {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const fineOggi = new Date();
  fineOggi.setHours(23, 59, 59, 999);

  const lunedi = new Date(oggi);
  lunedi.setDate(oggi.getDate() - oggi.getDay() + 1);
  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);

  const [
    interventiOggi,
    indisponibiliOggi,
    operatoriAttivi,
    utentiAttivi,
    interventiSettimana,
  ] = await Promise.all([
    prisma.intervento.findMany({
      where: { data: { gte: oggi, lte: fineOggi } },
      include: { operatore: true, utente: true, tipoServizio: true },
    }),
    prisma.indisponibilita.findMany({
      where: { data: { gte: oggi, lte: fineOggi } },
      include: { operatore: true },
    }),
    prisma.operatore.count({ where: { attivo: true } }),
    prisma.utente.count({ where: { attivo: true } }),
    prisma.intervento.count({
      where: { data: { gte: lunedi, lte: domenica } },
    }),
  ]);

  // Utenti senza copertura oggi
  const utentiConIntervento = new Set(interventiOggi.map((i) => i.utenteId));
  const tuttiUtenti = await prisma.utente.findMany({ where: { attivo: true } });
  const utentiSenzaCopertura = tuttiUtenti.filter(
    (u) => !utentiConIntervento.has(u.id),
  );

  // Operatori in sovraccarico questa settimana
  const orePerOperatore = await prisma.intervento.groupBy({
    by: ["operatoreId"],
    where: { data: { gte: lunedi, lte: domenica }, operatoreId: { not: null } },
    _sum: { durata: true },
  });

  const operatori = await prisma.operatore.findMany({
    where: { attivo: true },
  });
  const sovraccarichi = orePerOperatore
    .map((o) => {
      const op = operatori.find((op) => op.id === o.operatoreId);
      if (!op) return null;
      const oreUsate = (o._sum.durata ?? 0) / 60;
      return oreUsate > op.oreSettimanali
        ? {
            nome: op.nome,
            oreUsate: oreUsate.toFixed(1),
            oreMax: op.oreSettimanali,
          }
        : null;
    })
    .filter(Boolean);

  res.json({
    data: oggi.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    interventiOggi: interventiOggi.length,
    indisponibili: indisponibiliOggi.map((i) => ({
      nome: i.operatore.nome,
      motivo: i.motivo,
    })),
    utentiSenzaCopertura: utentiSenzaCopertura.map((u) => u.nome),
    operatoriAttivi,
    utentiAttivi,
    interventiSettimana,
    sovraccarichi,
  });
});

app.post("/api/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const invia = (tipo: string, payload: object) => {
    res.write(`data: ${JSON.stringify({ tipo, ...payload })}\n\n`);
  };

  try {
    const { message, history = [] } = req.body;
    const messages = [...history, { role: "user" as const, content: message }];

    const systemPrompt = `Sei un assistente di Paola, coordinatrice del gruppo Coordina*menti*.
Oggi è ${new Date().toLocaleDateString("it-IT")}.
Rivolgiti sempre a Paola direttamente, usando il suo nome quando appropriato.
Il gruppo si chiama Coordina*menti* — usalo quando ti riferisci all'organizzazione.
Hai accesso a un database completo con questi dati:
- Operatori: qualifica, skill, ore contrattuali, mezzo di trasporto, preferenza turno
- Utenti: piano assistenziale, ore settimanali assegnate, note cliniche
- Interventi: turni generati, completati o da completare
- Equipe: gruppi di operatori assegnati a ogni utente con ruoli
- Piani assistenziali: servizi ricorrenti per utente con giorni e orari fissi
- Tipi servizio: durata e skill richieste per ogni tipo di intervento
- Skill: competenze degli operatori (es. Patente B, Medicazioni avanzate)
- Indisponibilità: assenze presenti e future degli operatori
Usa sempre i tool per rispondere a domande sui dati. Non inventare mai nomi, numeri o situazioni.
Rispondi sempre in italiano, in modo conciso e operativo.`;

    let currentMessages = [...messages];
    let maxSteps = 5;

    invia("stato", { testo: "Sto analizzando la tua richiesta..." });

    while (maxSteps-- > 0) {
      let { res: completion } = await chatWithFallback({
        messages: [
          { role: "system", content: systemPrompt },
          ...currentMessages,
        ],
        tools: toolDefinitions,
      });

      const choice = completion.choices[0];

      if (
        !choice.message.tool_calls ||
        choice.message.tool_calls.length === 0
      ) {
        invia("risposta", { testo: choice.message.content ?? "" });
        break;
      }

      currentMessages.push({
        role: "assistant",
        tool_calls: choice.message.tool_calls,
      });

      for (const toolCall of choice.message.tool_calls) {
        const tc = toolCall as any;
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          continue;
        }

        const TOOL_LABEL: Record<string, string> = {
          genera_turni: "Generando i turni...",
          ottimizza_percorso: "Calcolando il percorso ottimale...",
          trova_sostituto: "Cercando i sostituti disponibili...",
          get_operatori: "Consultando la lista operatori...",
          get_utenti: "Consultando la lista utenti...",
          get_interventi_giorno: "Caricando gli interventi del giorno...",
          get_skill: "Caricando le skill...",
          get_tipi_servizio: "Caricando i tipi di servizio...",
          get_equipe: "Consultando le equipe...",
          get_piani_assistenziali: "Consultando i piani assistenziali...",
          get_indisponibilita: "Verificando le indisponibilità...",
          get_statistiche: "Calcolando le statistiche settimanali...",
        };

        invia("tool", {
          nome: tc.function.name,
          testo:
            TOOL_LABEL[tc.function.name] ?? `Eseguendo ${tc.function.name}...`,
          args,
        });

        const risultato = await eseguiTool(tc.function.name, args);

        currentMessages.push({
          role: "tool" as const,
          tool_call_id: tc.id,
          content: risultato,
        });

        invia("tool_ok", { nome: tc.function.name });
      }
    }

    invia("fine", {});
    res.end();
  } catch (e) {
    console.error(e);
    invia("errore", { testo: "Errore di connessione. Riprova." });
    res.end();
  }
});

// --- IMPORT MASSIVO ---
app.post("/api/import/operatori", async (req, res) => {
  const { righe } = req.body;
  const risultati = { importati: 0, errori: [] as string[] };

  for (const r of righe) {
    try {
      if (!r.nome || !r.qualifica) {
        risultati.errori.push(`Riga saltata: nome o qualifica mancante`);
        continue;
      }
      const coords = r.indirizzo ? await geocodifica(r.indirizzo) : null;
      await prisma.operatore.create({
        data: {
          nome: r.nome.trim(),
          qualifica: r.qualifica.trim(),
          oreSettimanali: parseInt(r.oreSettimanali) || 36,
          indirizzo: r.indirizzo?.trim() ?? "",
          telefono: r.telefono?.trim() ?? null,
          preferenzaTurno: r.preferenzaTurno?.trim() ?? "mattina",
          mezzoTrasporto: r.mezzoTrasporto?.trim() ?? "driving",
          lat: coords?.lat,
          lon: coords?.lon,
        },
      });
      risultati.importati++;
    } catch (e) {
      risultati.errori.push(`Errore su ${r.nome}: ${String(e)}`);
    }
  }
  res.json(risultati);
});

app.post("/api/import/utenti", async (req, res) => {
  const { righe } = req.body;
  const risultati = { importati: 0, errori: [] as string[] };

  for (const r of righe) {
    try {
      if (!r.nome) {
        risultati.errori.push(`Riga saltata: nome mancante`);
        continue;
      }
      const coords = r.indirizzo ? await geocodifica(r.indirizzo) : null;
      await prisma.utente.create({
        data: {
          nome: r.nome.trim(),
          indirizzo: r.indirizzo?.trim() ?? "",
          oreSettimanali: parseInt(r.oreSettimanali) || 10,
          note: r.note?.trim() ?? null,
          lat: coords?.lat,
          lon: coords?.lon,
        },
      });
      risultati.importati++;
    } catch (e) {
      risultati.errori.push(`Errore su ${r.nome}: ${String(e)}`);
    }
  }
  res.json(risultati);
});

// Login multiutente
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const utente = await prisma.utenteApp.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { operatore: true },
  });

  if (!utente || !utente.attivo) {
    return res
      .status(401)
      .json({ ok: false, errore: "Credenziali non valide" });
  }

  const valida = bcrypt.compareSync(password, utente.passwordHash);
  if (!valida) {
    return res
      .status(401)
      .json({ ok: false, errore: "Credenziali non valide" });
  }

  const token = jwt.sign(
    {
      id: utente.id,
      email: utente.email,
      ruolo: utente.ruolo,
      nome: utente.nome,
      operatoreId: utente.operatoreId,
    },
    JWT_SECRET,
    { expiresIn: "30d" },
  );

  res.json({
    ok: true,
    token,
    utente: {
      id: utente.id,
      nome: utente.nome,
      email: utente.email,
      ruolo: utente.ruolo,
      operatoreId: utente.operatoreId,
    },
  });
});

app.get("/api/auth/verifica", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ ok: false });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    res.json({ ok: true, utente: payload });
  } catch {
    res.status(401).json({ ok: false });
  }
});

// Gestione utenti app (solo admin)
app.get("/api/utenti-app", async (req, res) => {
  const utenti = await prisma.utenteApp.findMany({
    include: { operatore: true },
    orderBy: { nome: "asc" },
  });
  res.json(utenti.map((u) => ({ ...u, passwordHash: undefined })));
});

app.post("/api/utenti-app", async (req, res) => {
  const { email, nome, password, ruolo, operatoreId } = req.body;
  try {
    const utente = await prisma.utenteApp.create({
      data: {
        email: email.toLowerCase().trim(),
        nome,
        ruolo,
        passwordHash: bcrypt.hashSync(password, 10),
        operatoreId: operatoreId || null,
      },
    });
    res.json({ ...utente, passwordHash: undefined });
  } catch {
    res.status(400).json({ ok: false, errore: "Email già in uso" });
  }
});

app.put("/api/utenti-app/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, ruolo, operatoreId, password, attivo } = req.body;
  const data: any = { nome, ruolo, attivo, operatoreId: operatoreId || null };
  if (password) data.passwordHash = bcrypt.hashSync(password, 10);
  const utente = await prisma.utenteApp.update({ where: { id }, data });
  res.json({ ...utente, passwordHash: undefined });
});

app.delete("/api/utenti-app/:id", async (req, res) => {
  await prisma.utenteApp.update({
    where: { id: parseInt(req.params.id) },
    data: { attivo: false },
  });
  res.json({ ok: true });
});

app.use((req: any, res, next) => {
  if (req.path === "/api/auth/login" || req.path === "/api/auth/verifica")
    return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ ok: false, errore: "Non autenticato" });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    req.utente = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, errore: "Token scaduto" });
  }
});

app.get("/api/turni-miei", async (req: any, res) => {
  const operatoreId = req.utente?.operatoreId;
  if (!operatoreId) return res.status(403).json({ ok: false });

  const { dataInizio, dataFine } = req.query as any;
  const inizio = new Date(dataInizio);
  inizio.setHours(0, 0, 0, 0);
  const fine = new Date(dataFine);
  fine.setHours(23, 59, 59, 999);

  const interventi = await prisma.intervento.findMany({
    where: { operatoreId, data: { gte: inizio, lte: fine } },
    include: { utente: true, tipoServizio: true },
    orderBy: [{ data: "asc" }, { ordineGiornata: "asc" }],
  });
  res.json(interventi);
});

//----------------------------------TOOL CALL ---------------------------------------//
async function chatWithFallback(params: any) {
  try {
    console.log("🟢 Provo Ollama");

    const res = await ollama.chat.completions.create({
      ...params,
      model: "qwen2.5:14b",
      temperature: 0,
    });

    console.log("✅ Risposta da Ollama");

    return { res, provider: "ollama" };
  } catch (err) {
    console.warn("🔴 Ollama fallito → uso Groq");

    const res = await groq.chat.completions.create({
      ...params,
      model: "llama-3.3-70b-versatile",
      temperature: 0,
    });

    console.log("✅ Risposta da Groq");

    return { res, provider: "groq" };
  }
}

import { toolDefinitions, eseguiTool } from "./tools";

app.post("/api/chat", async (req, res) => {
  try {
    console.log("✅ entro nella root api/chat");

    const { message, history = [] } = req.body;

    const messages = [...history, { role: "user" as const, content: message }];

    const systemPrompt = `Sei un assistente di Paola, coordinatrice del gruppo Coordina*menti*.
Oggi è ${new Date().toLocaleDateString("it-IT")}.

Rivolgiti sempre a Paola direttamente, usando il suo nome quando appropriato.
Il gruppo si chiama Coordina*menti* — usalo quando ti riferisci all'organizzazione.

Hai accesso a un database completo con questi dati:
- Operatori: qualifica, skill, ore contrattuali, mezzo di trasporto, preferenza turno
- Utenti: piano assistenziale, ore settimanali assegnate, note cliniche
- Interventi: turni generati, completati o da completare
- Equipe: gruppi di operatori assegnati a ogni utente con ruoli
- Piani assistenziali: servizi ricorrenti per utente con giorni e orari fissi
- Tipi servizio: durata e skill richieste per ogni tipo di intervento
- Skill: competenze degli operatori (es. Patente B, Medicazioni avanzate)
- Indisponibilità: assenze presenti e future degli operatori

Hai accesso ai seguenti strumenti:
- genera_turni: genera i turni per un periodo dato, rispettando skill, equipe, ore contrattuali e indisponibilità
- ottimizza_percorso: ordina le visite giornaliere di un operatore minimizzando i km, tenendo conto del mezzo di trasporto
- trova_sostituto: individua i migliori sostituti per un operatore assente, verificando skill compatibili e disponibilità
- get_operatori: lista operatori attivi con skill e disponibilità
- get_utenti: lista utenti con piano assistenziale
- get_interventi_giorno: interventi di un giorno, filtrabili per operatore
- get_skill: lista di tutte le skill disponibili
- get_tipi_servizio: lista dei tipi di servizio con durata e skill richieste
- get_equipe: equipe configurate per ogni utente
- get_piani_assistenziali: piani assistenziali attivi, filtrabili per utente
- get_indisponibilita: assenze degli operatori, filtrabili per operatore
- get_statistiche: riepilogo settimanale (operatori attivi, utenti, interventi, ore pianificate)

Regole operative:
- Usa sempre i tool per rispondere a domande sui dati — non inventare mai nomi, numeri o situazioni
- Se Paola chiede di generare turni senza specificare le date, chiedile il periodo desiderato
- Se trovi un operatore assente con interventi assegnati, proponi subito i sostituti usando trova_sostituto
- Quando ottimizzi un percorso, ricorda che ogni operatore ha il suo mezzo di trasporto (auto, bici, piedi)
- Se una domanda riguarda più dati correlati, usa più tool in sequenza per dare una risposta completa
- Segnala esplicitamente a Paola quando un utente non ha copertura o un operatore supera le ore contrattuali

Formato delle risposte:
- Rispondi sempre in italiano
- Sii conciso e operativo — Paola ha poco tempo
- Per liste di operatori o interventi usa un formato leggibile con a capo
- Per situazioni urgenti (assenze last minute, utenti senza copertura) evidenzia il problema chiaramente a Paola
- Non aggiungere disclaimer o spiegazioni inutili — vai dritto al punto`;

    let risposta = "";
    let currentMessages = [...messages];

    let maxSteps = 5;

    // Loop: il modello può chiamare più tool in sequenza

    while (maxSteps-- > 0) {
      let { res: completion, provider } = await chatWithFallback({
        messages: [
          { role: "system", content: systemPrompt },
          ...currentMessages,
        ],
        tools: toolDefinitions,
      });

      console.log("👉 Provider usato:", provider);

      let choice = completion.choices[0];

      // fallback se output sospetto
      const isBad =
        (!choice.message.tool_calls ||
          choice.message.tool_calls.length === 0) &&
        (!choice.message.content || choice.message.content.length < 5);

      if (isBad) {
        console.warn("⚠️ Output scarso → fallback Groq");

        completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...currentMessages,
          ],
          tools: toolDefinitions,
          temperature: 0,
        });

        choice = completion.choices[0];
      }

      // Nessun tool call: risposta finale
      if (
        !choice.message.tool_calls ||
        choice.message.tool_calls.length === 0
      ) {
        risposta = choice.message.content ?? "";
        break;
      }

      // Esegui i tool chiamati
      currentMessages.push({
        role: "assistant",
        tool_calls: choice.message.tool_calls,
      });
      //currentMessages.push({
      //  role: "assistant" as const,
      //  content: choice.message.content ?? "",
      //  tool_calls: choice.message.tool_calls,
      //});

      for (const toolCall of choice.message.tool_calls) {
        const tc = toolCall as any; // cast per compatibilità typing Ollama
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch (e) {
          console.error("JSON rotto:", tc.function.arguments);
          continue;
        }
        console.log(`Tool chiamato: ${tc.function.name}`, args);
        const risultato = await eseguiTool(tc.function.name, args);

        currentMessages.push({
          role: "tool" as const,
          tool_call_id: tc.id,
          content: risultato,
        });
      }
    }

    res.json({ ok: true, reply: risposta });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(3001, () => console.log("Backend su http://localhost:3001"));
