import { useState, useEffect } from "react";
import { operatori as apiOperatori } from "../api/client";
import ModalOperatore from "./ModalOperatore";
import ModalArchivia from "./ModalArchivia";
import ImportExcel from "./ImportExcel";
import SkeletonCard from "./SkeletonCard";

interface Skill { skill: { nome: string } }
interface Operatore {
  id: number; nome: string; qualifica: string; oreSettimanali: number;
  preferenzaTurno: string | null; telefono: string | null; indirizzo: string | null;
  mezzoTrasporto: string | null; lat: number | null; lon: number | null;
  attivo: boolean; skills: Skill[];
}

const QUALIFICA_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  OSS: { bg: "#F2E8E0", color: "#8B4E33", border: "#C4714A" },
  Infermiere: { bg: "#EBF2EC", color: "#4E7052", border: "#7A9E7E" },
  Fisioterapista: { bg: "#E8EEF5", color: "#3A5A7A", border: "#6A8FAF" },
  ASA: { bg: "#EEE8F5", color: "#5A3A7A", border: "#8F6AAF" },
};

const MEZZO_LABEL: Record<string, string> = { driving: "🚗 Auto", cycling: "🚲 Bici", foot: "🚶 Piedi" };
const PER_PAGINA = 15;

export default function Operatori() {
  const [lista, setLista] = useState<Operatore[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAperto, setModalAperto] = useState(false);
  const [selezionato, setSelezionato] = useState<any>(null);
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [mostraImport, setMostraImport] = useState(false);
  const [archiviaTarget, setArchiviaTarget] = useState<Operatore | null>(null);
  const [mostraArchiviati, setMostraArchiviati] = useState(false);
  const [listaArchiviati, setListaArchiviati] = useState<any[]>([]);

  async function carica() {
    const res = await apiOperatori.lista();
    setLista(res.data);
    setLoading(false);
  }

  async function caricaArchiviati() {
    const res = await apiOperatori.archiviati();
    setListaArchiviati(res.data);
  }

  useEffect(() => { carica(); }, []);
  useEffect(() => { if (mostraArchiviati) caricaArchiviati(); }, [mostraArchiviati]);

  function apriNuovo() { setSelezionato(null); setModalAperto(true); }
  function apriModifica(op: any) { setSelezionato(op); setModalAperto(true); }

  async function archivia(motivo: string) {
    if (!archiviaTarget) return;
    await apiOperatori.archivia(archiviaTarget.id, motivo);
    setArchiviaTarget(null);
    carica();
  }

  async function ripristina(id: number) {
    await apiOperatori.ripristina(id);
    caricaArchiviati();
  }

  const listaFiltrata = lista.filter(
    (op) => op.nome.toLowerCase().includes(filtro.toLowerCase()) || op.qualifica.toLowerCase().includes(filtro.toLowerCase()),
  );
  const totalePagine = Math.ceil(listaFiltrata.length / PER_PAGINA);
  const listaPaginata = listaFiltrata.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA);

  if (loading) return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} height={160} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="cm-page" style={{ padding: 32, background: "var(--bianco)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--inchiostro)", margin: 0 }}>Operatori</h1>
          <p style={{ fontSize: 13, color: "var(--grigio)", margin: "4px 0 0" }}>
            {listaFiltrata.length === lista.length ? `${lista.length} operatori attivi` : `${listaFiltrata.length} di ${lista.length} operatori`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setMostraImport(true)} style={btnSecondarioStyle}>↑ Importa Excel</button>
          <button onClick={apriNuovo} style={btnPrimarioStyle}>+ Nuovo operatore</button>
        </div>
      </div>

      {/* Tab Attivi / Archiviati */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--bordo)" }}>
        {(["attivi", "archiviati"] as const).map((tab) => {
          const attivo = (tab === "archiviati") === mostraArchiviati;
          return (
            <button key={tab} onClick={() => setMostraArchiviati(tab === "archiviati")} style={{ padding: "7px 16px", fontSize: 13, border: "none", background: "none", cursor: "pointer", color: attivo ? "var(--terra)" : "var(--grigio)", fontWeight: attivo ? 600 : 400, borderBottom: attivo ? "2px solid var(--terra)" : "2px solid transparent", marginBottom: -1 }}>
              {tab === "attivi" ? "Attivi" : "Archiviati"}
            </button>
          );
        })}
      </div>

      {/* Vista archiviati */}
      {mostraArchiviati && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {listaArchiviati.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--grigio)", textAlign: "center", padding: "48px 0" }}>Nessun operatore archiviato</div>
          ) : listaArchiviati.map((op: any) => (
            <div key={op.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--bordo)", background: "var(--sabbia)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--inchiostro)" }}>{op.nome}</div>
                <div style={{ fontSize: 12, color: "var(--grigio)", marginTop: 2 }}>
                  {op.qualifica} · {op.motivoArchiviazione ?? "motivo non specificato"}
                  {op.dataArchiviazione && ` · ${new Date(op.dataArchiviazione).toLocaleDateString("it-IT")}`}
                </div>
              </div>
              <button onClick={() => ripristina(op.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--bordo)", background: "var(--bianco)", fontSize: 12, cursor: "pointer", color: "var(--inchiostro-light)" }}>
                Ripristina
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Vista attivi */}
      {!mostraArchiviati && (
        <>
          {/* Ricerca */}
          <div style={{ marginBottom: 20 }}>
            <input
              value={filtro}
              onChange={(e) => { setFiltro(e.target.value); setPagina(1); }}
              placeholder="Cerca per nome o qualifica..."
              style={{ width: "100%", maxWidth: 320, padding: "9px 14px", border: "1px solid var(--bordo)", borderRadius: 10, fontSize: 13, outline: "none", background: "var(--bianco)", color: "var(--inchiostro)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--terra)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--bordo)")}
            />
          </div>

          {/* Griglia */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
            {listaPaginata.map((op) => {
              const stile = QUALIFICA_STYLE[op.qualifica] ?? { bg: "var(--sabbia)", color: "var(--grigio)", border: "var(--bordo)" };
              const iniziali = op.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={op.id} style={{ border: "1px solid var(--bordo)", borderRadius: 14, padding: 20, background: "var(--bianco)", transition: "box-shadow 0.15s, border-color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terra)"; e.currentTarget.style.boxShadow = "var(--shadow-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bordo)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: stile.bg, color: stile.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, flexShrink: 0, border: `1px solid ${stile.border}33` }}>
                        {iniziali}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 15, color: "var(--inchiostro)" }}>{op.nome}</div>
                        <div style={{ fontSize: 12, color: "var(--grigio)", marginTop: 2 }}>{op.telefono ?? "—"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => apriModifica(op)} style={btnIconStyle} title="Modifica">✎</button>
                      <button onClick={() => setArchiviaTarget(op)} style={{ ...btnIconStyle, color: "#A0522D" }} title="Archivia">✕</button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: stile.bg, color: stile.color, border: `1px solid ${stile.border}44`, fontWeight: 500 }}>{op.qualifica}</span>
                    {op.skills.map((s) => (
                      <span key={s.skill.nome} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--sabbia)", color: "var(--inchiostro-light)", border: "1px solid var(--bordo)" }}>{s.skill.nome}</span>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--grigio)", paddingTop: 12, borderTop: "1px solid var(--sabbia)", display: "flex", flexDirection: "column", gap: 6 }}>
                    {op.indirizzo && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--inchiostro)", opacity: 0.6 }}>📍 {op.indirizzo}</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, fontWeight: 500, background: op.lat ? "#ECFDF5" : "#FFF7ED", color: op.lat ? "#16a34a" : "#ea580c", border: `1px solid ${op.lat ? "#86efac" : "#fdba74"}`, whiteSpace: "nowrap" }}>
                          {op.lat ? "geo ✓" : "no geo"}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 14 }}>
                      <span>⏱ {op.oreSettimanali}h/sett.</span>
                      {op.preferenzaTurno && <span>☀ {op.preferenzaTurno}</span>}
                      {op.mezzoTrasporto && <span>{MEZZO_LABEL[op.mezzoTrasporto] ?? op.mezzoTrasporto}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {listaFiltrata.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--grigio)", fontSize: 14 }}>Nessun operatore trovato</div>
          )}

          {totalePagine > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 24 }}>
              <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} style={{ ...btnSecondarioStyle, opacity: pagina === 1 ? 0.4 : 1 }}>← Precedente</button>
              <span style={{ fontSize: 13, color: "var(--grigio)" }}>Pagina {pagina} di {totalePagine} · {listaFiltrata.length} operatori</span>
              <button onClick={() => setPagina((p) => Math.min(totalePagine, p + 1))} disabled={pagina === totalePagine} style={{ ...btnSecondarioStyle, opacity: pagina === totalePagine ? 0.4 : 1 }}>Successiva →</button>
            </div>
          )}
        </>
      )}

      {/* Modali */}
      {modalAperto && <ModalOperatore operatore={selezionato} onClose={() => setModalAperto(false)} onSalvato={carica} />}
      {mostraImport && <ImportExcel tipo="operatori" onChiudi={() => setMostraImport(false)} onImportato={carica} />}
      {archiviaTarget && (
        <ModalArchivia
          nome={archiviaTarget.nome}
          tipo="operatore"
          onConferma={archivia}
          onClose={() => setArchiviaTarget(null)}
        />
      )}
    </div>
  );
}

const btnPrimarioStyle: React.CSSProperties = { padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--terra)", color: "var(--bianco)", fontSize: 13, cursor: "pointer", fontWeight: 500 };
const btnIconStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: "1px solid var(--bordo)", background: "var(--bianco)", cursor: "pointer", fontSize: 14, color: "var(--grigio)", display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties;
const btnSecondarioStyle: React.CSSProperties = { padding: "9px 14px", borderRadius: 10, border: "1px solid var(--bordo)", background: "var(--bianco)", color: "var(--inchiostro-light)", fontSize: 13, cursor: "pointer" };
