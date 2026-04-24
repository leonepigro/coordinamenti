import { useState, useEffect } from "react";
import {
  indisponibilita as apiInd,
  operatori as apiOperatori,
} from "../api/client";
import { format, isAfter, startOfToday } from "date-fns";
import { it } from "date-fns/locale";

interface Indisponibilita {
  id: number;
  data: string;
  motivo: string | null;
  operatore: { id: number; nome: string; qualifica: string };
}

const MOTIVI = ["malattia", "ferie", "permesso", "altro"];

const MOTIVO_STYLE: Record<string, { bg: string; color: string }> = {
  malattia: { bg: "#FCEAEA", color: "#A02020" },
  ferie: { bg: "var(--terra-light)", color: "var(--terra-dark)" },
  permesso: { bg: "var(--salvia-light)", color: "var(--salvia-dark)" },
  altro: { bg: "var(--sabbia)", color: "var(--grigio)" },
};

export default function Indisponibilita() {
  const [lista, setLista] = useState<Indisponibilita[]>([]);
  const [operatori, setOperatori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState({
    operatoreId: 0,
    data: format(new Date(), "yyyy-MM-dd"),
    motivo: "malattia",
  });
  const [salvando, setSalvando] = useState(false);
  const [filtroOperatore, setFiltroOperatore] = useState<number | "">("");
  const [risultatoRicalcolo, setRisultatoRicalcolo] = useState<any>(null);
  const [ricalcolando, setRicalcolando] = useState(false);

  async function carica() {
    const [resInd, resOp] = await Promise.all([
      apiInd.lista(filtroOperatore || undefined),
      apiOperatori.lista(),
    ]);
    setLista(resInd.data);
    setOperatori(resOp.data);
    if (resOp.data.length > 0 && form.operatoreId === 0) {
      setForm((f) => ({ ...f, operatoreId: resOp.data[0].id }));
    }
    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, [filtroOperatore]);

  async function aggiungi() {
    if (!form.operatoreId || !form.data) return;
    setSalvando(true);
    try {
      await apiInd.crea(form);
      setMostraForm(false);
      const dataSelezionata = new Date(form.data);
      const domani = new Date();
      domani.setDate(domani.getDate() + 1);
      const isUrgente =
        format(dataSelezionata, "yyyy-MM-dd") ===
          format(new Date(), "yyyy-MM-dd") ||
        format(dataSelezionata, "yyyy-MM-dd") === format(domani, "yyyy-MM-dd");
      if (isUrgente) {
        setRicalcolando(true);
        try {
          const res = await apiInd.ricalcola(form.operatoreId, form.data);
          setRisultatoRicalcolo(res.data);
        } finally {
          setRicalcolando(false);
        }
      }
      carica();
    } finally {
      setSalvando(false);
    }
  }

  async function ricalcolaManuale(operatoreId: number, data: string) {
    setRicalcolando(true);
    try {
      const res = await apiInd.ricalcola(operatoreId, data);
      setRisultatoRicalcolo(res.data);
      carica();
    } finally {
      setRicalcolando(false);
    }
  }

  async function elimina(id: number) {
    await apiInd.elimina(id);
    carica();
  }

  const oggi = startOfToday();
  const future = lista.filter(
    (i) =>
      isAfter(new Date(i.data), oggi) ||
      format(new Date(i.data), "yyyy-MM-dd") === format(oggi, "yyyy-MM-dd"),
  );
  const passate = lista.filter((i) => !future.find((f) => f.id === i.id));

  if (loading)
    return (
      <div style={{ padding: 32, color: "var(--grigio)" }}>Caricamento...</div>
    );

  return (
    <div
      className="cm-page" style={{ padding: 32, background: "var(--bianco)", minHeight: "100vh" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "var(--inchiostro)",
              margin: 0,
            }}
          >
            Indisponibilità
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--grigio)", margin: "4px 0 0" }}
          >
            {future.length} indisponibilità future
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select
            value={filtroOperatore}
            onChange={(e) =>
              setFiltroOperatore(e.target.value ? parseInt(e.target.value) : "")
            }
            style={selectStyle}
          >
            <option value="">Tutti gli operatori</option>
            {operatori.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
          <button onClick={() => setMostraForm(true)} style={btnPrimarioStyle}>
            + Aggiungi
          </button>
        </div>
      </div>

      {/* Form */}
      {mostraForm && (
        <div
          style={{
            border: "1px solid var(--bordo)",
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
            background: "var(--sabbia)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--inchiostro)",
              marginBottom: 16,
            }}
          >
            Nuova indisponibilità
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <label style={labelStyle}>Operatore</label>
              <select
                value={form.operatoreId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    operatoreId: parseInt(e.target.value),
                  }))
                }
                style={inputStyle}
              >
                {operatori.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Motivo</label>
              <select
                value={form.motivo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, motivo: e.target.value }))
                }
                style={inputStyle}
              >
                {MOTIVI.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setMostraForm(false)}
                style={btnSecondarioStyle}
              >
                Annulla
              </button>
              <button
                onClick={aggiungi}
                disabled={salvando}
                style={btnPrimarioStyle}
              >
                {salvando ? "..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risultato ricalcolo */}
      {ricalcolando && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            marginBottom: 20,
            background: "var(--terra-light)",
            border: "1px solid var(--terra)44",
            fontSize: 13,
            color: "var(--terra-dark)",
          }}
        >
          Ricalcolo in corso...
        </div>
      )}

      {risultatoRicalcolo && risultatoRicalcolo.riassegnati && (
        <div
          style={{
            border: "1px solid var(--bordo)",
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
            background: "var(--bianco)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--inchiostro)",
              }}
            >
              Risultato ricalcolo
            </div>
            <button
              onClick={() => setRisultatoRicalcolo(null)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "var(--grigio)",
                fontSize: 18,
              }}
            >
              ✕
            </button>
          </div>
          {risultatoRicalcolo.riassegnati.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--salvia-dark)",
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                ✓ {risultatoRicalcolo.riassegnati.length} interventi riassegnati
              </div>
              {risultatoRicalcolo.riassegnati.map((r: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    fontSize: 13,
                    padding: "7px 12px",
                    borderRadius: 8,
                    background: "var(--salvia-light)",
                    marginBottom: 4,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {r.utente} — {r.servizio}
                  </span>
                  <span
                    style={{ fontWeight: 500, color: "var(--salvia-dark)" }}
                  >
                    → {r.nuovoOperatore}
                  </span>
                </div>
              ))}
            </div>
          )}
          {risultatoRicalcolo.nonCoperti &&
            risultatoRicalcolo.nonCoperti.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#A02020",
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                >
                  ⚠ {risultatoRicalcolo.nonCoperti.length} interventi senza
                  copertura
                </div>
                {risultatoRicalcolo.nonCoperti.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 13,
                      padding: "7px 12px",
                      borderRadius: 8,
                      background: "#FCEAEA",
                      marginBottom: 4,
                    }}
                  >
                    {r.utente} — {r.servizio}
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Future */}
      {future.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--grigio)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Prossime indisponibilità
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {future.map((i) => (
              <RigaInd
                key={i.id}
                i={i}
                onElimina={elimina}
                onRicalcola={ricalcolaManuale}
              />
            ))}
          </div>
        </div>
      )}

      {future.length === 0 && !mostraForm && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "var(--grigio)",
            fontSize: 14,
          }}
        >
          Nessuna indisponibilità futura
        </div>
      )}

      {/* Storico */}
      {passate.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--grigio)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Storico
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              opacity: 0.5,
            }}
          >
            {passate.slice(0, 10).map((i) => (
              <RigaInd key={i.id} i={i} onElimina={elimina} storico />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RigaInd({
  i,
  onElimina,
  onRicalcola,
  storico,
}: {
  i: Indisponibilita;
  onElimina: (id: number) => void;
  onRicalcola?: (opId: number, data: string) => void;
  storico?: boolean;
}) {
  const stile = MOTIVO_STYLE[i.motivo ?? "altro"] ?? MOTIVO_STYLE.altro;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 18px",
        borderRadius: 12,
        border: "1px solid var(--bordo)",
        background: "var(--bianco)",
      }}
    >
      <span
        style={{
          ...stile,
          padding: "3px 12px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {i.motivo ?? "altro"}
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{ fontSize: 13, fontWeight: 500, color: "var(--inchiostro)" }}
        >
          {i.operatore.nome}
        </div>
        <div style={{ fontSize: 11, color: "var(--grigio)", marginTop: 1 }}>
          {i.operatore.qualifica}
        </div>
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--inchiostro-light)",
          whiteSpace: "nowrap",
        }}
      >
        {format(new Date(i.data), "EEE d MMM yyyy", { locale: it })}
      </div>
      {!storico && onRicalcola && (
        <button
          onClick={() =>
            onRicalcola(i.operatore.id, format(new Date(i.data), "yyyy-MM-dd"))
          }
          style={btnSecondarioStyle}
        >
          Ricalcola
        </button>
      )}
      {!storico && (
        <button
          onClick={() => onElimina(i.id)}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "var(--grigio)",
            fontSize: 16,
            padding: "0 4px",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--grigio)",
  marginBottom: 4,
  fontWeight: 500,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--bordo)",
  borderRadius: 8,
  fontSize: 13,
  boxSizing: "border-box" as const,
  outline: "none",
  background: "var(--bianco)",
};
const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid var(--bordo)",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  background: "var(--bianco)",
  color: "var(--inchiostro)",
};
const btnPrimarioStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 10,
  border: "none",
  background: "var(--terra)",
  color: "var(--bianco)",
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 500,
};
const btnSecondarioStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--bordo)",
  background: "var(--bianco)",
  color: "var(--inchiostro-light)",
  fontSize: 12,
  cursor: "pointer",
};
