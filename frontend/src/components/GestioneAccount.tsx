import { useState, useEffect } from "react";
import { utentiApp, operatori as apiOperatori } from "../api/client";

interface UtenteApp {
  id: number;
  nome: string;
  email: string;
  ruolo: string;
  attivo: boolean;
  operatoreId: number | null;
  operatore?: { nome: string } | null;
}

const RUOLO_STYLE: Record<string, { bg: string; color: string }> = {
  admin: { bg: "var(--terra-light)", color: "var(--terra-dark)" },
  coordinatore: { bg: "var(--salvia-light)", color: "var(--salvia-dark)" },
  operatore: { bg: "#E8EEF5", color: "#3A5A7A" },
};

export default function GestioneAccount() {
  const [lista, setLista] = useState<UtenteApp[]>([]);
  const [operatori, setOperatori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [inModifica, setInModifica] = useState<UtenteApp | null>(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    ruolo: "coordinatore",
    operatoreId: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  async function carica() {
    const [resU, resOp] = await Promise.all([
      utentiApp.lista(),
      apiOperatori.lista(),
    ]);
    setLista(resU.data);
    setOperatori(resOp.data);
    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, []);

  function apriNuovo() {
    setInModifica(null);
    setForm({
      nome: "",
      email: "",
      password: "",
      ruolo: "coordinatore",
      operatoreId: "",
    });
    setErrore("");
    setMostraForm(true);
  }

  function apriModifica(u: UtenteApp) {
    setInModifica(u);
    setForm({
      nome: u.nome,
      email: u.email,
      password: "",
      ruolo: u.ruolo,
      operatoreId: u.operatoreId?.toString() ?? "",
    });
    setErrore("");
    setMostraForm(true);
  }

  async function salva() {
    if (!form.nome.trim() || !form.email.trim()) {
      setErrore("Nome ed email sono obbligatori");
      return;
    }
    if (!inModifica && !form.password.trim()) {
      setErrore("La password è obbligatoria per i nuovi account");
      return;
    }
    setSalvando(true);
    setErrore("");
    try {
      const data = {
        ...form,
        operatoreId: form.operatoreId ? parseInt(form.operatoreId) : null,
      };
      if (inModifica) await utentiApp.aggiorna(inModifica.id, data);
      else await utentiApp.crea(data);
      setMostraForm(false);
      carica();
    } catch (e: any) {
      setErrore(e.response?.data?.errore ?? "Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  }

  async function disattiva(id: number) {
    if (!confirm("Disattivare questo account?")) return;
    await utentiApp.elimina(id);
    carica();
  }

  if (loading)
    return (
      <div style={{ padding: 32, color: "var(--grigio)" }}>Caricamento...</div>
    );

  return (
    <div
      style={{ padding: 32, background: "var(--bianco)", minHeight: "100vh" }}
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
            Account
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--grigio)", margin: "4px 0 0" }}
          >
            {lista.length} account configurati
          </p>
        </div>
        <button onClick={apriNuovo} style={btnPrimarioStyle}>
          + Nuovo account
        </button>
      </div>

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
            {inModifica ? "Modifica account" : "Nuovo account"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Nome *</label>
              <input
                value={form.nome}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nome: e.target.value }))
                }
                style={inputStyle}
                placeholder="Es. Maria Rossi"
              />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                style={inputStyle}
                placeholder="maria@coordinamenti.it"
              />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>
                Password {inModifica ? "(lascia vuoto per non cambiare)" : "*"}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label style={labelStyle}>Ruolo</label>
              <select
                value={form.ruolo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ruolo: e.target.value }))
                }
                style={inputStyle}
              >
                <option value="admin">Admin</option>
                <option value="coordinatore">Coordinatore</option>
                <option value="operatore">Operatore</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Operatore collegato</label>
              <select
                value={form.operatoreId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, operatoreId: e.target.value }))
                }
                style={inputStyle}
              >
                <option value="">Nessuno</option>
                {operatori.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {errore && (
            <div style={{ color: "#A02020", fontSize: 13, marginBottom: 10 }}>
              {errore}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={() => setMostraForm(false)}
              style={btnSecondarioStyle}
            >
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
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista.map((u) => (
          <div
            key={u.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderRadius: 12,
              border: "1px solid var(--bordo)",
              background: "var(--bianco)",
              opacity: u.attivo ? 1 : 0.5,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--terra)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--bordo)")
            }
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                flexShrink: 0,
                background: RUOLO_STYLE[u.ruolo]?.bg ?? "var(--sabbia)",
                color: RUOLO_STYLE[u.ruolo]?.color ?? "var(--grigio)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {u.nome
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--inchiostro)",
                }}
              >
                {u.nome}
              </div>
              <div
                style={{ fontSize: 12, color: "var(--grigio)", marginTop: 2 }}
              >
                {u.email}
              </div>
              {u.operatore && (
                <div
                  style={{ fontSize: 11, color: "var(--grigio)", marginTop: 1 }}
                >
                  → {u.operatore.nome}
                </div>
              )}
            </div>
            <span
              style={{
                ...RUOLO_STYLE[u.ruolo],
                fontSize: 11,
                padding: "3px 12px",
                borderRadius: 20,
                fontWeight: 500,
              }}
            >
              {u.ruolo}
            </span>
            {!u.attivo && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--grigio)",
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "var(--sabbia)",
                }}
              >
                disattivo
              </span>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => apriModifica(u)}
                style={btnSecondarioStyle}
              >
                Modifica
              </button>
              {u.attivo && (
                <button
                  onClick={() => disattiva(u.id)}
                  style={{
                    ...btnSecondarioStyle,
                    color: "#A02020",
                    borderColor: "#F0C0C0",
                  }}
                >
                  Disattiva
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
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
const btnPrimarioStyle: React.CSSProperties = {
  padding: "9px 18px",
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
