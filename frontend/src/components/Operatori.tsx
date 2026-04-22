import { useState, useEffect } from "react";
import { operatori as apiOperatori } from "../api/client";
import ModalOperatore from "./ModalOperatore";
import ImportExcel from "./ImportExcel";

interface Skill {
  skill: { nome: string };
}
interface Operatore {
  id: number;
  nome: string;
  qualifica: string;
  oreSettimanali: number;
  preferenzaTurno: string | null;
  telefono: string | null;
  mezzoTrasporto: string | null;
  attivo: boolean;
  skills: Skill[];
}

const QUALIFICA_STYLE: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  OSS: { bg: "#F2E8E0", color: "#8B4E33", border: "#C4714A" },
  Infermiere: { bg: "#EBF2EC", color: "#4E7052", border: "#7A9E7E" },
  Fisioterapista: { bg: "#E8EEF5", color: "#3A5A7A", border: "#6A8FAF" },
  ASA: { bg: "#EEE8F5", color: "#5A3A7A", border: "#8F6AAF" },
};

const MEZZO_LABEL: Record<string, string> = {
  driving: "🚗 Auto",
  cycling: "🚲 Bici",
  foot: "🚶 Piedi",
};

export default function Operatori() {
  const [lista, setLista] = useState<Operatore[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAperto, setModalAperto] = useState(false);
  const [selezionato, setSelezionato] = useState<any>(null);
  const [filtro, setFiltro] = useState("");
  const [mostraImport, setMostraImport] = useState(false);

  async function carica() {
    const res = await apiOperatori.lista();
    setLista(res.data);
    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, []);

  function apriNuovo() {
    setSelezionato(null);
    setModalAperto(true);
  }
  function apriModifica(op: any) {
    setSelezionato(op);
    setModalAperto(true);
  }

  async function elimina(id: number) {
    if (!confirm("Disattivare questo operatore?")) return;
    await apiOperatori.elimina(id);
    carica();
  }

  const listaFiltrata = lista.filter(
    (op) =>
      op.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      op.qualifica.toLowerCase().includes(filtro.toLowerCase()),
  );

  if (loading)
    return (
      <div style={{ padding: 32, color: "var(--grigio)", fontSize: 14 }}>
        Caricamento...
      </div>
    );

  return (
    <div
      style={{ padding: 32, background: "var(--bianco)", minHeight: "100vh" }}
    >
      {/* Header */}
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
            Operatori
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--grigio)", margin: "4px 0 0" }}
          >
            {lista.length} operatori attivi
          </p>
        </div>
        <button onClick={apriNuovo} style={btnPrimarioStyle}>
          + Nuovo operatore
        </button>
        <button
          onClick={() => setMostraImport(true)}
          style={btnSecondarioStyle}
        >
          ↑ Importa Excel
        </button>
        ;
      </div>

      {/* Ricerca */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Cerca per nome o qualifica..."
          style={{
            width: "100%",
            maxWidth: 320,
            padding: "9px 14px",
            border: "1px solid var(--bordo)",
            borderRadius: 10,
            fontSize: 13,
            outline: "none",
            background: "var(--bianco)",
            color: "var(--inchiostro)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--terra)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--bordo)")}
        />
      </div>

      {/* Griglia */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 14,
        }}
      >
        {listaFiltrata.map((op) => {
          const stile = QUALIFICA_STYLE[op.qualifica] ?? {
            bg: "var(--sabbia)",
            color: "var(--grigio)",
            border: "var(--bordo)",
          };
          const iniziali = op.nome
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={op.id}
              style={{
                border: "1px solid var(--bordo)",
                borderRadius: 14,
                padding: 20,
                background: "var(--bianco)",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--terra)";
                e.currentTarget.style.boxShadow =
                  "0 2px 12px rgba(196,113,74,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bordo)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Top row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: stile.bg,
                      color: stile.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      fontWeight: 600,
                      flexShrink: 0,
                      border: `1px solid ${stile.border}33`,
                    }}
                  >
                    {iniziali}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 15,
                        color: "var(--inchiostro)",
                      }}
                    >
                      {op.nome}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--grigio)",
                        marginTop: 2,
                      }}
                    >
                      {op.telefono ?? "—"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => apriModifica(op)}
                    style={btnIconStyle}
                    title="Modifica"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => elimina(op.id)}
                    style={{ ...btnIconStyle, color: "#A0522D" }}
                    title="Disattiva"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Badge qualifica + skill */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: stile.bg,
                    color: stile.color,
                    border: `1px solid ${stile.border}44`,
                    fontWeight: 500,
                  }}
                >
                  {op.qualifica}
                </span>
                {op.skills.map((s) => (
                  <span
                    key={s.skill.nome}
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: "var(--sabbia)",
                      color: "var(--inchiostro-light)",
                      border: "1px solid var(--bordo)",
                    }}
                  >
                    {s.skill.nome}
                  </span>
                ))}
              </div>

              {/* Info bottom */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  fontSize: 12,
                  color: "var(--grigio)",
                  paddingTop: 12,
                  borderTop: "1px solid var(--sabbia)",
                }}
              >
                <span>⏱ {op.oreSettimanali}h/sett.</span>
                {op.preferenzaTurno && <span>☀ {op.preferenzaTurno}</span>}
                {op.mezzoTrasporto && (
                  <span>
                    {MEZZO_LABEL[op.mezzoTrasporto] ?? op.mezzoTrasporto}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {listaFiltrata.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "var(--grigio)",
            fontSize: 14,
          }}
        >
          Nessun operatore trovato
        </div>
      )}

      {modalAperto && (
        <ModalOperatore
          operatore={selezionato}
          onClose={() => setModalAperto(false)}
          onSalvato={carica}
        />
      )}
      {mostraImport && (
        <ImportExcel
          tipo="operatori"
          onChiudi={() => setMostraImport(false)}
          onImportato={carica}
        />
      )}
    </div>
  );
}

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
const btnIconStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid var(--bordo)",
  background: "var(--bianco)",
  cursor: "pointer",
  fontSize: 14,
  color: "var(--grigio)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as React.CSSProperties;
const btnSecondarioStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid var(--bordo)",
  background: "var(--bianco)",
  color: "var(--inchiostro-light)",
  fontSize: 13,
  cursor: "pointer",
};
