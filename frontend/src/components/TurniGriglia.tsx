import { useState, useEffect, useMemo } from "react";
import api, { scheduling, interventi as apiInterventi } from "../api/client";
import {
  format,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { it } from "date-fns/locale";

interface Intervento {
  id: number;
  utente: { nome: string };
  operatore: { id: number; nome: string } | null;
  tipoServizio: { nome: string } | null;
  data: string;
  turno: string;
  durata: number;
  completato: boolean;
}

type Vista = "giorno" | "settimana" | "mese";

const COLORI_OPERATORI = [
  { bg: "#F2E8E0", color: "#8B4E33", border: "#C4714A" },
  { bg: "#EBF2EC", color: "#4E7052", border: "#7A9E7E" },
  { bg: "#E8EEF5", color: "#3A5A7A", border: "#6A8FAF" },
  { bg: "#F5EDE8", color: "#7A4A3A", border: "#AF7A6A" },
  { bg: "#EEE8F5", color: "#5A3A7A", border: "#8F6AAF" },
  { bg: "#E8F5F0", color: "#3A7A6A", border: "#6AAFAF" },
];

function getColoreOperatore(nome: string, mappa: Map<string, number>) {
  if (!mappa.has(nome)) mappa.set(nome, mappa.size % COLORI_OPERATORI.length);
  return COLORI_OPERATORI[mappa.get(nome)!];
}

export default function TurniGriglia() {
  const [vista, setVista] = useState<Vista>("giorno");
  const [dataCorrente, setDataCorrente] = useState(new Date());
  const [interventi, setInterventi] = useState<Intervento[]>([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [cancellando, setCancellando] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [mostraRange, setMostraRange] = useState(false);
  const [rangeInizio, setRangeInizio] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [rangeFine, setRangeFine] = useState(
    format(addDays(new Date(), 6), "yyyy-MM-dd"),
  );
  const [esitoGenerazione, setEsitoGenerazione] = useState<{
    assegnati: number;
    scoperti: number;
  } | null>(null);

  const { dataInizio, dataFine } = useMemo(() => {
    if (vista === "giorno") {
      const d = new Date(
        dataCorrente.getFullYear(),
        dataCorrente.getMonth(),
        dataCorrente.getDate(),
      );
      return { dataInizio: d, dataFine: d };
    }
    if (vista === "settimana") {
      const lun = startOfWeek(dataCorrente, { weekStartsOn: 1 });
      return { dataInizio: lun, dataFine: addDays(lun, 6) };
    }
    return {
      dataInizio: startOfMonth(dataCorrente),
      dataFine: endOfMonth(dataCorrente),
    };
  }, [vista, dataCorrente]);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      try {
        const res = await api.get("/interventi", {
          params: {
            dataInizio: format(dataInizio, "yyyy-MM-dd"),
            dataFine: format(dataFine, "yyyy-MM-dd"),
          },
        });
        if (!cancelled) setInterventi(res.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => {
      cancelled = true;
    };
  }, [dataInizio, dataFine, refresh]);

  function naviga(dir: number) {
    if (vista === "giorno") setDataCorrente((d) => addDays(d, dir));
    else if (vista === "settimana") setDataCorrente((d) => addDays(d, dir * 7));
    else setDataCorrente((d) => (dir > 0 ? addMonths(d, 1) : subMonths(d, 1)));
  }

  async function genera() {
    setGenerando(true);
    try {
      const res = await scheduling.genera(rangeInizio, rangeFine);
      setRefresh((r) => r + 1);
      setMostraRange(false);
      setEsitoGenerazione({ assegnati: res.data.assegnati, scoperti: res.data.scoperti });
    } finally {
      setGenerando(false);
    }
  }

  async function cancellaTurni() {
    const msg = `Cancellare gli interventi non completati dal ${format(dataInizio, "d MMM", { locale: it })} al ${format(dataFine, "d MMM yyyy", { locale: it })}?`;
    if (!confirm(msg)) return;
    setCancellando(true);
    try {
      await apiInterventi.elimina(
        format(dataInizio, "yyyy-MM-dd"),
        format(dataFine, "yyyy-MM-dd"),
      );
      setRefresh((r) => r + 1);
    } finally {
      setCancellando(false);
    }
  }

  function labelNavigazione() {
    if (vista === "giorno")
      return format(dataCorrente, "EEEE d MMMM yyyy", { locale: it });
    if (vista === "settimana")
      return `${format(dataInizio, "d MMM", { locale: it })} – ${format(dataFine, "d MMM yyyy", { locale: it })}`;
    return format(dataCorrente, "MMMM yyyy", { locale: it });
  }

  const coloriMappa = useMemo(() => {
    const m = new Map<string, number>();
    interventi
      .filter((i) => i.operatore)
      .forEach((i) => getColoreOperatore(i.operatore!.nome, m));
    return m;
  }, [interventi]);

  const operatoriUnici = Array.from(
    new Map(
      interventi
        .filter((i) => i.operatore)
        .map((i) => [i.operatore!.nome, i.operatore!.nome]),
    ).values(),
  ).sort();

  return (
    <div
      style={{ padding: 32, background: "var(--bianco)", minHeight: "100vh" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
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
            Turni
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--grigio)",
              margin: "4px 0 0",
              textTransform: "capitalize",
            }}
          >
            {labelNavigazione()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={cancellaTurni}
            disabled={cancellando}
            style={{
              ...btnSecondarioStyle,
              color: "#A0522D",
              borderColor: "#E8C4A8",
            }}
          >
            {cancellando ? "..." : "Cancella"}
          </button>
          <button
            onClick={() => setMostraRange((r) => !r)}
            style={btnPrimarioStyle}
          >
            {generando ? "Generando..." : "Genera turni"}
          </button>
        </div>
      </div>

      {/* Pannello generazione */}
      {mostraRange && (
        <div
          style={{
            border: "1px solid var(--bordo)",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
            background: "var(--sabbia)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--inchiostro)",
              marginBottom: 14,
            }}
          >
            Genera turni per il periodo
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <label style={labelStyle}>Data inizio</label>
              <input
                type="date"
                value={rangeInizio}
                onChange={(e) => setRangeInizio(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Data fine</label>
              <input
                type="date"
                value={rangeFine}
                onChange={(e) => setRangeFine(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setMostraRange(false)}
                style={btnSecondarioStyle}
              >
                Annulla
              </button>
              <button
                onClick={genera}
                disabled={generando}
                style={btnPrimarioStyle}
              >
                {generando ? "Generando..." : "Genera"}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--grigio)", marginTop: 10 }}>
            Gli interventi non completati nel periodo verranno sostituiti.
          </div>
        </div>
      )}

      {/* Esito generazione */}
      {esitoGenerazione && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 18px",
            borderRadius: 12,
            marginBottom: 16,
            background: esitoGenerazione.scoperti > 0 ? "#FEF3E8" : "#EDF7EE",
            border: `1px solid ${esitoGenerazione.scoperti > 0 ? "#F2B97F" : "#90C49A"}`,
            fontSize: 13,
          }}
        >
          <span style={{ color: esitoGenerazione.scoperti > 0 ? "#8B4E10" : "#2D6B38", flex: 1 }}>
            Piano generato: <strong>{esitoGenerazione.assegnati}</strong> interventi assegnati
            {esitoGenerazione.scoperti > 0 && (
              <span style={{ color: "#C94040", fontWeight: 500 }}>
                {" "}· {esitoGenerazione.scoperti} scoperti — assegnali manualmente dalla vista giorno
              </span>
            )}
          </span>
          <button
            onClick={() => setEsitoGenerazione(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--grigio)", padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Controlli vista */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "var(--sabbia)",
            borderRadius: 10,
            padding: 3,
            border: "1px solid var(--bordo)",
          }}
        >
          {(["giorno", "settimana", "mese"] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: vista === v ? "var(--bianco)" : "transparent",
                color: vista === v ? "var(--inchiostro)" : "var(--grigio)",
                fontSize: 13,
                fontWeight: vista === v ? 500 : 400,
                boxShadow: vista === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => naviga(-1)} style={btnNavStyle}>
            ←
          </button>
          <button
            onClick={() => setDataCorrente(new Date())}
            style={btnNavStyle}
          >
            Oggi
          </button>
          <button onClick={() => naviga(1)} style={btnNavStyle}>
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            color: "var(--grigio)",
            fontSize: 14,
            padding: "48px 0",
            textAlign: "center",
          }}
        >
          Caricamento...
        </div>
      ) : (
        <>
          {vista === "giorno" && (
            <VistaGiorno
              giorno={dataCorrente}
              interventi={interventi.filter(
                (i) =>
                  i.data.slice(0, 10) === format(dataCorrente, "yyyy-MM-dd"),
              )}
              coloriMappa={coloriMappa}
              onRefresh={() => setRefresh((r) => r + 1)}
            />
          )}
          {vista === "settimana" && (
            <VistaSettimana
              dataInizio={dataInizio}
              dataFine={dataFine}
              interventi={interventi}
              operatoriUnici={operatoriUnici}
              coloriMappa={coloriMappa}
            />
          )}
          {vista === "mese" && (
            <VistaMese
              dataCorrente={dataCorrente}
              dataInizio={dataInizio}
              dataFine={dataFine}
              interventi={interventi}
              coloriMappa={coloriMappa}
              onClickGiorno={(d) => {
                setDataCorrente(d);
                setVista("giorno");
              }}
            />
          )}
        </>
      )}

      {/* Legenda operatori */}
      {operatoriUnici.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid var(--bordo)",
          }}
        >
          {operatoriUnici.map((nome) => {
            const c = getColoreOperatore(nome, coloriMappa);
            return (
              <div
                key={nome}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--inchiostro-light)",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: c.bg,
                    border: `1.5px solid ${c.border}`,
                    display: "inline-block",
                  }}
                />
                {nome.split(" ")[1] ?? nome}
              </div>
            );
          })}
          <div
            style={{ fontSize: 12, color: "var(--grigio)", marginLeft: "auto" }}
          >
            {interventi.length} interventi nel periodo
          </div>
        </div>
      )}
    </div>
  );
}

