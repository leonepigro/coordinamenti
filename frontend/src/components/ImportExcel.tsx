import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { importa } from "../api/client";

type Tipo = "operatori" | "utenti";

const COLONNE_OPERATORI = [
  { key: "nome", label: "Nome", required: true, esempio: "Maria Rossi" },
  { key: "qualifica", label: "Qualifica", required: true, esempio: "OSS" },
  {
    key: "oreSettimanali",
    label: "Ore settimanali",
    required: false,
    esempio: "36",
  },
  {
    key: "indirizzo",
    label: "Indirizzo",
    required: false,
    esempio: "Via Roma 1",
  },
  {
    key: "telefono",
    label: "Telefono",
    required: false,
    esempio: "333-1234567",
  },
  {
    key: "preferenzaTurno",
    label: "Preferenza turno",
    required: false,
    esempio: "mattina",
  },
  {
    key: "mezzoTrasporto",
    label: "Mezzo trasporto",
    required: false,
    esempio: "driving",
  },
  {
    key: "email",
    label: "Email",
    required: false,
    esempio: "maria.rossi@email.it",
  },
  {
    key: "commessa",
    label: "Commessa",
    required: false,
    esempio: "SAISA Mun. XII, PIOPPO",
  },
];

const COLONNE_UTENTI = [
  { key: "nome", label: "Nome", required: true, esempio: "Sig. Mario Rossi" },
  {
    key: "indirizzo",
    label: "Indirizzo",
    required: false,
    esempio: "Via Roma 1",
  },
  {
    key: "oreSettimanali",
    label: "Ore settimanali",
    required: false,
    esempio: "10",
  },
  { key: "note", label: "Note", required: false, esempio: "Diabetico" },
  { key: "commessa", label: "Commessa", required: false, esempio: "SAISA Mun. XII" },
];

