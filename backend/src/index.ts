import express from "express";
import cors from "cors";
import path from "path";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
export const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:14b";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const ollama = new OpenAI({ baseURL: OLLAMA_BASE_URL, apiKey: "ollama" });
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
import { inviaRiepilogoGiornaliero, inviaAggiornamentoPianificazione } from "./notifiche";
import cron from "node-cron";

app.post("/api/scheduling/genera", async (req, res) => {
  try {
    const { dataInizio, dataFine } = req.body;
    const inizio = new Date(dataInizio);
    const fine = new Date(dataFine);

    const { assegnate, scoperti } = await generaTurni(inizio, fine);
    await salvaAssegnazioni(assegnate, scoperti);

    // Invia email aggiornamento agli operatori coinvolti (non-blocking)
    inviaAggiornamentoPianificazione(inizio, fine).catch((e) =>
      console.error("[notifiche] errore invio email:", e),
    );

    res.json({
      ok: true,
      assegnati: assegnate.length,
      scoperti: scoperti.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Endpoint per testare l'invio manuale (solo admin)
app.post("/api/notifiche/test", async (req, res) => {
  try {
    const data = req.body.data ? new Date(req.body.data) : new Date();
    const inviati = await inviaRiepilogoGiornaliero(data);
    res.json({ ok: true, inviati });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Cron: ogni mattina alle 6:30 invia il riepilogo del giorno agli operatori
cron.schedule("30 6 * * *", () => {
  console.log("[cron] Invio riepilogo giornaliero...");
  inviaRiepilogoGiornaliero(new Date()).catch((e) =>
    console.error("[cron] errore:", e),
  );
}, { timezone: "Europe/Rome" });

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
    include: {
      skills: { include: { skill: true } },
      commesse: { include: { commessa: true } },
    },
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
app.get("/api/commesse", async (req, res) => {
  const commesse = await prisma.commessa.findMany({ orderBy: { nome: "asc" } });
  res.json(commesse);
});

app.post("/api/commesse", async (req, res) => {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ errore: "Nome obbligatorio" });
  try {
    const c = await prisma.commessa.create({ data: { nome: nome.trim() } });
    res.json(c);
  } catch {
    res.status(400).json({ errore: "Commessa già esistente" });
  }
});

app.get("/api/qualifiche", async (req, res) => {
  const qualifiche = await prisma.qualifica.findMany({ orderBy: { nome: "asc" } });
  res.json(qualifiche);
});

app.post("/api/qualifiche", async (req, res) => {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ errore: "Nome obbligatorio" });
  try {
    const q = await prisma.qualifica.create({ data: { nome: nome.trim() } });
    res.json(q);
  } catch {
    res.status(400).json({ errore: "Qualifica già esistente" });
  }
});

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
    commessaIds,
    lat,
    lon,
    email,
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
      email: email?.toLowerCase().trim() || null,
      lat: coords?.lat,
      lon: coords?.lon,
      skills: { create: skillIds.map((id: number) => ({ skillId: id })) },
      commesse: { create: (commessaIds ?? []).map((id: number) => ({ commessaId: id })) },
    },
    include: { skills: { include: { skill: true } }, commesse: { include: { commessa: true } } },
  });

  if (email?.trim()) {
    const emailNorm = email.toLowerCase().trim();
    await prisma.utenteApp.upsert({
      where: { email: emailNorm },
      update: { operatoreId: operatore.id, attivo: true },
      create: {
        email: emailNorm,
        nome,
        ruolo: "operatore",
        passwordHash: bcrypt.hashSync("coordinamenti2026", 10),
        operatoreId: operatore.id,
      },
    });
  }

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
    commessaIds,
    lat,
    lon,
    email,
  } = req.body;
  const coords = lat && lon ? { lat, lon } : await geocodifica(indirizzo);
  await prisma.operatoreSkill.deleteMany({ where: { operatoreId: id } });
  await prisma.operatoreCommessa.deleteMany({ where: { operatoreId: id } });
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
      email: email?.toLowerCase().trim() || null,
      lat: coords?.lat,
      lon: coords?.lon,
      skills: { create: skillIds.map((id: number) => ({ skillId: id })) },
      commesse: { create: (commessaIds ?? []).map((id: number) => ({ commessaId: id })) },
    },
    include: { skills: { include: { skill: true } }, commesse: { include: { commessa: true } } },
  });

  if (email?.trim()) {
    const emailNorm = email.toLowerCase().trim();
    // Disconnetti il vecchio UtenteApp di questo operatore se ha email diversa
    await prisma.utenteApp.updateMany({
      where: { operatoreId: id, email: { not: emailNorm } },
      data: { operatoreId: null },
    });
    await prisma.utenteApp.upsert({
      where: { email: emailNorm },
      update: { operatoreId: id, attivo: true },
      create: {
        email: emailNorm,
        nome,
        ruolo: "operatore",
        passwordHash: bcrypt.hashSync("coordinamenti2026", 10),
        operatoreId: id,
      },
    });
  } else {
    // Email rimossa: disconnetti senza eliminare l'account
    await prisma.utenteApp.updateMany({
      where: { operatoreId: id },
      data: { operatoreId: null },
    });
  }

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
  const { nome, indirizzo, oreSettimanali, note, piani, commessaId, lat, lon } = req.body;
  const coords = lat && lon ? { lat, lon } : await geocodifica(indirizzo);
  const utente = await prisma.utente.create({
    data: {
      nome,
      indirizzo,
      oreSettimanali,
      note,
      commessaId: commessaId ?? null,
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
    include: { piani: { include: { tipoServizio: true } }, commessa: true },
  });
  res.json(utente);
});