function VistaGiorno({
  giorno,
  interventi,
  coloriMappa,
  onRefresh,
}: {
  giorno: Date;
  interventi: Intervento[];
  coloriMappa: Map<string, number>;
  onRefresh: () => void;
}) {
  const [percorsi, setPercorsi] = useState<
    Record<number, { link: string; mezzo: string }>
  >({});
  const [ottimizzando, setOttimizzando] = useState<number | null>(null);
  const [assegna, setAssegna] = useState<{ id: number; nome: string } | null>(null);
  const [candidati, setCandidati] = useState<any[]>([]);
  const [assegnando, setAssegnando] = useState(false);

  const mattina = interventi.filter((i) => i.turno === "mattina");
  const pomeriggio = interventi.filter((i) => i.turno === "pomeriggio");
  const operatoriUnici = Array.from(
    new Map(
      interventi
        .filter((i) => i.operatore)
        .map((i) => [i.operatore!.id, i.operatore!]),
    ).values(),
  );

  const MEZZO_LABEL: Record<string, string> = {
    driving: "🚗",
    cycling: "🚲",
    foot: "🚶",
  };

  async function ottimizza(operatoreId: number) {
    setOttimizzando(operatoreId);
    try {
      const res = await api.post("/routing/ottimizza", {
        operatoreId,
        data: format(giorno, "yyyy-MM-dd"),
      });
      if (res.data.linkMaps)
        setPercorsi((prev) => ({
          ...prev,
          [operatoreId]: { link: res.data.linkMaps, mezzo: res.data.mezzo },
        }));
    } finally {
      setOttimizzando(null);
    }
  }

  async function apriAssegna(i: Intervento) {
    setAssegna({ id: i.id, nome: i.utente.nome });
    setCandidati([]);
    const res = await api.get(`/interventi/${i.id}/candidati`);
    setCandidati(res.data);
  }

  async function confermaAssegna(operatoreId: number) {
    if (!assegna) return;
    setAssegnando(true);
    try {
      await api.put(`/interventi/${assegna.id}/assegna`, { operatoreId });
      setAssegna(null);
      onRefresh();
    } finally {
      setAssegnando(false);
    }
  }

  if (interventi.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "64px 0",
          color: "var(--grigio)",
          fontSize: 14,
        }}
      >
        Nessun intervento per questo giorno
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {operatoriUnici.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {operatoriUnici.map((op) => {
            const c = getColoreOperatore(op.nome, coloriMappa);
            return (
              <div
                key={op.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1px solid ${c.border}`,
                  background: c.bg,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: c.color }}>
                  {op.nome}
                </span>
                {percorsi[op.id] && (
                  <a
                    href={percorsi[op.id].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      padding: "3px 10px",
                      borderRadius: 6,
                      background: "var(--bianco)",
                      color: c.color,
                      textDecoration: "none",
                      fontWeight: 500,
                      border: `1px solid ${c.border}`,
                    }}
                  >
                    {MEZZO_LABEL[percorsi[op.id].mezzo]} Maps
                  </a>
                )}
                <button
                  onClick={() => ottimizza(op.id)}
                  disabled={ottimizzando === op.id}
                  style={{
                    fontSize: 12,
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: `1px solid ${c.border}`,
                    background: "var(--bianco)",
                    cursor: "pointer",
                    color: c.color,
                    fontWeight: 400,
                  }}
                >
                  {ottimizzando === op.id ? "..." : "Ottimizza"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          {
            label: "Mattina",
            orario: "8:00 – 14:30",
            items: mattina,
            turno: "mattina",
          },
          {
            label: "Pomeriggio",
            orario: "14:30 – 18:30",
            items: pomeriggio,
            turno: "pomeriggio",
          },
        ].map(({ label, orario, items, turno }) => (
          <div
            key={turno}
            style={{
              border: "1px solid var(--bordo)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                fontSize: 13,
                fontWeight: 500,
                background:
                  turno === "mattina"
                    ? "var(--terra-light)"
                    : "var(--salvia-light)",
                color:
                  turno === "mattina"
                    ? "var(--terra-dark)"
                    : "var(--salvia-dark)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>
                {orario} · {items.length}
              </span>
            </div>
            <div
              style={{
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {items.length === 0 && (
                <div
                  style={{
                    color: "var(--grigio)",
                    fontSize: 13,
                    padding: "12px 0",
                    textAlign: "center",
                  }}
                >
                  Nessun intervento
                </div>
              )}
              {items.map((i) => {
                const scoperto = !i.operatore;
                const c = scoperto
                  ? null
                  : getColoreOperatore(i.operatore!.nome, coloriMappa);
                return (
                  <div
                    key={i.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: scoperto ? "1px solid #F2B97F" : "1px solid var(--bordo)",
                      background: scoperto ? "#FEF3E8" : "var(--bianco)",
                      borderLeft: scoperto
                        ? "3px solid #C94040"
                        : c
                        ? `3px solid ${c.border}`
                        : "1px solid var(--bordo)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
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
                          {i.utente.nome}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--grigio)",
                            marginTop: 2,
                          }}
                        >
                          {i.tipoServizio?.nome ?? "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {scoperto ? (
                          <button
                            onClick={() => apriAssegna(i)}
                            style={{
                              fontSize: 12,
                              padding: "4px 12px",
                              borderRadius: 6,
                              border: "1px solid #C94040",
                              background: "#C94040",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Assegna
                          </button>
                        ) : (
                          <>
                            <div
                              style={{
                                fontSize: 12,
                                color: c?.color ?? "var(--grigio)",
                                fontWeight: 500,
                              }}
                            >
                              {i.operatore?.nome.split(" ")[1] ?? "—"}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--grigio)",
                                marginTop: 2,
                              }}
                            >
                              {i.durata}min
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal assegnazione manuale */}
      {assegna && (
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
          onClick={() => setAssegna(null)}
        >
          <div
            style={{
              background: "var(--bianco)",
              borderRadius: 16,
              padding: 28,
              width: 380,
              maxWidth: "90vw",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--inchiostro)", marginBottom: 4 }}>
              Assegna operatore
            </div>
            <div style={{ fontSize: 13, color: "var(--grigio)", marginBottom: 20 }}>
              {assegna.nome}
            </div>
            {candidati.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--grigio)", textAlign: "center", padding: "24px 0" }}>
                Nessun operatore disponibile
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {candidati.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => confermaAssegna(c.id)}
                    disabled={assegnando}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid var(--bordo)",
                      background: c.inEquipe ? "var(--sabbia)" : "var(--bianco)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--inchiostro)" }}>
                        {c.nome}
                        {c.inEquipe && (
                          <span style={{ fontSize: 11, color: "var(--terra)", marginLeft: 8, fontWeight: 400 }}>
                            equipe
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--grigio)", marginTop: 2 }}>
                        {c.qualifica}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--grigio)", textAlign: "right" }}>
                      <div>{c.interventiOggi} oggi</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VistaSettimana({
  dataInizio,
  dataFine,
  interventi,
  operatoriUnici,
  coloriMappa,
}: {
  dataInizio: Date;
  dataFine: Date;
  interventi: Intervento[];
  operatoriUnici: string[];
  coloriMappa: Map<string, number>;
}) {
  const giorni = eachDayOfInterval({ start: dataInizio, end: dataFine });

  if (operatoriUnici.length === 0 && !interventi.some((i) => !i.operatore)) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "64px 0",
          color: "var(--grigio)",
          fontSize: 14,
        }}
      >
        Nessun turno — clicca "Genera turni" per creare il piano
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 140 }}>Operatore</th>
            {giorni.map((g) => (
              <th
                key={g.toISOString()}
                style={{
                  ...thStyle,
                  background: isToday(g) ? "var(--terra-light)" : "transparent",
                  color: isToday(g) ? "var(--terra-dark)" : "var(--grigio)",
                }}
              >
                <div style={{ fontWeight: 500 }}>
                  {format(g, "EEE", { locale: it })}
                </div>
                <div style={{ fontWeight: 400, fontSize: 12 }}>
                  {format(g, "d/M")}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {operatoriUnici.map((nomeOp) => {
            const c = getColoreOperatore(nomeOp, coloriMappa);
            return (
              <tr key={nomeOp}>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    color: c.color,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: c.border,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {nomeOp.split(" ").slice(0, 2).join(" ")}
                  </div>
                </td>
                {giorni.map((giorno) => {
                  const dataStr = format(giorno, "yyyy-MM-dd");
                  const miei = interventi.filter(
                    (i) =>
                      i.data.slice(0, 10) === dataStr &&
                      i.operatore?.nome === nomeOp,
                  );
                  return (
                    <td
                      key={giorno.toISOString()}
                      style={{
                        ...tdStyle,
                        verticalAlign: "top",
                        minWidth: 100,
                        background: isToday(giorno)
                          ? "var(--sabbia)"
                          : "transparent",
                      }}
                    >
                      {miei.map((i) => (
                        <div
                          key={i.id}
                          style={{
                            background: c.bg,
                            color: c.color,
                            border: `1px solid ${c.border}22`,
                            borderRadius: 6,
                            padding: "4px 8px",
                            marginBottom: 4,
                            fontSize: 11,
                            lineHeight: 1.4,
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>
                            {i.tipoServizio?.nome ?? "—"}
                          </div>
                          <div style={{ opacity: 0.75 }}>
                            {i.utente.nome.split(" ").slice(-1)[0]}
                          </div>
                        </div>
                      ))}
                      {miei.length === 0 && (
                        <span style={{ color: "var(--bordo)", fontSize: 12 }}>
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {/* Riga scoperti */}
          {(() => {
            const scopertiPerGiorno = giorni.map((g) =>
              interventi.filter(
                (i) => i.data.slice(0, 10) === format(g, "yyyy-MM-dd") && !i.operatore,
              ),
            );
            const haScoperti = scopertiPerGiorno.some((s) => s.length > 0);
            if (!haScoperti) return null;
            return (
              <tr>
                <td style={{ ...tdStyle, fontWeight: 500, color: "#C94040", fontSize: 12, whiteSpace: "nowrap" }}>
                  Da assegnare
                </td>
                {scopertiPerGiorno.map((scoperti, idx) => (
                  <td
                    key={idx}
                    style={{
                      ...tdStyle,
                      verticalAlign: "top",
                      background: isToday(giorni[idx]) ? "var(--sabbia)" : "transparent",
                    }}
                  >
                    {scoperti.map((i) => (
                      <div
                        key={i.id}
                        style={{
                          background: "#FEF3E8",
                          color: "#8B4E10",
                          border: "1px solid #F2B97F",
                          borderRadius: 6,
                          padding: "4px 8px",
                          marginBottom: 4,
                          fontSize: 11,
                          lineHeight: 1.4,
                        }}
                      >
                        <div style={{ fontWeight: 500 }}>{i.tipoServizio?.nome ?? "—"}</div>
                        <div style={{ opacity: 0.75 }}>{i.utente.nome.split(" ").slice(-1)[0]}</div>
                      </div>
                    ))}
                    {scoperti.length === 0 && (
                      <span style={{ color: "var(--bordo)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}

function VistaMese({
  dataCorrente,
  dataInizio,
  dataFine,
  interventi,
  coloriMappa,
  onClickGiorno,
}: {
  dataCorrente: Date;
  dataInizio: Date;
  dataFine: Date;
  interventi: Intervento[];
  coloriMappa: Map<string, number>;
  onClickGiorno: (d: Date) => void;
}) {
  const giorni = eachDayOfInterval({ start: dataInizio, end: dataFine });
  const primoGiorno = dataInizio.getDay();
  const padding = primoGiorno === 0 ? 6 : primoGiorno - 1;
  const celle = [...Array(padding).fill(null), ...giorni];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 6,
        }}
      >
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((g) => (
          <div
            key={g}
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--grigio)",
              padding: "4px 0",
              fontWeight: 500,
              letterSpacing: "0.05em",
            }}
          >
            {g}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {celle.map((giorno, idx) => {
          if (!giorno) return <div key={`pad-${idx}`} />;
          const dataStr = format(giorno, "yyyy-MM-dd");
          const ig = interventi.filter((i) => i.data.slice(0, 10) === dataStr);
          const oggi = isToday(giorno);
          const delMese = isSameMonth(giorno, dataCorrente);
          return (
            <div
              key={giorno.toISOString()}
              onClick={() => onClickGiorno(giorno)}
              style={{
                minHeight: 88,
                padding: 8,
                borderRadius: 10,
                cursor: "pointer",
                border: oggi
                  ? "1.5px solid var(--terra)"
                  : "1px solid var(--bordo)",
                background: oggi ? "var(--terra-light)" : "var(--bianco)",
                opacity: delMese ? 1 : 0.35,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!oggi) e.currentTarget.style.borderColor = "var(--terra)";
              }}
              onMouseLeave={(e) => {
                if (!oggi) e.currentTarget.style.borderColor = "var(--bordo)";
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: oggi ? 600 : 400,
                  color: oggi ? "var(--terra-dark)" : "var(--inchiostro-light)",
                  marginBottom: 4,
                }}
              >
                {format(giorno, "d")}
              </div>
              {ig.slice(0, 3).map((i) => {
                const c = i.operatore
                  ? getColoreOperatore(i.operatore.nome, coloriMappa)
                  : null;
                return (
                  <div
                    key={i.id}
                    style={{
                      background: c?.bg ?? "var(--sabbia)",
                      color: c?.color ?? "var(--grigio)",
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: 10,
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i.operatore?.nome.split(" ")[1] ?? "—"}
                  </div>
                );
              })}
              {ig.length > 3 && (
                <div
                  style={{ fontSize: 10, color: "var(--grigio)", marginTop: 2 }}
                >
                  +{ig.length - 3}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 500,
  borderBottom: "1px solid var(--bordo)",
  color: "var(--grigio)",
  fontSize: 12,
};
const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid var(--sabbia)",
};
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
  padding: "8px 14px",
  border: "1px solid var(--bordo)",
  borderRadius: 10,
  background: "var(--bianco)",
  cursor: "pointer",
  fontSize: 13,
  color: "var(--inchiostro-light)",
};
const btnNavStyle: React.CSSProperties = {
  padding: "6px 14px",
  border: "1px solid var(--bordo)",
  borderRadius: 8,
  background: "var(--bianco)",
  cursor: "pointer",
  fontSize: 13,
  color: "var(--inchiostro-light)",
};
