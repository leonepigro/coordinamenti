import { useState, useEffect } from "react";
import Modal from "./Modal";
import { utenti as apiUtenti, tipiServizio as apiTipi, commesse as apiCommesse } from "../api/client";
import InputIndirizzo from "./InputIndirizzo";

interface TipoServizio {
  id: number;
  nome: string;
  durata: number;
}

interface Piano {
  tipoServizioId: number;
  giorniSettimana: string;
  oraInizio: string;
}

const GIORNI = [
  { label: "Lun", value: "1" },
  { label: "Mar", value: "2" },
  { label: "Mer", value: "3" },
  { label: "Gio", value: "4" },
  { label: "Ven", value: "5" },
  { label: "Sab", value: "6" },
  { label: "Dom", value: "0" },
];

const ORE = Array.from({ length: 21 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function ModalUtente({
  utente,
  onClose,
  onSalvato,
}: {
  utente?: any;
  onClose: () => void;
  onSalvato: () => void;
}) {
  const [form, setForm] = useState({
    nome: utente?.nome ?? "",
    indirizzo: utente?.indirizzo ?? "",
    oreSettimanali: utente?.oreSettimanali ?? 10,
    note: utente?.note ?? "",
    commessaId: utente?.commessaId ?? null as number | null,
    lat: utente?.lat ?? undefined,
    lon: utente?.lon ?? undefined,
  });
  const [commesseDisponibili, setCommesseDisponibili] = useState<{ id: number; nome: string }[]>([]);

  const [piani, setPiani] = useState<Piano[]>(
    utente?.piani?.map((p: any) => ({
      tipoServizioId: p.tipoServizioId,
      giorniSettimana: p.giorniSettimana,
      oraInizio: p.oraInizio,
    })) ?? [],
  );
  const [tipi, setTipi] = useState<TipoServizio[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");
  const [step, setStep] = useState<"anagrafica" | "piano">("anagrafica");

  useEffect(() => {
    apiTipi.lista().then((r) => setTipi(r.data));
    apiCommesse.lista().then((r) => setCommesseDisponibili(r.data));
  }, []);

  function aggiornaPiano(
    idx: number,
    campo: keyof Piano,
    valore: string | number,
  ) {
    setPiani((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [campo]: valore } : p)),
    );
  }

  function toggleGiorno(idx: number, giorno: string) {
    const piano = piani[idx];
    const giorni = piano.giorniSettimana
      ? piano.giorniSettimana.split(",").filter(Boolean)
      : [];
    const nuovi = giorni.includes(giorno)
      ? giorni.filter((g) => g !== giorno)
      : [...giorni, giorno].sort();
    aggiornaPiano(idx, "giorniSettimana", nuovi.join(","));
  }

  function aggiungiPiano() {
    if (tipi.length === 0) return;
    setPiani((prev) => [
      ...prev,
      {
        tipoServizioId: tipi[0].id,
        giorniSettimana: "1,2,3,4,5",
        oraInizio: "08:00",
      },
    ]);
  }

  // calcola ore totali settimanali dai piani
  function calcolaOreTotali() {
    return piani.reduce((tot, p) => {
      const tipo = tipi.find((t) => t.id === Number(p.tipoServizioId));
      const nGiorni = p.giorniSettimana.split(",").filter(Boolean).length;
      return tot + (tipo ? (tipo.durata * nGiorni) / 60 : 0);
    }, 0);
  }

  async function salva() {
    if (!form.nome.trim() || !form.indirizzo.trim()) {
      setErrore("Nome e indirizzo sono obbligatori");
      setStep("anagrafica");
      return;
    }
    setSalvando(true);
    setErrore("");
    try {
      if (utente?.id) {
        await apiUtenti.aggiorna(utente.id, { ...form, piani });
      } else {
        await apiUtenti.crea({ ...form, piani });
      }
      onSalvato();
      onClose();
    } catch {
      setErrore("Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  }

  const oreTotali = calcolaOreTotali();

  return (
    <Modal
      titolo={utente ? "Modifica utente" : "Nuovo utente"}
      onClose={onClose}
    >
      {/* Step tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          borderBottom: "1px solid #e5e5e3",
          paddingBottom: 0,
        }}
      >
        {(["anagrafica", "piano"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "none",
              fontSize: 13,
              cursor: "pointer",
              color: step === s ? "#1a1a1a" : "#888",
              fontWeight: step === s ? 500 : 400,
              borderBottom:
                step === s ? "2px solid #1a1a1a" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {s === "anagrafica"
              ? "Anagrafica"
              : `Piano assistenziale ${piani.length > 0 ? `(${piani.length})` : ""}`}
          </button>
        ))}
      </div>

      {step === "anagrafica" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelStyle}>Nome completo *</label>
              <input
                value={form.nome}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nome: e.target.value }))
                }
                style={inputStyle}
                placeholder="Es. Sig. Mario Rossi"
              />
            </div>
            <div>
              <label style={labelStyle}>Ore settimanali assegnate</label>
              <input
                type="number"
                value={form.oreSettimanali}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    oreSettimanali: parseInt(e.target.value),
                  }))
                }
                style={inputStyle}
                min={1}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Commessa</label>
            <select
              value={form.commessaId ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, commessaId: e.target.value ? parseInt(e.target.value) : null }))}
              style={inputStyle}
            >
              <option value="">— Nessuna commessa —</option>
              {commesseDisponibili.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Indirizzo *</label>
            <InputIndirizzo
              valore={form.indirizzo}
              lat={form.lat}
              lon={form.lon}
              onChange={(indirizzo, lat, lon) =>
                setForm((f) => ({ ...f, indirizzo, lat, lon }))
              }
            />
          </div>
          <div>
            <label style={labelStyle}>Note assistenziali</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              style={{ ...inputStyle, height: 80, resize: "vertical" }}
              placeholder="Patologie, note, preferenze..."
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 8,
            }}
          >
            <button onClick={onClose} style={btnSecondarioStyle}>
              Annulla
            </button>
            <button onClick={() => setStep("piano")} style={btnPrimarioStyle}>
              Avanti →
            </button>
          </div>
        </div>
      )}

      {step === "piano" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Riepilogo ore */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: 10,
              background:
                oreTotali > form.oreSettimanali ? "#FEF2F2" : "#F0FDF4",
            }}
          >
            <span style={{ fontSize: 13, color: "#555" }}>
              Ore pianificate a settimana
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: oreTotali > form.oreSettimanali ? "#DC2626" : "#15803D",
              }}
            >
              {oreTotali.toFixed(1)}h / {form.oreSettimanali}h
            </span>
          </div>

          {piani.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "#aaa",
                fontSize: 14,
              }}
            >
              Nessun servizio pianificato — clicca "+ Aggiungi servizio"
            </div>
          )}

          {piani.map((piano, idx) => {
            const tipo = tipi.find(
              (t) => t.id === Number(piano.tipoServizioId),
            );
            const nGiorni = piano.giorniSettimana
              .split(",")
              .filter(Boolean).length;
            const oreServizio = tipo
              ? ((tipo.durata * nGiorni) / 60).toFixed(1)
              : "0";

            return (
              <div
                key={idx}
                style={{
                  border: "1px solid #e5e5e3",
                  borderRadius: 10,
                  padding: 16,
                  background: "#fafaf9",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    <select
                      value={piano.tipoServizioId}
                      onChange={(e) =>
                        aggiornaPiano(
                          idx,
                          "tipoServizioId",
                          parseInt(e.target.value),
                        )
                      }
                      style={{ ...inputStyle, width: "auto", flex: 1 }}
                    >
                      {tipi.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} — {t.durata}min
                        </option>
                      ))}
                    </select>
                    <select
                      value={piano.oraInizio}
                      onChange={(e) =>
                        aggiornaPiano(idx, "oraInizio", e.target.value)
                      }
                      style={{ ...inputStyle, width: 90 }}
                    >
                      {ORE.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() =>
                      setPiani((prev) => prev.filter((_, i) => i !== idx))
                    }
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#dc2626",
                      fontSize: 16,
                      marginLeft: 8,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Selezione giorni visiva */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {GIORNI.map((g) => {
                    const attivo = piano.giorniSettimana
                      .split(",")
                      .includes(g.value);
                    return (
                      <button
                        key={g.value}
                        onClick={() => toggleGiorno(idx, g.value)}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          fontSize: 12,
                          cursor: "pointer",
                          border: attivo ? "none" : "1px solid #e5e5e3",
                          background: attivo ? "#1a1a1a" : "#fff",
                          color: attivo ? "#fff" : "#555",
                          fontWeight: attivo ? 500 : 400,
                        }}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: 11, color: "#aaa" }}>
                  {nGiorni} {nGiorni === 1 ? "giorno" : "giorni"} ·{" "}
                  {oreServizio}h/sett.
                </div>
              </div>
            );
          })}

          <button
            onClick={aggiungiPiano}
            style={{
              padding: "10px",
              borderRadius: 10,
              border: "1.5px dashed #e5e5e3",
              background: "none",
              color: "#888",
              fontSize: 13,
              cursor: "pointer",
              width: "100%",
            }}
          >
            + Aggiungi servizio
          </button>

          {errore && (
            <div style={{ color: "#dc2626", fontSize: 13 }}>{errore}</div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 8,
            }}
          >
            <button
              onClick={() => setStep("anagrafica")}
              style={btnSecondarioStyle}
            >
              ← Indietro
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={btnSecondarioStyle}>
                Annulla
              </button>
              <button
                onClick={salva}
                disabled={salvando}
                style={btnPrimarioStyle}
              >
                {salvando ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#666",
  marginBottom: 4,
  fontWeight: 500,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e5e5e3",
  borderRadius: 8,
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
};
const btnPrimarioStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  background: "#1a1a1a",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
};
const btnSecondarioStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #e5e5e3",
  background: "#fff",
  color: "#333",
  fontSize: 13,
  cursor: "pointer",
};
