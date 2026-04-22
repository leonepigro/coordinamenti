import { useState, useEffect } from "react";
import { equipe as apiEquipe } from "../api/client";
import ModalEquipe from "./ModalEquipe";

interface Membro {
  operatoreId: number;
  ruolo: string | null;
  operatore: { nome: string; qualifica: string };
}

interface Equipe {
  id: number;
  nome: string | null;
  utente: { id: number; nome: string; indirizzo: string };
  membri: Membro[];
}

const RUOLO_STYLE: Record<string, { bg: string; color: string }> = {
  principale: { bg: "var(--salvia-light)", color: "var(--salvia-dark)" },
  backup:     { bg: "var(--terra-light)",  color: "var(--terra-dark)"  },
  alternato:  { bg: "#E8EEF5",             color: "#3A5A7A"            },
  igiene:     { bg: "#EEE8F5",             color: "#5A3A7A"            },
  farmaci:    { bg: "#F5EDE8",             color: "#7A4A3A"            },
};

const QUALIFICA_INITIALS: Record<string, string> = {
  OSS: "OS", Infermiere: "IN", Fisioterapista: "FT", ASA: "AS",
};

export default function Equipe() {
  const [lista, setLista] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAperto, setModalAperto] = useState(false);
  const [selezionata, setSelezionata] = useState<any>(null);
  const [filtro, setFiltro] = useState("");

  async function carica() {
    const res = await apiEquipe.lista();
    setLista(res.data);
    setLoading(false);
  }

  useEffect(() => { carica(); }, []);

  function apriNuova() { setSelezionata(null); setModalAperto(true); }
  function apriModifica(e: Equipe) { setSelezionata(e); setModalAperto(true); }

  async function elimina(id: number) {
    if (!confirm("Eliminare questa equipe?")) return;
    await apiEquipe.elimina(id);
    carica();
  }

  const listaFiltrata = lista.filter(e =>
    (e.nome ?? "").toLowerCase().includes(filtro.toLowerCase()) ||
    e.utente.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading) return (
    <div style={{ padding: 32, color: "var(--grigio)", fontSize: 14 }}>Caricamento...</div>
  );

  return (
    <div style={{ padding: 32, background: "var(--bianco)", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--inchiostro)", margin: 0 }}>Equipe</h1>
          <p style={{ fontSize: 13, color: "var(--grigio)", margin: "4px 0 0" }}>{lista.length} equipe attive</p>
        </div>
        <button onClick={apriNuova} style={btnPrimarioStyle}>+ Nuova equipe</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input value={filtro} onChange={e => setFiltro(e.target.value)}
          placeholder="Cerca per utente o nome equipe..."
          style={searchStyle}
          onFocus={e => e.target.style.borderColor = "var(--terra)"}
          onBlur={e => e.target.style.borderColor = "var(--bordo)"} />
      </div>

      {listaFiltrata.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--grigio)", fontSize: 14 }}>
          Nessuna equipe — clicca "+ Nuova equipe"
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {listaFiltrata.map(eq => (
          <div key={eq.id} style={{
            border: "1px solid var(--bordo)", borderRadius: 14,
            padding: 20, background: "var(--bianco)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--terra)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(196,113,74,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bordo)"; e.currentTarget.style.boxShadow = "none"; }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 15, color: "var(--inchiostro)" }}>
                  {eq.nome ?? `Equipe ${eq.utente.nome.split(" ").slice(-1)[0]}`}
                </div>
                <div style={{ fontSize: 12, color: "var(--terra)", marginTop: 3, fontWeight: 500 }}>
                  {eq.utente.nome}
                </div>
                <div style={{ fontSize: 11, color: "var(--grigio)", marginTop: 2 }}>
                  📍 {eq.utente.indirizzo}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => apriModifica(eq)} style={btnIconStyle} title="Modifica">✎</button>
                <button onClick={() => elimina(eq.id)} style={{ ...btnIconStyle, color: "#A0522D" }} title="Elimina">✕</button>
              </div>
            </div>

            {/* Separatore */}
            <div style={{ height: 1, background: "var(--bordo)", marginBottom: 14 }} />

            {/* Membri */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {eq.membri.map(m => {
                const ruoloStyle = RUOLO_STYLE[m.ruolo ?? ""] ?? { bg: "var(--sabbia)", color: "var(--grigio)" };
                const iniziali = QUALIFICA_INITIALS[m.operatore.qualifica] ?? m.operatore.qualifica.slice(0, 2).toUpperCase();
                return (
                  <div key={m.operatoreId} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 10,
                    background: "var(--sabbia)", border: "1px solid var(--bordo)",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: "var(--bianco)", border: "1px solid var(--bordo)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 600, color: "var(--inchiostro-light)",
                    }}>
                      {iniziali}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--inchiostro)" }}>
                        {m.operatore.nome}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--grigio)" }}>{m.operatore.qualifica}</div>
                    </div>
                    {m.ruolo && (
                      <span style={{
                        ...ruoloStyle, fontSize: 11, padding: "3px 10px",
                        borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap",
                      }}>
                        {m.ruolo}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {modalAperto && (
        <ModalEquipe equipe={selezionata} onClose={() => setModalAperto(false)} onSalvato={carica} />
      )}
    </div>
  );
}

const btnPrimarioStyle: React.CSSProperties = { padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--terra)", color: "var(--bianco)", fontSize: 13, cursor: "pointer", fontWeight: 500 };
const btnIconStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: "1px solid var(--bordo)", background: "var(--bianco)", cursor: "pointer", fontSize: 14, color: "var(--grigio)", display: "flex" as const, alignItems: "center", justifyContent: "center" };
const searchStyle: React.CSSProperties = { width: "100%", maxWidth: 320, padding: "9px 14px", border: "1px solid var(--bordo)", borderRadius: 10, fontSize: 13, outline: "none", background: "var(--bianco)", color: "var(--inchiostro)", transition: "border-color 0.15s" };