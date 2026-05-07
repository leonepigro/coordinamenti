import { useState, useEffect } from "react";
import Modal from "./Modal";
import { equipe as apiEquipe, operatori as apiOperatori } from "../api/client";

export default function ModalEquipe({
  utenteId,
  equipeEsistente,
  onClose,
  onSalvato,
}: {
  utenteId: number;
  equipeEsistente?: { id: number; membri: { operatoreId: number }[] } | null;
  onClose: () => void;
  onSalvato: () => void;
}) {
  const [operatori, setOperatori] = useState<{ id: number; nome: string; qualifica: string }[]>([]);
  const [selezionati, setSelezionati] = useState<number[]>(
    equipeEsistente?.membri.map((m) => m.operatoreId) ?? []
  );
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    apiOperatori.lista().then((r) => setOperatori(r.data));
  }, []);

  function toggle(id: number) {
    setSelezionati((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function salva() {
    setSalvando(true);
    setErrore("");
    try {
      const membri = selezionati.map((id) => ({ operatoreId: id, ruolo: null }));
      if (equipeEsistente?.id) {
        await apiEquipe.aggiorna(equipeEsistente.id, { nome: null, membri });
      } else {
        await apiEquipe.crea({ utenteId, nome: null, membri });
      }
      onSalvato();
      onClose();
    } catch {
      setErrore("Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titolo="Operatori associati" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13, color: "#666" }}>
          Seleziona gli operatori da associare a questo utente.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {operatori.map((op) => {
            const sel = selezionati.includes(op.id);
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => toggle(op.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  cursor: "pointer",
                  border: sel ? "1.5px solid #1a1a1a" : "1px solid #e5e5e3",
                  background: sel ? "#1a1a1a" : "#fff",
                  color: sel ? "#fff" : "#555",
                  fontWeight: sel ? 500 : 400,
                  transition: "all 0.12s",
                }}
              >
                {op.nome}
                <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6 }}>
                  {op.qualifica}
                </span>
              </button>
            );
          })}
        </div>

        {selezionati.length > 0 && (
          <div style={{ fontSize: 12, color: "#888" }}>
            {selezionati.length} operatore{selezionati.length !== 1 ? "i" : ""} selezionat{selezionati.length !== 1 ? "i" : "o"}
          </div>
        )}

        {errore && <div style={{ color: "#dc2626", fontSize: 13 }}>{errore}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={btnSecondarioStyle}>Annulla</button>
          <button onClick={salva} disabled={salvando} style={btnPrimarioStyle}>
            {salvando ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const btnPrimarioStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  background: "#1a1a1a",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
};
const btnSecondarioStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #e5e5e3",
  background: "#fff",
  color: "#333",
  fontSize: 13,
  cursor: "pointer",
};
