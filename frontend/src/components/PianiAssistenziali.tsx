import { useState, useEffect } from "react";
import {
  piani as apiPiani,
  utenti as apiUtenti,
  tipiServizio as apiTipi,
} from "../api/client";

interface Piano {
  id: number;
  utenteId: number;
  tipoServizioId: number;
  giorniSettimana: string;
  oraInizio: string;
  attivo: boolean;
  utente: { id: number; nome: string };
  tipoServizio: { id: number; nome: string; durata: number };
}

interface Utente {
  id: number;
  nome: string;
}
interface TipoServizio {
  id: number;
  nome: string;
  durata: number;
}

const GIORNI = [
  { label: "Lun", value: "1" },
  { label: "Mar", value: "2" },
  { label: "Mer", value: "3" },
  { label: "Gio", value: "4" },
  { label: "Ven", value: "5" },
  { label: "Sab", value: "6" },
  { label: "Dom", value: "0" },
];

const GIORNI_LABEL: Record<string, string> = {
  "0": "Dom",
  "1": "Lun",
  "2": "Mar",
  "3": "Mer",
  "4": "Gio",
  "5": "Ven",
  "6": "Sab",
};

const ORE = Array.from({ length: 21 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function PianiAssistenziali() {
  const [lista, setLista] = useState<Piano[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [tipi, setTipi] = useState<TipoServizio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroUtente, setFiltroUtente] = useState<number | "">("");
  const [mostraForm, setMostraForm] = useState(false);
  const [inModifica, setInModifica] = useState<Piano | null>(null);
  const [form, setForm] = useState({
    utenteId: 0,
    tipoServizioId: 0,
    giorniSettimana: "1,2,3,4,5",
    oraInizio: "08:00",
  });
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  async function carica() {
    const [resPiani, resUtenti, resTipi] = await Promise.all([
      apiPiani.lista(filtroUtente || undefined),
      apiUtenti.lista(),
      apiTipi.lista(),
    ]);
    setLista(resPiani.data);
    setUtenti(resUtenti.data);
    setTipi(resTipi.data);
    if (resUtenti.data.length > 0 && form.utenteId === 0) {
      setForm((f) => ({ ...f, utenteId: resUtenti.data[0].id }));
    }
    if (resTipi.data.length > 0 && form.tipoServizioId === 0) {
      setForm((f) => ({ ...f, tipoServizioId: resTipi.data[0].id }));
    }
    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, [filtroUtente]);

  function apriNuovo() {
    setInModifica(null);
    setForm({
      utenteId: utenti[0]?.id ?? 0,
      tipoServizioId: tipi[0]?.id ?? 0,
      giorniSettimana: "1,2,3,4,5",
      oraInizio: "08:00",
    });
    setErrore("");
    setMostraForm(true);
  }

  function apriModifica(p: Piano) {
    setInModifica(p);
    setForm({
      utenteId: p.utenteId,
      tipoServizioId: p.tipoServizioId,
      giorniSettimana: p.giorniSettimana,
      oraInizio: p.oraInizio,
    });
    setErrore("");
    setMostraForm(true);
  }

  function toggleGiorno(giorno: string) {
    const giorni = form.giorniSettimana.split(",").filter(Boolean);
    const nuovi = giorni.includes(giorno)
      ? giorni.filter((g) => g !== giorno)
      : [...giorni, giorno].sort();
    setForm((f) => ({ ...f, giorniSettimana: nuovi.join(",") }));
  }

  async function salva() {
    if (!form.utenteId || !form.tipoServizioId) {
      setErrore("Utente e tipo servizio sono obbligatori");
      return;
    }
    if (!form.giorniSettimana) {
      setErrore("Seleziona almeno un giorno");
      return;
    }
    setSalvando(true);
    setErrore("");
    try {
      if (inModifica) {
        await apiPiani.aggiorna(inModifica.id, {
          tipoServizioId: form.tipoServizioId,
          giorniSettimana: form.giorniSettimana,
          oraInizio: form.oraInizio,
        });
      } else {
        await apiPiani.crea(form);
      }
      setMostraForm(false);
      carica();
    } catch {
      setErrore("Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  }

  async function elimina(id: number) {
    if (!confirm("Disattivare questo piano assistenziale?")) return;
    await apiPiani.elimina(id);
    carica();
  }

  // Raggruppa per utente
  const perUtente = utenti.reduce(
    (acc, u) => {
      const pianiUtente = lista.filter((p) => p.utenteId === u.id);
      if (pianiUtente.length > 0) acc[u.id] = { utente: u, piani: pianiUtente };
      return acc;
    },
    {} as Record<number, { utente: Utente; piani: Piano[] }>,
  );

  if (loading)
    return <div style={{ padding: 32, color: "#888" }}>Caricamento...</div>;

  return (
    <div style={{ padding: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            Piani assistenziali
          </h1>
          <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>
            {lista.length} piani attivi
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select
            value={filtroUtente}
            onChange={(e) =>
              setFiltroUtente(e.target.value ? parseInt(e.target.value) : "")
            }
            style={selectStyle}
          >
            <option value="">Tutti gli utenti</option>
            {utenti.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
          <button onClick={apriNuovo} style={btnPrimarioStyle}>
            + Nuovo piano
          </button>
        </div>
      </div>

      {/* Form */}
      {mostraForm && (
        <div
          style={{
            border: "1px solid #e5e5e3",
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            background: "#fafaf9",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
            {inModifica ? "Modifica piano" : "Nuovo piano assistenziale"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Utente</label>
              <select
                value={form.utenteId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, utenteId: parseInt(e.target.value) }))
                }
                style={inputStyle}
                disabled={!!inModifica}
              >
                {utenti.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tipo servizio</label>
              <select
                value={form.tipoServizioId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tipoServizioId: parseInt(e.target.value),
                  }))
                }
                style={inputStyle}
              >
                {tipi.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.durata}min)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ora inizio</label>
              <select
                value={form.oraInizio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, oraInizio: e.target.value }))
                }
                style={inputStyle}
              >
                {ORE.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Giorni della settimana</label>
            <div style={{ display: "flex", gap: 6 }}>
              {GIORNI.map((g) => {
                const attivo = form.giorniSettimana
                  .split(",")
                  .includes(g.value);
                return (
                  <button
                    key={g.value}
                    onClick={() => toggleGiorno(g.value)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: "pointer",
                      border: attivo ? "none" : "1px solid #e5e5e3",
                      background: attivo ? "#1a1a1a" : "#fff",
                      color: attivo ? "#fff" : "#555",
                      fontWeight: attivo ? 500 : 400,
                    }}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {errore && (
            <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>
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

      {/* Lista raggruppata per utente */}
      {Object.values(perUtente).length === 0 && !mostraForm && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "#aaa",
            fontSize: 14,
          }}
        >
          Nessun piano assistenziale — clicca "+ Nuovo piano"
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {Object.values(perUtente).map(({ utente, piani }) => (
          <div key={utente.id}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#555",
                marginBottom: 8,
              }}
            >
              {utente.nome}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {piani.map((p) => {
                const giorni = p.giorniSettimana
                  .split(",")
                  .filter(Boolean)
                  .map((g) => GIORNI_LABEL[g])
                  .join(", ");
                const nGiorni = p.giorniSettimana
                  .split(",")
                  .filter(Boolean).length;
                const oreSettimana = (
                  (p.tipoServizio.durata * nGiorni) /
                  60
                ).toFixed(1);

                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid #e5e5e3",
                      background: "#fff",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {p.tipoServizio.nome}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#888", marginTop: 2 }}
                      >
                        {giorni} · {p.oraInizio} · {p.tipoServizio.durata}min ·{" "}
                        {oreSettimana}h/sett.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => apriModifica(p)}
                        style={btnSecondarioStyle}
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => elimina(p.id)}
                        style={{
                          ...btnSecondarioStyle,
                          color: "#dc2626",
                          borderColor: "#fecaca",
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                );
              })}
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
  color: "#666",
  marginBottom: 4,
  fontWeight: 500,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e5e5e3",
  borderRadius: 8,
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
};
const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #e5e5e3",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  background: "#fff",
};
const btnPrimarioStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#1a1a1a",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
};
const btnSecondarioStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #e5e5e3",
  background: "#fff",
  color: "#333",
  fontSize: 12,
  cursor: "pointer",
};