app.put("/api/utenti/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, indirizzo, oreSettimanali, note, piani, commessaId, lat, lon } = req.body;
  const coords = lat && lon ? { lat, lon } : await geocodifica(indirizzo);
  await prisma.pianoAssistenziale.deleteMany({ where: { utenteId: id } });
  const utente = await prisma.utente.update({
    where: { id },
    data: {
      nome,
      indirizzo,
      oreSettimanali,
      note,
      commessaId: commessaId ?? null,
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
    include: { piani: { include: { tipoServizio: true } }, commessa: true },
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
    interventiScoperti,
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
    prisma.intervento.findMany({
      where: { data: { gte: oggi, lte: fineOggi }, operatoreId: null },
      include: { utente: true, tipoServizio: true },
      orderBy: { turno: "asc" },
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
    interventiScoperti: interventiScoperti.map((i) => ({
      id: i.id,
      utente: i.utente.nome,
      servizio: i.tipoServizio?.nome ?? "—",
      turno: i.turno,
      durata: i.durata,
    })),
    operatoriAttivi,
    utentiAttivi,
    interventiSettimana,
    sovraccarichi,
  });
});

function estraiUtente(req: any): { nome: string; ruolo: string; email: string } {
  try {
    const auth = req.headers.authorization as string | undefined;
    if (auth?.startsWith("Bearer ")) {
      const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
      return { nome: payload.nome ?? "Collaboratore", ruolo: payload.ruolo ?? "operatore", email: payload.email ?? "" };
    }
  } catch { /* token assente o non valido */ }
  return { nome: "Collaboratore", ruolo: "operatore", email: "" };
}

function buildSystemPrompt(nome: string, ruolo: string): string {
  const oggi = new Date().toLocaleDateString("it-IT");
  const isCoord = ruolo === "admin" || ruolo === "coordinatore";
  const ruoloDesc = isCoord ? "coordinatore del gruppo Coordina*menti*" : "operatore del gruppo Coordina*menti*";

  return `Sei l'assistente di ${nome}, ${ruoloDesc}.
Oggi è ${oggi}.
Rivolgiti sempre a ${nome} direttamente, usando il suo nome quando appropriato.
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
- genera_turni: genera i turni per un periodo dato
- ottimizza_percorso: ordina le visite minimizzando i km
- trova_sostituto: individua sostituti per un operatore assente
- get_operatori, get_utenti, get_interventi_giorno, get_skill, get_tipi_servizio, get_equipe, get_piani_assistenziali, get_indisponibilita, get_statistiche: lettura dati
- get_qualifiche, aggiungi_qualifica: gestione qualifiche
- invia_email_riepilogo: invia riepilogo giornaliero agli operatori via email
- invia_email_aggiornamento: invia aggiornamento pianificazione per un periodo

Regole operative:
- Usa sempre i tool per rispondere a domande sui dati — non inventare mai nomi, numeri o situazioni
- Se viene chiesto di generare turni senza specificare le date, chiedi il periodo desiderato
- Se trovi un operatore assente con interventi assegnati, proponi subito i sostituti
- Segnala quando un utente non ha copertura o un operatore supera le ore contrattuali

Formato delle risposte:
- Rispondi sempre in italiano, in modo conciso e operativo
- Per liste usa un formato leggibile con a capo
- Per situazioni urgenti evidenzia il problema chiaramente
- Non aggiungere disclaimer o spiegazioni inutili — vai dritto al punto`;
}

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

    const utente = estraiUtente(req);
    const systemPrompt = buildSystemPrompt(utente.nome, utente.ruolo);

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
      const emailNorm = r.email?.trim().toLowerCase() || null;
      const commesseNomi: string[] = (r.commessa ?? "")
        .split(",").map((c: string) => c.trim()).filter(Boolean);
      const commessaIds = await Promise.all(commesseNomi.map(async (nome: string) => {
        const c = await prisma.commessa.upsert({ where: { nome }, update: {}, create: { nome } });
        return c.id;
      }));
      const operatore = await prisma.operatore.create({
        data: {
          nome: r.nome.trim(),
          qualifica: r.qualifica.trim(),
          oreSettimanali: parseInt(r.oreSettimanali) || 36,
          indirizzo: r.indirizzo?.trim() ?? "",
          telefono: r.telefono?.trim() ?? null,
          preferenzaTurno: r.preferenzaTurno?.trim() ?? "mattina",
          mezzoTrasporto: r.mezzoTrasporto?.trim() ?? "driving",
          email: emailNorm,
          lat: coords?.lat,
          lon: coords?.lon,
          commesse: { create: commessaIds.map((id) => ({ commessaId: id })) },
        },
      });
      if (emailNorm) {
        await prisma.utenteApp.upsert({
          where: { email: emailNorm },
          update: { operatoreId: operatore.id, attivo: true },
          create: {
            email: emailNorm,
            nome: r.nome.trim(),
            ruolo: "operatore",
            passwordHash: bcrypt.hashSync("coordinamenti2026", 10),
            operatoreId: operatore.id,
          },
        });
      }
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
      let commessaId: number | null = null;
      if (r.commessa?.trim()) {
        const nome = r.commessa.trim();
        const c = await prisma.commessa.upsert({ where: { nome }, update: {}, create: { nome } });
        commessaId = c.id;
      }
      await prisma.utente.create({
        data: {
          nome: r.nome.trim(),
          indirizzo: r.indirizzo?.trim() ?? "",
          oreSettimanali: parseInt(r.oreSettimanali) || 10,
          note: r.note?.trim() ?? null,
          commessaId,
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

app.put("/api/auth/profilo", async (req, res) => {
  const utente = estraiUtente(req);
  const { passwordAttuale, nuovaPassword, nuovaEmail } = req.body;

  const record = await prisma.utenteApp.findUnique({ where: { email: utente.email } });
  if (!record) return res.status(404).json({ errore: "Utente non trovato" });

  if (!bcrypt.compareSync(passwordAttuale, record.passwordHash))
    return res.status(400).json({ errore: "Password attuale non corretta" });

  const data: any = {};
  if (nuovaEmail?.trim()) data.email = nuovaEmail.toLowerCase().trim();
  if (nuovaPassword?.trim()) data.passwordHash = bcrypt.hashSync(nuovaPassword, 10);

  if (Object.keys(data).length === 0)
    return res.status(400).json({ errore: "Nessuna modifica richiesta" });

  try {
    const aggiornato = await prisma.utenteApp.update({ where: { id: record.id }, data });
    res.json({ ok: true, email: aggiornato.email });
  } catch {
    res.status(400).json({ errore: "Email già in uso" });
  }
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

// Configurazione esposta al frontend
app.get("/api/config", (_req, res) => {
  res.json({
    ollamaModel: OLLAMA_MODEL,
    groqModel: GROQ_MODEL,
    ollamaUrl: OLLAMA_BASE_URL,
  });
});

// Dati per la mappa
app.get("/api/mappa", async (req, res) => {
  try {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const fineOggi = new Date();
    fineOggi.setHours(23, 59, 59, 999);

    const [operatori, utenti, interventiOggi] = await Promise.all([
      prisma.operatore.findMany({
        where: { attivo: true, lat: { not: null }, lon: { not: null } },
        select: {
          id: true, nome: true, qualifica: true,
          telefono: true, lat: true, lon: true, mezzoTrasporto: true,
        },
        orderBy: { nome: "asc" },
      }),
      prisma.utente.findMany({
        where: { attivo: true, lat: { not: null }, lon: { not: null } },
        select: { id: true, nome: true, indirizzo: true, lat: true, lon: true },
        orderBy: { nome: "asc" },
      }),
      prisma.intervento.findMany({
        where: { data: { gte: oggi, lte: fineOggi } },
        select: {
          id: true, turno: true, ordineGiornata: true,
          operatore: { select: { id: true, nome: true } },
          utente: { select: { id: true, nome: true, lat: true, lon: true } },
          tipoServizio: { select: { nome: true } },
        },
        orderBy: [{ operatoreId: "asc" }, { turno: "asc" }, { ordineGiornata: "asc" }],
      }),
    ]);

    const totaleOperatori = await prisma.operatore.count({ where: { attivo: true } });
    const totaleUtenti = await prisma.utente.count({ where: { attivo: true } });

    res.json({
      ok: true,
      operatori,
      utenti,
      interventiOggi,
      senzaCoordinate: {
        operatori: totaleOperatori - operatori.length,
        utenti: totaleUtenti - utenti.length,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Candidati idonei per un intervento scoperto
app.get("/api/interventi/:id/candidati", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const intervento = await prisma.intervento.findUnique({
      where: { id },
      include: { tipoServizio: { include: { skills: true } }, utente: true },
    });
    if (!intervento) return res.status(404).json({ ok: false });

    const inizioGiorno = new Date(intervento.data);
    inizioGiorno.setHours(0, 0, 0, 0);
    const fineGiorno = new Date(intervento.data);
    fineGiorno.setHours(23, 59, 59, 999);

    const skillNecessarie = new Set(
      intervento.tipoServizio?.skills.map((s) => s.skillId) ?? [],
    );

    const [indisponibili, equipe, caricoOggi, operatori] = await Promise.all([
      prisma.indisponibilita.findMany({
        where: { data: { gte: inizioGiorno, lte: fineGiorno } },
      }),
      prisma.equipe.findFirst({
        where: { utenteId: intervento.utenteId },
        include: { membri: true },
      }),
      prisma.intervento.groupBy({
        by: ["operatoreId"],
        where: {
          data: { gte: inizioGiorno, lte: fineGiorno },
          operatoreId: { not: null },
        },
        _count: { id: true },
        _sum: { durata: true },
      }),
      prisma.operatore.findMany({
        where: { attivo: true },
        include: { skills: true },
      }),
    ]);

    const idIndisponibili = new Set(indisponibili.map((i) => i.operatoreId));
    const idEquipe = new Set(equipe?.membri.map((m) => m.operatoreId) ?? []);
    const carico = new Map(
      caricoOggi.map((c) => [
        c.operatoreId,
        { count: c._count.id, durata: c._sum.durata ?? 0 },
      ]),
    );

    const candidati = operatori
      .filter((op) => !idIndisponibili.has(op.id))
      .filter((op) => {
        if (skillNecessarie.size === 0) return true;
        const skillOp = new Set(op.skills.map((s) => s.skillId));
        return [...skillNecessarie].every((s) => skillOp.has(s));
      })
      .map((op) => ({
        id: op.id,
        nome: op.nome,
        qualifica: op.qualifica,
        inEquipe: idEquipe.has(op.id),
        interventiOggi: carico.get(op.id)?.count ?? 0,
        minutiOggi: carico.get(op.id)?.durata ?? 0,
      }))
      .sort((a, b) => {
        if (a.inEquipe !== b.inEquipe) return a.inEquipe ? -1 : 1;
        return a.interventiOggi - b.interventiOggi;
      });

    res.json({ ok: true, candidati: candidati.slice(0, 6) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Assegna un operatore a un intervento
app.put("/api/interventi/:id/assegna", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { operatoreId } = req.body;
    await prisma.intervento.update({
      where: { id },
      data: { operatoreId },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.use((req: any, res, next) => {
  if (!req.path.startsWith("/api")) return next();
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
      model: OLLAMA_MODEL,
      temperature: 0,
    });

    console.log("✅ Risposta da Ollama");

    return { res, provider: "ollama" };
  } catch (err) {
    console.warn("🔴 Ollama fallito → uso Groq");

    const res = await groq.chat.completions.create({
      ...params,
      model: GROQ_MODEL,
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

    const utente = estraiUtente(req);
    const systemPrompt = buildSystemPrompt(utente.nome, utente.ruolo);

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
          model: GROQ_MODEL,
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

const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
app.use(express.static(frontendDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;

if (require.main === module) {
  const PORT = parseInt(process.env.PORT ?? "3001");
  app.listen(PORT, () => console.log(`Backend su http://localhost:${PORT}`));
}
