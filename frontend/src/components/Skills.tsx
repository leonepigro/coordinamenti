import { useState, useEffect } from "react";
import { skill as apiSkill } from "../api/client";

interface Skill {
  id: number;
  nome: string;
  descrizione: string | null;
}

export default function Skill() {
  const [lista, setLista] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [modifica, setModifica] = useState<Skill | null>(null);
  const [form, setForm] = useState({ nome: "", descrizione: "" });
  const [mostraForm, setMostraForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  async function carica() {
    const res = await apiSkill.lista();
    setLista(res.data);
    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, []);

  function apriNuova() {
    setModifica(null);
    setForm({ nome: "", descrizione: "" });
    setErrore("");
    setMostraForm(true);
  }
  function apriModifica(s: Skill) {
    setModifica(s);
    setForm({ nome: s.nome, descrizione: s.descrizione ?? "" });
    setErrore("");
    setMostraForm(true);
  }

  async function salva() {
    if (!form.nome.trim()) {
      setErrore("Il nome è obbligatorio");
      return;
    }
    setSalvando(true);
    setErrore("");
    try {
      if (modifica) await apiSkill.aggiorna(modifica.id, form);
      else await apiSkill.crea(form);
      setMostraForm(false);
      carica();
    } catch {
      setErrore("Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  }

  async function elimina(id: number) {
    if (!confirm("Eliminare questa skill?")) return;
    try {
      await apiSkill.elimina(id);
      carica();
    } catch {
      alert("Impossibile eliminare — la skill è usata da operatori o servizi");
    }
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
            Skill
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--grigio)", margin: "4px 0 0" }}
          >
            {lista.length} skill configurate
          </p>
        </div>
        <button onClick={apriNuova} style={btnPrimarioStyle}>
          + Nuova skill
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
            {modifica ? "Modifica skill" : "Nuova skill"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
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
                placeholder="Es. Patente B"
              />
            </div>
            <div>
              <label style={labelStyle}>Descrizione</label>
              <input
                value={form.descrizione}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descrizione: e.target.value }))
                }
                style={inputStyle}
                placeholder="Breve descrizione..."
              />
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
        {lista.length === 0 && !mostraForm && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              color: "var(--grigio)",
              fontSize: 14,
            }}
          >
            Nessuna skill — clicca "+ Nuova skill"
          </div>
        )}
        {lista.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderRadius: 12,
              border: "1px solid var(--bordo)",
              background: "var(--bianco)",
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
                width: 36,
                height: 36,
                borderRadius: 10,
                flexShrink: 0,
                background: "var(--terra-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "var(--terra-dark)",
              }}
            >
              ◆
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--inchiostro)",
                }}
              >
                {s.nome}
              </div>
              {s.descrizione && (
                <div
                  style={{ fontSize: 12, color: "var(--grigio)", marginTop: 2 }}
                >
                  {s.descrizione}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => apriModifica(s)}
                style={btnSecondarioStyle}
              >
                Modifica
              </button>
              <button
                onClick={() => elimina(s.id)}
                style={{
                  ...btnSecondarioStyle,
                  color: "#A02020",
                  borderColor: "#F0C0C0",
                }}
              >
                Elimina
              </button>
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
