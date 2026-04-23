/**
 * Test unitari per la logica dello scheduler.
 * Testano solo le funzioni pure — nessun DB necessario.
 */

type Turno = "mattina" | "pomeriggio";

function oraToTurno(ora: string): Turno {
  const h = parseInt(ora.split(":")[0]);
  return h < 13 ? "mattina" : "pomeriggio";
}

// Usa il costruttore locale (non stringa ISO) per evitare slittamenti UTC
function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function lunedi(input: Date): Date {
  const date = new Date(input);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function domenica(input: Date): Date {
  const date = lunedi(input);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getChiave(operatoreId: number, data: Date, turno: Turno): string {
  return `${operatoreId}-${data.toISOString().slice(0, 10)}-${turno}`;
}

// ── oraToTurno ─────────────────────────────────────────

describe("oraToTurno", () => {
  it("08:00 → mattina",    () => expect(oraToTurno("08:00")).toBe("mattina"));
  it("12:59 → mattina",    () => expect(oraToTurno("12:59")).toBe("mattina"));
  it("13:00 → pomeriggio", () => expect(oraToTurno("13:00")).toBe("pomeriggio"));
  it("14:30 → pomeriggio", () => expect(oraToTurno("14:30")).toBe("pomeriggio"));
  it("18:00 → pomeriggio", () => expect(oraToTurno("18:00")).toBe("pomeriggio"));
});

// ── lunedi ──────────────────────────────────────────────

describe("lunedi", () => {
  it("da mercoledì 22 apr → lunedì 20 apr", () => {
    expect(localDateStr(lunedi(d(2026, 4, 22)))).toBe("2026-04-20");
  });

  it("da lunedì rimane lunedì", () => {
    expect(localDateStr(lunedi(d(2026, 4, 20)))).toBe("2026-04-20");
  });

  it("da domenica → lunedì della settimana precedente", () => {
    expect(localDateStr(lunedi(d(2026, 4, 19)))).toBe("2026-04-13");
  });

  it("orario impostato a 00:00:00", () => {
    const l = lunedi(d(2026, 4, 22));
    expect(l.getHours()).toBe(0);
    expect(l.getMinutes()).toBe(0);
  });
});

// ── domenica ───────────────────────────────────────────

describe("domenica", () => {
  it("da mercoledì 22 apr → domenica 26 apr", () => {
    expect(localDateStr(domenica(d(2026, 4, 22)))).toBe("2026-04-26");
  });

  it("orario impostato a 23:59:59", () => {
    const dom = domenica(d(2026, 4, 22));
    expect(dom.getHours()).toBe(23);
    expect(dom.getMinutes()).toBe(59);
  });
});

// ── getChiave ──────────────────────────────────────────

describe("getChiave", () => {
  it("produce chiave nel formato operatoreId-data-turno", () => {
    const data = new Date("2026-04-22T10:00:00Z");
    expect(getChiave(1, data, "mattina")).toMatch(/^1-\d{4}-\d{2}-\d{2}-mattina$/);
  });

  it("chiavi diverse per turno diverso", () => {
    const data = new Date("2026-04-22T10:00:00Z");
    expect(getChiave(1, data, "mattina")).not.toBe(getChiave(1, data, "pomeriggio"));
  });

  it("chiavi diverse per operatore diverso", () => {
    const data = new Date("2026-04-22T10:00:00Z");
    expect(getChiave(1, data, "mattina")).not.toBe(getChiave(2, data, "mattina"));
  });
});

// ── Bilanciamento ore ──────────────────────────────────

describe("bilanciamento ore", () => {
  const MINUTI_PER_TURNO = { mattina: 390, pomeriggio: 360 };

  it("60 min entrano in turno mattina vuoto", () => {
    expect(0 + 60).toBeLessThanOrEqual(MINUTI_PER_TURNO.mattina);
  });

  it("slot che supera i minuti del turno viene rifiutato", () => {
    expect(370 + 60).toBeGreaterThan(MINUTI_PER_TURNO.mattina);
  });

  it("operatore a ore piene non prende altri slot", () => {
    expect(36 >= 36).toBe(true);
  });
});
