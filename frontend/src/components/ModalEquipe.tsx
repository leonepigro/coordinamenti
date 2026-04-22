import { useState, useEffect } from "react";
import Modal from "./Modal";
import {
  equipe as apiEquipe,
  operatori as apiOperatori,
  utenti as apiUtenti,
} from "../api/client";

interface Membro {
  operatoreId: number;
  ruolo: string;
}
const RUOLI = ["principale", "backup", "alternato", "igiene", "farmaci"];

export default function ModalEquipe({
  equipe,
  onClose,
  onSalvato,
}: {
  equipe?: any;
  onClose: () => void;
  onSalvato: () => void;
}) {
  const [utenteId, setUtenteId] = useState<number>(equipe?.utenteId ?? 0);
  const [nome, setNome] = useState(equipe?.nome ?? "");
  const [membri, setMembri] = useState<Membro[]>(
    equipe?.membri?.map((m: any) => ({
      operatoreId: m.operatoreId,
      ruolo: m.ruolo ?? "backup",
    })) ?? [],
  );
  const [utenti, setUtenti] = useState<any[]>([]);
  const [operatori, setOperatori] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    apiUtenti.lista().then((r) => {
      setUtenti(r.data);
      if (!equipe) setUtenteId(r.data[0]?.id ?? 0);
    });
    apiOperatori.lista().then((r) => setOperatori(r.data));
  }, []);

  function aggiugiMembro() {
    const disponibili = operatori.filter(
      (o) => !membri.find((m) => m.operatoreId === o.id),
    );
    if (disponibili.length === 0) return;
    setMembri((prev) => [
      ...prev,
      { operatoreId: disponibili[0].id, ruolo: "backup" },
    ]);
  }

  function aggiornaMembro(
    idx: number,
    campo: keyof Membro,
    valore: string | number,
  ) {
    setMembri((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [campo]: valore } : m)),
    );
  }

  async function salva() {
    if (!utenteId) {
      setErrore("Seleziona un utente");
      return;
    }
    if (membri.length === 0) {
      setErrore("Aggiungi almeno un membro");
      return;
    }
    setSalvando(true);
    setErrore("");
    try {
      if (equipe?.id) {
        await apiEquipe.aggiorna(equipe.id, { nome, membri });
      } else {
        await apiEquipe.crea({ utenteId, nome, membri });
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
    <Modal
      titolo={equipe ? "Modifica equipe" : "Nuova equipe"}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <label style={labelStyle}>Utente *</label>
            <select
              value={utenteId}
              onChange={(e) => setUtenteId(parseInt(e.target.value))}
              style={inputStyle}
              disabled={!!equipe}
            >
              {utenti.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Nome equipe</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={inputStyle}
              placeholder="Es. Equipe mattina Rossi"
            />
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <label style={labelStyle}>Membri</label>
            <button onClick={aggiugiMembro} style={btnSecondarioStyle}>
              + Aggiungi membro
            </button>
          </div>

          {membri.length === 0 && (
            <div style={{ fontSize: 13, color: "#aaa", padding: "16px 0" }}>
              Nessun membro — clicca "Aggiungi membro"
            </div>
          )}

          {membri.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: 10,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <select
                value={m.operatoreId}
                onChange={(e) =>
                  aggiornaMembro(idx, "operatoreId", parseInt(e.target.value))
                }
                style={inputStyle}
              >
                {operatori.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
              <select
                value={m.ruolo}
                onChange={(e) => aggiornaMembro(idx, "ruolo", e.target.value)}
                style={inputStyle}
              >
                {RUOLI.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={() =>
                  setMembri((prev) => prev.filter((_, i) => i !== idx))
                }
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#dc2626",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {errore && (
          <div style={{ color: "#dc2626", fontSize: 13 }}>{errore}</div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
          }}
        >
          <button onClick={onClose} style={btnSecondarioStyle}>
            Annulla
          </button>
          <button onClick={salva} disabled={salvando} style={btnPrimarioStyle}>
            {salvando ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </Modal>
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
