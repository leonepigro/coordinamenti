import { useState, useEffect } from "react";
import { tipiServizio as apiTipi, skill as apiSkill } from "../api/client";

interface Skill {
  id: number;
  nome: string;
}
interface TipoServizio {
  id: number;
  nome: string;
  durata: number;
  descrizione: string | null;
  skills: { skill: { id: number; nome: string } }[];
}

export default function TipiServizio() {
  const [lista, setLista] = useState<TipoServizio[]>([]);
  const [skillDisponibili, setSkillDisponibili] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [inModifica, setInModifica] = useState<TipoServizio | null>(null);
  const [form, setForm] = useState({
    nome: "",
    durata: 60,
    descrizione: "",
    skillIds: [] as number[],
  });
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  async function carica() {
    const [resTipi, resSkill] = await Promise.all([
      apiTipi.lista(),
      apiSkill.lista(),
    ]);
    setLista(resTipi.data);
    setSkillDisponibili(resSkill.data);
    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, []);

  function apriNuovo() {
    setInModifica(null);
    setForm({ nome: "", durata: 60, descrizione: "", skillIds: [] });
    setErrore("");
    setMostraForm(true);
  }

  function apriModifica(t: TipoServizio) {
    setInModifica(t);
    setForm({
      nome: t.nome,
      durata: t.durata,
      descrizione: t.descrizione ?? "",
      skillIds: (t.skills ?? []).map((s) => s.skill.id),
    });
    setErrore("");
    setMostraForm(true);
  }

  function toggleSkill(id: number) {
    setForm((f) => ({
      ...f,
      skillIds: f.skillIds.includes(id)
        ? f.skillIds.filter((s) => s !== id)
        : [...f.skillIds, id],
    }));
  }

  async function salva() {
    if (!form.nome.trim()) {
      setErrore("Il nome è obbligatorio");
      return;
    }
    if (form.durata <= 0) {
      setErrore("La durata deve essere maggiore di 0");
      return;
    }
    setSalvando(true);
    setErrore("");
    try {
      if (inModifica) await apiTipi.aggiorna(inModifica.id, form);
      else await apiTipi.crea(form);
      setMostraForm(false);
      carica();
    } catch {
      setErrore("Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  }

  async function elimina(id: number) {
    if (!confirm("Eliminare questo tipo servizio?")) return;
    try {
      await apiTipi.elimina(id);
      carica();
    } catch {
      alert("Impossibile eliminare");
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
            Tipi servizio
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--grigio)", margin: "4px 0 0" }}
          >
            {lista.length} servizi configurati
          </p>
        </div>
        <button onClick={apriNuovo} style={btnPrimarioStyle}>
          + Nuovo servizio
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
            {inModifica ? "Modifica servizio" : "Nuovo tipo servizio"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
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
                placeholder="Es. Igiene personale"
              />
            </div>
            <div>
              <label style={labelStyle}>Durata (minuti) *</label>
              <input
                type="number"
                value={form.durata}
                onChange={(e) =>
                  setForm((f) => ({ ...f, durata: parseInt(e.target.value) }))
                }
                style={inputStyle}
                min={5}
                step={5}
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
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
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Skill richieste</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {skillDisponibili.map((s) => {
                const attiva = form.skillIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSkill(s.id)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      cursor: "pointer",
                      border: attiva ? "none" : "1px solid var(--bordo)",
                      background: attiva ? "var(--terra)" : "var(--bianco)",
                      color: attiva
                        ? "var(--bianco)"
                        : "var(--inchiostro-light)",
                      fontWeight: attiva ? 500 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {s.nome}
                  </button>
                );
              })}
              {skillDisponibili.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--grigio)" }}>
                  Nessuna skill — aggiungile dalla sezione Skill
                </span>
              )}
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
            Nessun tipo servizio — clicca "+ Nuovo servizio"
          </div>
        )}
        {lista.map((t) => (
          <div
            key={t.id}
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
                width: 44,
                height: 44,
                borderRadius: 12,
                flexShrink: 0,
                background: "var(--salvia-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--salvia-dark)",
                border: "1px solid var(--salvia-dark)22",
              }}
            >
              {t.durata}m
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--inchiostro)",
                }}
              >
                {t.nome}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 5,
                  flexWrap: "wrap",
                }}
              >
                {(t.skills ?? []).map((s) => (
                  <span
                    key={s.skill.id}
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "var(--sabbia)",
                      color: "var(--inchiostro-light)",
                      border: "1px solid var(--bordo)",
                    }}
                  >
                    {s.skill.nome}
                  </span>
                ))}
                {(t.skills ?? []).length === 0 && (
                  <span style={{ fontSize: 11, color: "var(--grigio)" }}>
                    Nessuna skill richiesta
                  </span>
                )}
              </div>
              {t.descrizione && (
                <div
                  style={{ fontSize: 12, color: "var(--grigio)", marginTop: 3 }}
                >
                  {t.descrizione}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => apriModifica(t)}
                style={btnSecondarioStyle}
              >
                Modifica
              </button>
              <button
                onClick={() => elimina(t.id)}
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
