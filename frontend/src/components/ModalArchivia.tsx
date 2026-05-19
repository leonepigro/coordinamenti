import Modal from "./Modal";
import { useState } from "react";

const MOTIVI = [
  { value: "decesso", label: "Decesso" },
  { value: "dimissioni", label: "Dimissioni" },
  { value: "altro", label: "Altro" },
];

export default function ModalArchivia({
  nome,
  tipo,
  onConferma,
  onClose,
}: {
  nome: string;
  tipo: "utente" | "operatore";
  onConferma: (motivo: string) => Promise<void>;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("dimissioni");
  const [salvando, setSalvando] = useState(false);

  async function conferma() {
    setSalvando(true);
    await onConferma(motivo);
    setSalvando(false);
  }

  return (
    <Modal titolo={`Archivia ${tipo === "utente" ? "utente" : "operatore"}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13, color: "var(--inchiostro)" }}>
          Stai archiviando <strong>{nome}</strong>. Il record verrà conservato ma non sarà più visibile nelle liste attive.
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--grigio)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Motivo
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {MOTIVI.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMotivo(m.value)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  cursor: "pointer",
                  border: motivo === m.value ? "1.5px solid var(--terra)" : "1px solid var(--bordo)",
                  background: motivo === m.value ? "var(--terra)" : "var(--bianco)",
                  color: motivo === m.value ? "#fff" : "var(--inchiostro-light)",
                  fontWeight: motivo === m.value ? 500 : 400,
                  transition: "all 0.12s",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={btnSecondarioStyle}>Annulla</button>
          <button onClick={conferma} disabled={salvando} style={btnArchiviaStyle}>
            {salvando ? "Archiviazione..." : "Archivia"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const btnArchiviaStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  background: "#8A5C3A",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
};
const btnSecondarioStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid var(--bordo)",
  background: "var(--bianco)",
  color: "var(--inchiostro)",
  fontSize: 13,
  cursor: "pointer",
};
