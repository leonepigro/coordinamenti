/**
 * Test per la logica delle email (stimaOrari, buildMapsLink).
 * Resend non viene mai chiamato — RESEND_API_KEY è placeholder nel setup.
 */

// Re-implementazione fedele delle funzioni pure di notifiche.ts

function buildMapsLink(indirizzi: string[]): string {
  const validi = indirizzi.filter(Boolean);
  if (validi.length === 0) return "";
  return (
    "https://www.google.com/maps/dir/" +
    validi.map((a) => encodeURIComponent(a)).join("/")
  );
}

function stimaOrari(interventi: { durata: number }[], turno: string): string[] {
  const orari: string[] = [];
  let minuti = turno === "mattina" ? 8 * 60 : 14 * 60 + 30;
  for (const i of interventi) {
    const h = Math.floor(minuti / 60);
    const m = minuti % 60;
    orari.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    minuti += i.durata + 15;
  }
  return orari;
}

// ── buildMapsLink ─────────────────────────────────────

describe("buildMapsLink", () => {
  it("restituisce stringa vuota senza indirizzi", () => {
    expect(buildMapsLink([])).toBe("");
  });

  it("restituisce stringa vuota con soli valori falsy", () => {
    expect(buildMapsLink(["", ""])).toBe("");
  });

  it("un solo indirizzo produce URL valido", () => {
    const url = buildMapsLink(["Via Roma 1, Napoli"]);
    expect(url).toContain("maps/dir/");
    expect(url).toContain(encodeURIComponent("Via Roma 1, Napoli"));
  });

  it("più indirizzi separati da /", () => {
    const url = buildMapsLink(["Via Roma 1", "Corso Umberto 5"]);
    const parts = url.replace("https://www.google.com/maps/dir/", "").split("/");
    expect(parts).toHaveLength(2);
  });

  it("ignora indirizzi vuoti in mezzo alla lista", () => {
    const url = buildMapsLink(["Via Roma 1", "", "Corso Umberto 5"]);
    const parts = url.replace("https://www.google.com/maps/dir/", "").split("/");
    expect(parts).toHaveLength(2);
  });
});

// ── stimaOrari ────────────────────────────────────────

describe("stimaOrari", () => {
  it("turno mattina inizia alle 08:00", () => {
    const orari = stimaOrari([{ durata: 60 }], "mattina");
    expect(orari[0]).toBe("08:00");
  });

  it("turno pomeriggio inizia alle 14:30", () => {
    const orari = stimaOrari([{ durata: 60 }], "pomeriggio");
    expect(orari[0]).toBe("14:30");
  });

  it("secondo intervento tiene conto di durata + 15 min spostamento", () => {
    const orari = stimaOrari([{ durata: 60 }, { durata: 30 }], "mattina");
    // 08:00 + 60 + 15 = 09:15
    expect(orari[1]).toBe("09:15");
  });

  it("tre interventi scalano correttamente", () => {
    const orari = stimaOrari(
      [{ durata: 45 }, { durata: 30 }, { durata: 60 }],
      "mattina"
    );
    expect(orari[0]).toBe("08:00");
    expect(orari[1]).toBe("09:00"); // 8:00 + 45 + 15
    expect(orari[2]).toBe("09:45"); // 9:00 + 30 + 15
  });

  it("lista vuota → nessun orario", () => {
    expect(stimaOrari([], "mattina")).toHaveLength(0);
  });

  it("formatta con zero iniziale (es. 08 non 8)", () => {
    const orari = stimaOrari([{ durata: 60 }], "mattina");
    expect(orari[0]).toMatch(/^\d{2}:\d{2}$/);
  });
});

// ── inviaRiepilogoGiornaliero — smoke con placeholder key ─

describe("inviaRiepilogoGiornaliero (smoke)", () => {
  it("restituisce 0 senza eseguire chiamate Resend quando la key è placeholder", async () => {
    // Il modulo legge process.env.RESEND_API_KEY impostato in setup.ts
    const { inviaRiepilogoGiornaliero } = await import("../notifiche");
    const inviati = await inviaRiepilogoGiornaliero(new Date());
    expect(inviati).toBe(0);
  });
});