export default function ImportExcel({
  tipo,
  onChiudi,
  onImportato,
}: {
  tipo: Tipo;
  onChiudi: () => void;
  onImportato: () => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "risultato">(
    "upload",
  );
  const [righe, setRighe] = useState<any[]>([]);
  const [erroriPreview, setErroriPreview] = useState<string[]>([]);
  const [risultato, setRisultato] = useState<{
    importati: number;
    errori: string[];
  } | null>(null);
  const [importando, setImportando] = useState(false);
  const [progress, setProgress] = useState<{ corrente: number; totale: number } | null>(null);
  const [nomeFile, setNomeFile] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const colonne = tipo === "operatori" ? COLONNE_OPERATORI : COLONNE_UTENTI;
  const titoloTipo = tipo === "operatori" ? "Operatori" : "Utenti";

  function leggiFile(file: File) {
    setNomeFile(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (json.length === 0) {
          setErroriPreview(["Il file è vuoto o non ha righe dati."]);
          return;
        }

        // Normalizza le chiavi (case insensitive, trim)
        const normalizzate = json.map((riga) => {
          const nuova: any = {};
          colonne.forEach((col) => {
            const chiaveOriginale = Object.keys(riga).find(
              (k) =>
                k.trim().toLowerCase() === col.label.toLowerCase() ||
                k.trim().toLowerCase() === col.key.toLowerCase(),
            );
            nuova[col.key] = chiaveOriginale
              ? String(riga[chiaveOriginale]).trim()
              : "";
          });
          return nuova;
        });

        // Valida righe obbligatorie
        const errori: string[] = [];
        normalizzate.forEach((r, i) => {
          colonne
            .filter((c) => c.required)
            .forEach((c) => {
              if (!r[c.key])
                errori.push(`Riga ${i + 2}: campo "${c.label}" mancante`);
            });
        });

        setRighe(normalizzate);
        setErroriPreview(errori);
        setStep("preview");
      } catch {
        setErroriPreview([
          "Errore nella lettura del file. Assicurati che sia un file .xlsx o .csv valido.",
        ]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function eseguiImport() {
    setImportando(true);
    if (tipo === "utenti") {
      setProgress({ corrente: 0, totale: righe.length });
      let importati = 0;
      const errori: string[] = [];
      for (let i = 0; i < righe.length; i++) {
        setProgress({ corrente: i + 1, totale: righe.length });
        try {
          const res = await importa.utenti([righe[i]]);
          importati += res.data.importati;
          errori.push(...res.data.errori);
        } catch {
          errori.push(`Errore su riga ${i + 1}`);
        }
      }
      setRisultato({ importati, errori });
      setStep("risultato");
      if (importati > 0) onImportato();
      setProgress(null);
      setImportando(false);
      return;
    }
    try {
      const res = await importa.operatori(righe);
      setRisultato(res.data);
      setStep("risultato");
      if (res.data.importati > 0) onImportato();
    } finally {
      setImportando(false);
    }
  }

  function scaricaTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      colonne.map((c) => c.label),
      colonne.map((c) => c.esempio),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, titoloTipo);
    XLSX.writeFile(wb, `template_${tipo}.xlsx`);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44,36,32,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onChiudi}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bianco)",
          borderRadius: 16,
          padding: 28,
          width: 580,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(44,36,32,0.15)",
        }}
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
            <h2
              style={{
                fontSize: 17,
                fontWeight: 500,
                margin: 0,
                color: "var(--inchiostro)",
              }}
            >
              Importa {titoloTipo} da Excel
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--grigio)",
                margin: "4px 0 0",
              }}
            >
              {step === "upload"
                ? "Carica un file .xlsx o .csv"
                : step === "preview"
                  ? `${righe.length} righe trovate`
                  : "Import completato"}
            </p>
          </div>
          <button
            onClick={onChiudi}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "var(--grigio)",
            }}
          >
            ✕
          </button>
        </div>

        {/* Step upload */}
        {step === "upload" && (
          <div>
            {/* Struttura attesa */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--grigio)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                Struttura attesa
              </div>
              <div
                style={{
                  border: "1px solid var(--bordo)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--sabbia)" }}>
                      <th style={thStyle}>Colonna</th>
                      <th style={thStyle}>Obbligatoria</th>
                      <th style={thStyle}>Esempio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colonne.map((c) => (
                      <tr key={c.key}>
                        <td style={tdStyle}>{c.label}</td>
                        <td style={tdStyle}>
                          {c.required ? (
                            <span
                              style={{
                                color: "var(--terra-dark)",
                                fontWeight: 500,
                              }}
                            >
                              Sì
                            </span>
                          ) : (
                            <span style={{ color: "var(--grigio)" }}>No</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            color: "var(--grigio)",
                            fontStyle: "italic",
                          }}
                        >
                          {c.esempio}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Download template */}
            <button
              onClick={scaricaTemplate}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 10,
                marginBottom: 14,
                border: "1px dashed var(--terra)",
                background: "var(--terra-light)",
                color: "var(--terra-dark)",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ↓ Scarica template Excel
            </button>

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "var(--terra)";
                e.currentTarget.style.background = "var(--terra-light)";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--bordo)";
                e.currentTarget.style.background = "var(--sabbia)";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "var(--bordo)";
                e.currentTarget.style.background = "var(--sabbia)";
                const file = e.dataTransfer.files[0];
                if (file) leggiFile(file);
              }}
              style={{
                border: "2px dashed var(--bordo)",
                borderRadius: 12,
                padding: "32px 20px",
                textAlign: "center",
                background: "var(--sabbia)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--inchiostro)",
                  marginBottom: 4,
                }}
              >
                Trascina il file qui
              </div>
              <div style={{ fontSize: 12, color: "var(--grigio)" }}>
                oppure clicca per selezionare
              </div>
              <div
                style={{ fontSize: 11, color: "var(--grigio)", marginTop: 8 }}
              >
                .xlsx · .xls · .csv
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) leggiFile(e.target.files[0]);
              }}
            />
          </div>
        )}

        {/* Step preview */}
        {step === "preview" && (
          <div>
            <div
              style={{
                fontSize: 13,
                color: "var(--inchiostro-light)",
                marginBottom: 14,
              }}
            >
              📄 {nomeFile}
            </div>

            {erroriPreview.length > 0 && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "#FCEAEA",
                  border: "1px solid #F0C0C0",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#A02020",
                    marginBottom: 6,
                  }}
                >
                  ⚠ {erroriPreview.length} problemi trovati
                </div>
                {erroriPreview.slice(0, 5).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#A02020" }}>
                    • {e}
                  </div>
                ))}
                {erroriPreview.length > 5 && (
                  <div style={{ fontSize: 12, color: "#A02020" }}>
                    ... e altri {erroriPreview.length - 5}
                  </div>
                )}
              </div>
            )}

            {/* Anteprima tabella */}
            <div
              style={{
                border: "1px solid var(--bordo)",
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div style={{ overflowX: "auto", maxHeight: 280 }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--sabbia)" }}>
                      {colonne.map((c) => (
                        <th key={c.key} style={thStyle}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {righe.slice(0, 10).map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          background:
                            i % 2 === 0 ? "var(--bianco)" : "var(--sabbia)",
                        }}
                      >
                        {colonne.map((c) => (
                          <td
                            key={c.key}
                            style={{
                              ...tdStyle,
                              color:
                                c.required && !r[c.key]
                                  ? "#A02020"
                                  : "var(--inchiostro-light)",
                              fontWeight: c.required && !r[c.key] ? 500 : 400,
                            }}
                          >
                            {r[c.key] || (c.required ? "⚠ mancante" : "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {righe.length > 10 && (
                <div
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    color: "var(--grigio)",
                    borderTop: "1px solid var(--bordo)",
                    background: "var(--sabbia)",
                  }}
                >
                  ... e altre {righe.length - 10} righe
                </div>
              )}
            </div>

            {progress && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--grigio)", marginBottom: 6 }}>
                  Geolocalizzazione {progress.corrente} di {progress.totale}...
                </div>
                <div style={{ background: "var(--bordo)", borderRadius: 4, height: 6 }}>
                  <div style={{
                    background: "var(--terra)",
                    borderRadius: 4,
                    height: 6,
                    width: `${(progress.corrente / progress.totale) * 100}%`,
                    transition: "width 0.2s ease",
                  }} />
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <button
                onClick={() => setStep("upload")}
                style={btnSecondarioStyle}
                disabled={importando}
              >
                ← Indietro
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onChiudi} style={btnSecondarioStyle} disabled={importando}>
                  Annulla
                </button>
                <button
                  onClick={eseguiImport}
                  disabled={
                    importando ||
                    erroriPreview.some((e) => e.includes("mancante"))
                  }
                  style={btnPrimarioStyle}
                >
                  {importando
                    ? progress
                      ? `${progress.corrente}/${progress.totale} geolocalizzati`
                      : "Importando..."
                    : `Importa ${righe.length} righe`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step risultato */}
        {step === "risultato" && risultato && (
          <div>
            <div
              style={{
                padding: "20px 24px",
                borderRadius: 12,
                marginBottom: 16,
                background:
                  risultato.importati > 0 ? "var(--salvia-light)" : "#FCEAEA",
                border: `1px solid ${risultato.importati > 0 ? "var(--salvia-dark)" : "#F0C0C0"}44`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {risultato.importati > 0 ? "✓" : "⚠"}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color:
                    risultato.importati > 0 ? "var(--salvia-dark)" : "#A02020",
                }}
              >
                {risultato.importati} {titoloTipo.toLowerCase()} importati
              </div>
              {risultato.errori.length > 0 && (
                <div
                  style={{ fontSize: 13, color: "var(--grigio)", marginTop: 4 }}
                >
                  {risultato.errori.length} righe con errori
                </div>
              )}
            </div>

            {risultato.errori.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--grigio)",
                    marginBottom: 8,
                  }}
                >
                  Dettaglio errori:
                </div>
                {risultato.errori.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: "#A02020",
                      padding: "4px 0",
                      borderBottom: "1px solid var(--bordo)",
                    }}
                  >
                    {e}
                  </div>
                ))}
              </div>
            )}

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                onClick={() => {
                  setStep("upload");
                  setRighe([]);
                  setErroriPreview([]);
                  setRisultato(null);
                }}
                style={btnSecondarioStyle}
              >
                Importa altro file
              </button>
              <button onClick={onChiudi} style={btnPrimarioStyle}>
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontWeight: 500,
  fontSize: 11,
  color: "var(--grigio)",
  borderBottom: "1px solid var(--bordo)",
  whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "7px 12px",
  borderBottom: "1px solid var(--bordo)",
  whiteSpace: "nowrap",
  maxWidth: 160,
  overflow: "hidden",
  textOverflow: "ellipsis",
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
  padding: "8px 16px",
  borderRadius: 10,
  border: "1px solid var(--bordo)",
  background: "var(--bianco)",
  color: "var(--inchiostro-light)",
  fontSize: 13,
  cursor: "pointer",
};
