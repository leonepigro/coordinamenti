import { useEffect, useState } from "react";
import { briefing as briefingApi } from "../api/client";
import type { Pagina } from "../App";

interface InterventoScoperto {
  id: number;
  utente: string;
  servizio: string;
  turno: string;
  durata: number;
}

interface BriefingData {
  data: string;
  interventiOggi: number;
  indisponibili: { nome: string; motivo: string }[];
  interventiScoperti: InterventoScoperto[];
  operatoriAttivi: number;
  utentiAttivi: number;
  interventiSettimana: number;
  sovraccarichi: { nome: string; oreUsate: string; oreMax: number }[];
}

interface Candidato {
  id: number;
  nome: string;
  qualifica: string;
  inEquipe: boolean;
  interventiOggi: number;
}

export default function Dashboard({
  onNavigate,
}: {
  onNavigate?: (p: Pagina) => void;
}) {
  const [dati, setDati] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selezionato, setSelezionato] = useState<InterventoScoperto | null>(
    null,
  );
  const [candidati, setCandidati] = useState<Candidato[]>([]);
  const [loadingCandidati, setLoadingCandidati] = useState(false);
  const [assegnando, setAssegnando] = useState<number | null>(null);

  async function caricaDati() {
    setLoading(true);
    try {
      const res = await briefingApi.get();
      setDati(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    caricaDati();
  }, []);

  async function apriAssegna(i: InterventoScoperto) {
    setSelezionato(i);
    setLoadingCandidati(true);
    setCandidati([]);
    try {
      const res = await briefingApi.candidati(i.id);
      setCandidati(res.data.candidati);
    } finally {
      setLoadingCandidati(false);
    }
  }

  async function assegna(operatoreId: number) {
    if (!selezionato) return;
    setAssegnando(operatoreId);
    try {
      await briefingApi.assegna(selezionato.id, operatoreId);
      setSelezionato(null);
      await caricaDati();
    } finally {
      setAssegnando(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--grigio)", fontSize: 13 }}>
        Caricamento...
      </div>
    );
  }

  if (!dati) return null;

  const haProblemi =
    dati.interventiScoperti.length > 0 || dati.indisponibili.length > 0;

  return (
    <div style={{ padding: 32, maxWidth: 860 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--terra)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Coordinamenti
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 300,
              color: "var(--inchiostro)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Situazione del giorno
          </h1>
          <div
            style={{ fontSize: 13, color: "var(--grigio)", marginTop: 4 }}
          >
            {dati.data}
          </div>
        </div>
        <button
          onClick={caricaDati}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--bordo)",
            background: "transparent",
            color: "var(--grigio)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Aggiorna
        </button>
      </div>

      {/* Interventi scoperti */}
      {dati.interventiScoperti.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#c94040",
              }}
            />
            <span
              style={{ fontSize: 13, fontWeight: 500, color: "#c94040" }}
            >
              {dati.interventiScoperti.length === 1
                ? "1 intervento senza operatore"
                : `${dati.interventiScoperti.length} interventi senza operatore`}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dati.interventiScoperti.map((i) => (
              <div
                key={i.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #f5c6c6",
                  background: "#fff8f8",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--inchiostro)",
                    }}
                  >
                    {i.utente}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--grigio)",
                      marginTop: 2,
                    }}
                  >
                    {i.servizio} · {i.turno} · {i.durata} min
                  </div>
                </div>
                <button
                  onClick={() => apriAssegna(i)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 7,
                    border: "none",
                    background: "var(--terra)",
                    color: "var(--bianco)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Assegna
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operatori assenti */}
      {dati.indisponibili.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--grigio)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Operatori assenti oggi
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {dati.indisponibili.map((op, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--bordo)",
                  background: "var(--sabbia)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--inchiostro)",
                  }}
                >
                  {op.nome}
                </div>
                {op.motivo && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--grigio)",
                      marginTop: 1,
                    }}
                  >
                    {op.motivo}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tutto ok */}
      {!haProblemi && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 10,
            border: "1px solid #b8e0b8",
            background: "#f4fbf4",
            marginBottom: 28,
            fontSize: 13,
            color: "#2d6e2d",
          }}
        >
          Tutti gli interventi di oggi hanno un operatore assegnato.
        </div>
      )}

      {/* Sovraccarichi */}
      {dati.sovraccarichi.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--grigio)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Sovraccarichi questa settimana
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {dati.sovraccarichi.map((s, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #f0d8a0",
                  background: "#fffbf0",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--inchiostro)",
                  }}
                >
                  {s.nome}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9a6200",
                    marginTop: 1,
                  }}
                >
                  {s.oreUsate} / {s.oreMax} ore
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiche */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {[
          { label: "Interventi oggi", valore: dati.interventiOggi },
          { label: "Interventi settimana", valore: dati.interventiSettimana },
          { label: "Operatori attivi", valore: dati.operatoriAttivi },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "16px 18px",
              borderRadius: 10,
              border: "1px solid var(--bordo)",
              background: "var(--sabbia)",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 300,
                color: "var(--inchiostro)",
              }}
            >
              {s.valore}
            </div>
            <div style={{ fontSize: 11, color: "var(--grigio)", marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Modal assegna */}
      {selezionato && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelezionato(null)}
        >
          <div
            style={{
              background: "var(--bianco)",
              borderRadius: 14,
              padding: 24,
              width: 420,
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 8px 40px rgba(0,0,0,0.16)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--inchiostro)",
                  }}
                >
                  Assegna operatore
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--grigio)",
                    marginTop: 3,
                  }}
                >
                  {selezionato.utente} · {selezionato.servizio} ·{" "}
                  {selezionato.turno}
                </div>
              </div>
              <button
                onClick={() => setSelezionato(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  color: "var(--grigio)",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            </div>

            {loadingCandidati ? (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--grigio)",
                }}
              >
                Ricerca candidati...
              </div>
            ) : candidati.length === 0 ? (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--grigio)",
                }}
              >
                Nessun operatore disponibile con le skill richieste.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {candidati.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: c.inEquipe
                        ? "1px solid var(--terra)"
                        : "1px solid var(--bordo)",
                      background: c.inEquipe ? "#fdf6f0" : "var(--sabbia)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--inchiostro)",
                          }}
                        >
                          {c.nome}
                        </span>
                        {c.inEquipe && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: "var(--terra)",
                              color: "var(--bianco)",
                              fontWeight: 500,
                            }}
                          >
                            equipe
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--grigio)",
                          marginTop: 2,
                        }}
                      >
                        {c.qualifica} ·{" "}
                        {c.interventiOggi === 0
                          ? "nessun intervento oggi"
                          : `${c.interventiOggi} ${c.interventiOggi === 1 ? "intervento" : "interventi"} oggi`}
                      </div>
                    </div>
                    <button
                      onClick={() => assegna(c.id)}
                      disabled={assegnando !== null}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 6,
                        border: "none",
                        background:
                          assegnando === c.id
                            ? "var(--bordo)"
                            : "var(--terra)",
                        color:
                          assegnando === c.id
                            ? "var(--grigio)"
                            : "var(--bianco)",
                        fontSize: 12,
                        cursor: assegnando !== null ? "default" : "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {assegnando === c.id ? "..." : "Assegna"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
