import { useState, useEffect } from "react";
import Modal from "./Modal";
import { operatori as apiOperatori, utenti as apiUtenti, equipe as apiEquipe } from "../api/client";

interface Operatore { id: number; nome: string; qualifica: string }
interface Equipe { id: number; nome: string; membri: { operatore: Operatore }[] }

export default function ModalOperatoriPreferiti({
  utenteId,
  utente,
  preferiti: preferitiIniziali,
  onClose,
  onSalvato,
}: {
  utenteId: number;
  utente: string;
  preferiti: number[];
  onClose: () => void;
  onSalvato: () => void;
}) {
  const [operatori, setOperatori] = useState<Operatore[]>([]);
  const [equipe, setEquipe] = useState<Equipe[]>([]);
  const [selezionati, setSelezionati] = useState<number[]>(preferitiIniziali);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    Promise.all([apiOperatori.lista(), apiEquipe.lista()]).then(([rOp, rEq]) => {
      setOperatori(rOp.data);
      setEquipe(rEq.data);
    });
  }, []);

  function toggle(id: number) {
    setSelezionati((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleEquipe(ids: number[]) {
    const tuttiSel = ids.every((id) => selezionati.includes(id));
    if (tuttiSel) {
      setSelezionati((prev) => prev.filter((x) => !ids.includes(x)));
    } else {
      setSelezionati((prev) => [...new Set([...prev, ...ids])]);
    }
  }

  async function salva() {
    setSalvando(true);
    setErrore("");
    try {
      await apiUtenti.setOperatoriPreferiti(utenteId, selezionati);
      onSalvato();
      onClose();
    } catch {
      setErrore("Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  }

  const idInEquipe = new Set(equipe.flatMap((e) => e.membri.map((m) => m.operatore.id)));
  const senzaEquipe = operatori.filter((op) => !idInEquipe.has(op.id));

  return (
    <Modal titolo={`Operatori preferiti — ${utente}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 13, color: "#666" }}>
          Gli operatori selezionati vengono assegnati per primi. Se nessuno è disponibile, lo scheduler cerca nel pool generale.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "52vh", overflowY: "auto" }}>
          {equipe.map((eq) => {
            const ids = eq.membri.map((m) => m.operatore.id);
            const tuttiSel = ids.length > 0 && ids.every((id) => selezionati.includes(id));
            const alcuniSel = ids.some((id) => selezionati.includes(id));
            return (
              <div key={eq.id}>
                {/* Header equipe */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--inchiostro)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {eq.nome}
                    <span style={{ fontSize: 11, fontWeight: 400, color: "var(--grigio)", marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>
                      {eq.membri.length} membro/i
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleEquipe(ids)}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 12,
                      border: tuttiSel ? "1.5px solid var(--terra)" : alcuniSel ? "1.5px solid var(--terra)" : "1px solid #e5e5e3",
                      background: tuttiSel ? "var(--terra)" : alcuniSel ? "var(--terra-light)" : "#fff",
                      color: tuttiSel ? "#fff" : alcuniSel ? "var(--terra-dark)" : "#555",
                      cursor: "pointer",
                    }}
                  >
                    {tuttiSel ? "Deseleziona tutti" : "Seleziona tutti"}
                  </button>
                </div>
                {/* Operatori equipe */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {eq.membri.map(({ operatore: op }) => {
                    const sel = selezionati.includes(op.id);
                    return (
                      <ChipOperatore key={op.id} op={op} sel={sel} onClick={() => toggle(op.id)} />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {senzaEquipe.length > 0 && (
            <div>
              {equipe.length > 0 && (
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--inchiostro)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Altri operatori
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {senzaEquipe.map((op) => {
                  const sel = selezionati.includes(op.id);
                  return (
                    <ChipOperatore key={op.id} op={op} sel={sel} onClick={() => toggle(op.id)} />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: "#888" }}>
          {selezionati.length === 0
            ? "Nessun preferito — lo scheduler usa il pool generale"
            : `${selezionati.length} operatore/i selezionato/i`}
        </div>

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

function ChipOperatore({ op, sel, onClick }: { op: { id: number; nome: string; qualifica: string }; sel: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 20,
        fontSize: 13,
        cursor: "pointer",
        border: sel ? "1.5px solid var(--terra)" : "1px solid #e5e5e3",
        background: sel ? "var(--terra)" : "#fff",
        color: sel ? "#fff" : "#555",
        fontWeight: sel ? 500 : 400,
        transition: "all 0.12s",
      }}
    >
      {op.nome}
      <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>{op.qualifica}</span>
    </button>
  );
}

const btnPrimarioStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  background: "var(--terra)",
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
