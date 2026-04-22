import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/client";

interface OpMappa {
  id: number;
  nome: string;
  qualifica: string;
  telefono: string | null;
  lat: number;
  lon: number;
  mezzoTrasporto: string;
}

interface UtenteMappa {
  id: number;
  nome: string;
  indirizzo: string;
  lat: number;
  lon: number;
}

interface InterventoMappa {
  id: number;
  turno: string;
  ordineGiornata: number | null;
  operatore: { id: number; nome: string } | null;
  utente: { id: number; nome: string; lat: number | null; lon: number | null };
  tipoServizio: { nome: string } | null;
}

interface MappaData {
  operatori: OpMappa[];
  utenti: UtenteMappa[];
  interventiOggi: InterventoMappa[];
  senzaCoordinate: { operatori: number; utenti: number };
}

const COLORI_OP = [
  "#c17b4e", "#4a90d9", "#7b9e4a", "#9b6bb5",
  "#e0943a", "#1aab8c", "#d45f5f", "#5b8dd9",
];

const MEZZO_LABEL: Record<string, string> = {
  driving: "🚗",
  cycling: "🚲",
  foot: "🚶",
};

function coloreOp(id: number) {
  return COLORI_OP[id % COLORI_OP.length];
}

function FitBounds({ punti }: { punti: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (punti.length > 1) {
      map.fitBounds(punti, { padding: [48, 48] });
    } else if (punti.length === 1) {
      map.setView(punti[0], 13);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function stimaPosizioneAttuale(
  op: OpMappa,
  interventi: InterventoMappa[],
): { lat: number; lon: number; inServizio: boolean; utente?: string; servizio?: string } {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const turno =
    h >= 8 && h < 14.5 ? "mattina" : h >= 14.5 && h < 18.5 ? "pomeriggio" : null;

  if (!turno) return { lat: op.lat, lon: op.lon, inServizio: false };

  const miei = interventi
    .filter(
      (i) =>
        i.operatore?.id === op.id &&
        i.turno === turno &&
        i.utente.lat != null &&
        i.utente.lon != null,
    )
    .sort((a, b) => (a.ordineGiornata ?? 99) - (b.ordineGiornata ?? 99));

  if (miei.length === 0) return { lat: op.lat, lon: op.lon, inServizio: false };

  const inizio = turno === "mattina" ? 8 : 14.5;
  const durata = turno === "mattina" ? 6.5 : 4;
  const step = durata / miei.length;

  let corrente = miei[miei.length - 1];
  for (let i = 0; i < miei.length; i++) {
    if (h >= inizio + i * step && h < inizio + (i + 1) * step) {
      corrente = miei[i];
      break;
    }
  }

  return {
    lat: corrente.utente.lat!,
    lon: corrente.utente.lon!,
    inServizio: true,
    utente: corrente.utente.nome,
    servizio: corrente.tipoServizio?.nome,
  };
}

type FiltroKey = "utenti" | "operatori" | "turni" | "stimata";

const FILTRI_CONFIG: { id: FiltroKey; label: string; colore: string }[] = [
  { id: "utenti", label: "Utenti", colore: "#4a90d9" },
  { id: "operatori", label: "Operatori (casa)", colore: "#c17b4e" },
  { id: "turni", label: "Percorsi oggi", colore: "#7b9e4a" },
  { id: "stimata", label: "Posizione stimata", colore: "#c94040" },
];

export default function Mappa() {
  const [dati, setDati] = useState<MappaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtri, setFiltri] = useState<Record<FiltroKey, boolean>>({
    utenti: true,
    operatori: true,
    turni: true,
    stimata: true,
  });

  useEffect(() => {
    api
      .get("/mappa")
      .then((res) => setDati(res.data))
      .finally(() => setLoading(false));
  }, []);

  const puntiMappa = useMemo((): [number, number][] => {
    if (!dati) return [];
    return [
      ...dati.operatori.map((o) => [o.lat, o.lon] as [number, number]),
      ...dati.utenti.map((u) => [u.lat, u.lon] as [number, number]),
    ];
  }, [dati]);

  const posizioniStimate = useMemo(() => {
    if (!dati) return [];
    return dati.operatori.map((op) =>
      stimaPosizioneAttuale(op, dati.interventiOggi),
    );
  }, [dati]);

  const percorsiOggi = useMemo(() => {
    if (!dati) return [];
    return dati.operatori
      .map((op) => {
        const punti: [number, number][] = dati.interventiOggi
          .filter(
            (i) =>
              i.operatore?.id === op.id &&
              i.utente.lat != null &&
              i.utente.lon != null,
          )
          .sort((a, b) => (a.ordineGiornata ?? 99) - (b.ordineGiornata ?? 99))
          .map((i) => [i.utente.lat!, i.utente.lon!]);
        if (punti.length === 0) return null;
        return {
          operatoreId: op.id,
          nome: op.nome,
          punti: [[op.lat, op.lon] as [number, number], ...punti],
        };
      })
      .filter(Boolean) as { operatoreId: number; nome: string; punti: [number, number][] }[];
  }, [dati]);

  function toggleFiltro(id: FiltroKey) {
    setFiltri((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--grigio)", fontSize: 13 }}>
        Caricamento mappa...
      </div>
    );
  }

  if (!dati) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Barra filtri */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 20px",
          borderBottom: "1px solid var(--bordo)",
          background: "var(--bianco)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--grigio)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginRight: 4,
          }}
        >
          Livelli
        </span>
        {FILTRI_CONFIG.map((f) => {
          const attivo = filtri[f.id];
          return (
            <button
              key={f.id}
              onClick={() => toggleFiltro(f.id)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: `1.5px solid ${attivo ? f.colore : "var(--bordo)"}`,
                background: attivo ? f.colore + "22" : "transparent",
                color: attivo ? f.colore : "var(--grigio)",
                fontSize: 12,
                fontWeight: attivo ? 500 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: attivo ? f.colore : "var(--bordo)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {f.label}
            </button>
          );
        })}

        <div
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--grigio)",
            display: "flex",
            gap: 12,
          }}
        >
          <span>
            <span style={{ color: "#4a90d9", fontWeight: 500 }}>●</span>{" "}
            {dati.utenti.length} utenti
          </span>
          <span>
            <span style={{ color: "#c17b4e", fontWeight: 500 }}>●</span>{" "}
            {dati.operatori.length} operatori
          </span>
          {(dati.senzaCoordinate.operatori > 0 ||
            dati.senzaCoordinate.utenti > 0) && (
            <span style={{ color: "#c94040" }}>
              ⚠ {dati.senzaCoordinate.operatori + dati.senzaCoordinate.utenti}{" "}
              senza coordinate
            </span>
          )}
        </div>
      </div>

      {/* Mappa */}
      <MapContainer
        center={[42.5, 12.5]}
        zoom={6}
        style={{ height: "calc(100vh - 52px)", width: "100%" }}
        zoomControl
      >
        {puntiMappa.length > 0 && <FitBounds punti={puntiMappa} />}

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Percorsi oggi */}
        {filtri.turni &&
          percorsiOggi.map((p) => (
            <Polyline
              key={p.operatoreId}
              positions={p.punti}
              pathOptions={{
                color: coloreOp(p.operatoreId),
                weight: 2,
                opacity: 0.5,
                dashArray: "5 6",
              }}
            />
          ))}

        {/* Marker utenti */}
        {filtri.utenti &&
          dati.utenti.map((u) => (
            <CircleMarker
              key={u.id}
              center={[u.lat, u.lon]}
              radius={7}
              pathOptions={{
                color: "#2f72b8",
                fillColor: "#4a90d9",
                fillOpacity: 0.85,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <strong>{u.nome}</strong>
                  <br />
                  <span style={{ fontSize: 11, color: "#666" }}>
                    {u.indirizzo}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Marker operatori (casa) */}
        {filtri.operatori &&
          dati.operatori.map((o) => (
            <CircleMarker
              key={o.id}
              center={[o.lat, o.lon]}
              radius={7}
              pathOptions={{
                color: "#8a5030",
                fillColor: "#c17b4e",
                fillOpacity: 0.85,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <strong>{o.nome}</strong>
                  <br />
                  <span style={{ fontSize: 11, color: "#666" }}>
                    {o.qualifica}
                  </span>
                  <br />
                  {o.telefono && (
                    <>
                      <span style={{ fontSize: 11 }}>{o.telefono}</span>
                      <br />
                    </>
                  )}
                  <span style={{ fontSize: 11 }}>
                    {MEZZO_LABEL[o.mezzoTrasporto] ?? "🚗"} {o.mezzoTrasporto}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Posizione stimata (operatori in servizio ora) */}
        {filtri.stimata &&
          dati.operatori.map((op, idx) => {
            const pos = posizioniStimate[idx];
            if (!pos.inServizio) return null;
            return (
              <CircleMarker
                key={`stimata-${op.id}`}
                center={[pos.lat, pos.lon]}
                radius={10}
                pathOptions={{
                  color: "#a02828",
                  fillColor: "#c94040",
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong>{op.nome}</strong>{" "}
                    <span
                      style={{
                        fontSize: 10,
                        background: "#c94040",
                        color: "#fff",
                        padding: "1px 5px",
                        borderRadius: 3,
                      }}
                    >
                      in servizio
                    </span>
                    <br />
                    {pos.utente && (
                      <span style={{ fontSize: 11, color: "#444" }}>
                        Da: <strong>{pos.utente}</strong>
                        <br />
                      </span>
                    )}
                    {pos.servizio && (
                      <span style={{ fontSize: 11, color: "#666" }}>
                        {pos.servizio}
                      </span>
                    )}
                    <br />
                    <span style={{ fontSize: 10, color: "#999" }}>
                      posizione stimata
                    </span>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
