/**
 * Smoke test degli endpoint principali.
 * PrismaClient è mockato — nessun DB necessario.
 */

import request from "supertest";

jest.mock("@prisma/client", () => {
  const mockPrisma = {
    operatore: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    utente: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    intervento: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    indisponibilita: { findMany: jest.fn().mockResolvedValue([]) },
    skill: { findMany: jest.fn().mockResolvedValue([]) },
    tipoServizio: { findMany: jest.fn().mockResolvedValue([]) },
    equipe: { findMany: jest.fn().mockResolvedValue([]) },
    pianoAssistenziale: { findMany: jest.fn().mockResolvedValue([]) },
    utenteApp: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  }))
);
jest.mock("node-cron", () => ({ schedule: jest.fn() }));
jest.mock("resend", () => ({ Resend: jest.fn() }));

let app: any;
beforeAll(async () => {
  const mod = await import("../index");
  app = mod.default;
});

// ── Auth ───────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("401 con credenziali inesistenti", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nessuno@test.it", password: "sbagliata" });
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/auth/verifica", () => {
  it("401 senza header Authorization", async () => {
    const res = await request(app).get("/api/auth/verifica");
    expect(res.status).toBe(401);
  });

  it("401 con token malformato", async () => {
    const res = await request(app)
      .get("/api/auth/verifica")
      .set("Authorization", "Bearer token_falso");
    expect(res.status).toBe(401);
  });
});

// ── Endpoint pubblici (dati mock vuoti) ────────────────

describe("Endpoint dati → rispondono 200 con array vuoto", () => {
  const routes = [
    "/api/operatori",
    "/api/utenti",
    "/api/interventi",
    "/api/skill",
    "/api/tipi-servizio",
    "/api/equipe",
    "/api/indisponibilita",
    "/api/piani",
  ];

  test.each(routes)("GET %s", async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Config pubblica ────────────────────────────────────

describe("GET /api/config", () => {
  it("restituisce i modelli configurati", async () => {
    const res = await request(app).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ollamaModel");
    expect(res.body).toHaveProperty("groqModel");
    expect(res.body).toHaveProperty("ollamaUrl");
  });
});

// ── Endpoint protetto da JWT ───────────────────────────

describe("GET /api/turni-miei", () => {
  it("401 senza token", async () => {
    const res = await request(app).get(
      "/api/turni-miei?dataInizio=2026-04-21&dataFine=2026-04-27"
    );
    expect(res.status).toBe(401);
  });
});

// ── Notifiche ─────────────────────────────────────────

describe("POST /api/notifiche/test", () => {
  it("ok:true con inviati=0 quando RESEND_API_KEY è placeholder", async () => {
    const res = await request(app)
      .post("/api/notifiche/test")
      .send({ data: "2026-04-23" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.inviati).toBe(0);
  });
});
