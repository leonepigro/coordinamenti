import { useState, useEffect } from "react";
import { utenti as apiUtenti } from "../api/client";
import ModalUtente from "./ModalUtente";
import ModalEquipe from "./ModalEquipe";
import ImportExcel from "./ImportExcel";

interface Piano {
  tipoServizio: { nome: string; durata: number };
  giorniSettimana: string;
  oraInizio: string;
}

interface Membro {
  operatoreId: number;
  ruolo: string | null;
  operatore: { nome: string; qualifica: string };
}

interface EquipeUtente {
  id: number;
  nome: string | null;
  membri: Membro[];
}

interface Utente {
  id: number;
  nome: string;
  indirizzo: string;
  oreSettimanali: number;
  note: string | null;
  piani: Piano[];
  equipe: EquipeUtente[];
}

const GIORNI_LABEL: Record<string, string> = {
  "0": "Dom",
  "1": "Lun",
  "2": "Mar",
  "3": "Mer",
  "4": "Gio",
  "5": "Ven",
  "6": "Sab",
};

export default function Utenti() {
  const [lista, setLista] = useState<Utente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUtente, setModalUtente] = useState(false);
  const [modalEquipe, setModalEquipe] = useState(false);
  const [selezionato, setSelezionato] = useState<any>(null);
  const [equipeSelezionata, setEquipeSelezionata] = useState<any>(null);
  const [filtro, setFiltro] = useState("");
  const [espanso, setEspanso] = useState<number | null>(null);
  const [mostraImport, setMostraImport] = useState(false);

  async function carica() {
    const res = await apiUtenti.lista();
    setLista(res.data);
    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, []);

  function apriNuovo() {
    setSelezionato(null);
    setModalUtente(true);
  }
  function apriModifica(u: any) {
    setSelezionato(u);
    setModalUtente(true);
  }
  function apriEquipe(u: any) {
    setEquipeSelezionata({ utenteId: u.id, utente: u });
    setModalEquipe(true);
  }

  async function elimina(id: number) {
    if (!confirm("Disattivare questo utente?")) return;
    await apiUtenti.elimina(id);
    carica();
  }

  const listaFiltrata = lista.filter(
    (u) =>
      u.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      u.indirizzo.toLowerCase().includes(filtro.toLowerCase()),
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
            Utenti
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--grigio)", margin: "4px 0 0" }}
          >
            {lista.length} utenti in carico
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setMostraImport(true)}
            style={btnSecondarioStyle}
          >
            ↑ Importa Excel
          </button>
          <button onClick={apriNuovo} style={btnPrimarioStyle}>
            + Nuovo utente
          </button>
        </div>
      </div>

      {/* Ricerca */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Cerca per nome o indirizzo..."
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

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {listaFiltrata.map((u) => {
          const aperto = espanso === u.id;
          return (
            <div
              key={u.id}
              style={{
                border: "1px solid var(--bordo)",
                borderRadius: 14,
                background: "var(--bianco)",
                overflow: "hidden",
                transition: "border-color 0.15s",
              }}
            >
              {/* Header card */}
              <div
                onClick={() => setEspanso(aperto ? null : u.id)}
                style={{
                  padding: "16px 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: aperto ? "var(--sabbia)" : "var(--bianco)",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: "var(--terra-light)",
                      color: "var(--terra-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {u.nome
                      .split(" ")
                      .filter((n) => n.length > 2)
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 14,
                        color: "var(--inchiostro)",
                      }}
                    >
                      {u.nome}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--grigio)",
                        marginTop: 2,
                      }}
                    >
                      📍 {u.indirizzo}
                    </div>
                    {u.piani.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                          marginTop: 6,
                        }}
                      >
                        {u.piani.map((p, idx) => {
                          const giorni = p.giorniSettimana
                            .split(",")
                            .map((g) => GIORNI_LABEL[g] ?? g)
                            .join(" ");
                          return (
                            <span
                              key={idx}
                              style={{
                                fontSize: 10,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: "var(--sabbia)",
                                color: "var(--inchiostro)",
                                border: "1px solid var(--bordo)",
                                opacity: 0.85,
                              }}
                            >
                              {p.tipoServizio.nome} · {giorni} {p.oraInizio}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: "var(--terra-light)",
                        color: "var(--terra-dark)",
                        border: "1px solid var(--terra)33",
                        fontWeight: 500,
                      }}
                    >
                      {u.oreSettimanali}h/sett.
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--grigio)",
                        marginRight: 4,
                      }}
                    >
                      {aperto ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Azioni */}
                <div
                  style={{ display: "flex", gap: 6, marginLeft: 14 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => apriEquipe(u)} style={btnSmallStyle}>
                    Equipe
                  </button>
                  <button onClick={() => apriModifica(u)} style={btnSmallStyle}>
                    Modifica
                  </button>
                  <button
                    onClick={() => elimina(u.id)}
                    style={{
                      ...btnSmallStyle,
                      color: "#A0522D",
                      borderColor: "#E8C4A8",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Dettaglio espanso */}
              {aperto && (
                <div
                  style={{
                    padding: "0 20px 16px",
                    borderTop: "1px solid var(--bordo)",
                  }}
                >
                  {u.note && (
                    <div
                      style={{
                        margin: "14px 0 10px",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "var(--sabbia)",
                        fontSize: 12,
                        color: "var(--inchiostro-light)",
                        fontStyle: "italic",
                        borderLeft: "3px solid var(--terra)",
                      }}
                    >
                      {u.note}
                    </div>
                  )}

                  {/* Piano assistenziale */}
                  {u.piani.length > 0 && (
                    <div style={{ marginTop: u.note ? 0 : 14 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--grigio)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 8,
                        }}
                      >
                        Piano assistenziale
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {u.piani.map((p, idx) => {
                          const giorni = p.giorniSettimana
                            .split(",")
                            .map((g) => GIORNI_LABEL[g] ?? g)
                            .join(", ");
                          return (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "var(--bianco)",
                                border: "1px solid var(--bordo)",
                                fontSize: 12,
                              }}
                            >
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  background: "var(--salvia-light)",
                                  color: "var(--salvia-dark)",
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {p.tipoServizio.nome}
                              </span>
                              <span
                                style={{ color: "var(--inchiostro-light)" }}
                              >
                                {giorni}
                              </span>
                              <span style={{ color: "var(--grigio)" }}>·</span>
                              <span
                                style={{ color: "var(--inchiostro-light)" }}
                              >
                                {p.oraInizio}
                              </span>
                              <span
                                style={{
                                  color: "var(--grigio)",
                                  marginLeft: "auto",
                                }}
                              >
                                {p.tipoServizio.durata}min
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Equipe */}
                  {u.equipe.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--grigio)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 8,
                        }}
                      >
                        Equipe assegnata
                      </div>
                      {u.equipe.map((eq) => (
                        <div
                          key={eq.id}
                          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                        >
                          {eq.membri.map((m) => (
                            <div
                              key={m.operatoreId}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 8,
                                background: "var(--sabbia)",
                                border: "1px solid var(--bordo)",
                                fontSize: 12,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 500,
                                  color: "var(--inchiostro)",
                                }}
                              >
                                {m.operatore.nome.split(" ")[1] ??
                                  m.operatore.nome}
                              </span>
                              {m.ruolo && (
                                <span style={{ color: "var(--grigio)" }}>
                                  · {m.ruolo}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
          Nessun utente trovato
        </div>
      )}

      {modalUtente && (
        <ModalUtente
          utente={selezionato}
          onClose={() => setModalUtente(false)}
          onSalvato={carica}
        />
      )}
      {modalEquipe && (
        <ModalEquipe
          equipe={equipeSelezionata}
          onClose={() => setModalEquipe(false)}
          onSalvato={carica}
        />
      )}
      {mostraImport && (
        <ImportExcel
          tipo="utenti"
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
const btnSmallStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 8,
  border: "1px solid var(--bordo)",
  background: "var(--bianco)",
  color: "var(--inchiostro-light)",
  fontSize: 12,
  cursor: "pointer",
};
const btnSecondarioStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid var(--bordo)",
  background: "var(--bianco)",
  color: "var(--inchiostro-light)",
  fontSize: 13,
  cursor: "pointer",
};
