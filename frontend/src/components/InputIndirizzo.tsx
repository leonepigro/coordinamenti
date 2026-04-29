import { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icona Leaflet con Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Suggerimento {
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  valore: string;
  lat?: number;
  lon?: number;
  onChange: (indirizzo: string, lat?: number, lon?: number) => void;
  placeholder?: string;
}

function MarkerClick({
  onCLick,
}: {
  onCLick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onCLick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function InputIndirizzo({
  valore,
  lat,
  lon,
  onChange,
  placeholder,
}: Props) {
  const [suggerimenti, setSuggerimenti] = useState<Suggerimento[]>([]);
  const [mostraMappa, setMostraMappa] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    lat && lon ? { lat, lon } : null,
  );
  const [cercando, setCercando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setIndirizzoReverso] = useState("");

  // Geocoding inverso quando si clicca sulla mappa
  async function reverseGeocode(lat: number, lon: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "User-Agent": "coordinamenti-app" } },
      );
      const data = await res.json();
      const addr = data.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      setIndirizzoReverso(addr);
      onChange(addr, lat, lon);
    } catch {
      onChange(`${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lon);
    }
  }

  // Autocomplete con debounce
  function handleInput(v: string) {
    onChange(v);
    setSuggerimenti([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.length < 3) return;
    timerRef.current = setTimeout(async () => {
      setCercando(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=5&countrycodes=it`,
          { headers: { "User-Agent": "coordinamenti-app" } },
        );
        const data: Suggerimento[] = await res.json();
        setSuggerimenti(data);
      } catch {
        /* silenzioso */
      } finally {
        setCercando(false);
      }
    }, 500);
  }

  function selezionaSuggerimento(s: Suggerimento) {
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);
    setCoords({ lat, lon });
    setSuggerimenti([]);
    onChange(s.display_name, lat, lon);
  }

  function handleClickMappa(lat: number, lon: number) {
    setCoords({ lat, lon });
    reverseGeocode(lat, lon);
  }

  const posizione: [number, number] = coords
    ? [coords.lat, coords.lon]
    : [41.9028, 12.4964]; // default Roma

  return (
    <div style={{ position: "relative" }}>
      {/* Input testo */}
      <div style={{ position: "relative" }}>
        <input
          value={valore}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder ?? "Via Roma 1, Napoli"}
          style={{
            width: "100%",
            padding: "8px 36px 8px 10px",
            border: "1px solid var(--bordo)",
            borderRadius: 8,
            fontSize: 13,
            outline: "none",
            background: "var(--bianco)",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--terra)")}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--bordo)";
            setTimeout(() => setSuggerimenti([]), 200);
          }}
        />
        {/* Bottone mappa */}
        <button
          type="button"
          onClick={() => setMostraMappa((m) => !m)}
          title="Seleziona sulla mappa"
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 16,
            color: mostraMappa ? "var(--terra)" : "var(--grigio)",
            padding: "2px 4px",
          }}
        >
          🗺
        </button>
      </div>

      {/* Indicatore ricerca */}
      {cercando && (
        <div style={{ fontSize: 11, color: "var(--grigio)", marginTop: 4 }}>
          Ricerca in corso...
        </div>
      )}

      {/* Suggerimenti autocomplete */}
      {suggerimenti.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--bianco)",
            border: "1px solid var(--bordo)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(44,36,32,0.1)",
            marginTop: 4,
            overflow: "hidden",
          }}
        >
          {suggerimenti.map((s, idx) => (
            <div
              key={idx}
              onMouseDown={() => selezionaSuggerimento(s)}
              style={{
                padding: "9px 12px",
                fontSize: 12,
                cursor: "pointer",
                color: "var(--inchiostro-light)",
                borderBottom:
                  idx < suggerimenti.length - 1
                    ? "1px solid var(--bordo)"
                    : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--sabbia)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--bianco)")
              }
            >
              📍 {s.display_name}
            </div>
          ))}
        </div>
      )}

      {/* Mappa */}
      {mostraMappa && (
        <div
          style={{
            marginTop: 8,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid var(--bordo)",
            height: 260,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--grigio)",
              padding: "6px 10px",
              background: "var(--sabbia)",
              borderBottom: "1px solid var(--bordo)",
            }}
          >
            Clicca sulla mappa per selezionare la posizione
          </div>
          <MapContainer
            center={posizione}
            zoom={coords ? 15 : 12}
            style={{ height: 220, width: "100%" }}
            key={`${posizione[0]}-${posizione[1]}`}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap"
            />
            <MarkerClick onCLick={handleClickMappa} />
            {coords && <Marker position={[coords.lat, coords.lon]} />}
          </MapContainer>
        </div>
      )}

      {/* Coordinate confermate */}
      {coords && (
        <div
          style={{ fontSize: 11, color: "var(--salvia-dark)", marginTop: 4 }}
        >
          ✓ Coordinate: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
        </div>
      )}
    </div>
  );
}
