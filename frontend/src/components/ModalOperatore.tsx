import { useState, useEffect } from "react";
import Modal from "./Modal";
import { skill as apiSkill, operatori as apiOperatori } from "../api/client";
import InputIndirizzo from "./InputIndirizzo";

interface Skill {
  id: number;
  nome: string;
}
interface OperatoreForm {
  id?: number;
  nome: string;
  qualifica: string;
  oreSettimanali: number;
  indirizzo: string;
  preferenzaTurno: string;
  telefono: string;
  email: string;
  skillIds: number[];
  mezzoTrasporto: string;
  lat?: number;
  lon?: number;
}

const QUALIFICHE = ["OSS", "Infermiere", "Fisioterapista", "ASA"];
const TURNI = ["mattina", "pomeriggio"];
const MEZZI = [
  { value: "driving", label: "Auto privata" },
  { value: "cycling", label: "Bicicletta" },
  { value: "foot", label: "A piedi / Trasporto pubblico" },
];

export default function ModalOperatore({
  operatore,
  onClose,
  onSalvato,
}: {
  operatore?: any;
  onClose: () => void;
  onSalvato: () => void;
}) {
  const [form, setForm] = useState<OperatoreForm>({
    nome: operatore?.nome ?? "",
    qualifica: operatore?.qualifica ?? "OSS",
    oreSettimanali: operatore?.oreSettimanali ?? 36,
    preferenzaTurno: operatore?.preferenzaTurno ?? "mattina",
    telefono: operatore?.telefono ?? "",
    email: operatore?.email ?? "",
    skillIds: operatore?.skills?.map((s: any) => s.skillId) ?? [],
    mezzoTrasporto: operatore?.mezzoTrasporto ?? "foot",
    indirizzo: operatore?.indirizzo ?? "",
    lat: operatore?.lat ?? undefined,
    lon: operatore?.lon ?? undefined,
  });
  const [skillDisponibili, setSkillDisponibili] = useState<Skill[]>([]);
  const [nuovaSkill, setNuovaSkill] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    apiSkill.lista().then((r) => setSkillDisponibili(r.data));
  }, []);

  function toggleSkill(id: number) {
    setForm((f) => ({
      ...f,
      skillIds: f.skillIds.includes(id)
        ? f.skillIds.filter((s) => s !== id)
        : [...f.skillIds, id],
    }));
  }

  async function aggiungiSkill() {
    if (!nuovaSkill.trim()) return;
    const res = await apiSkill.crea({ nome: nuovaSkill.trim() });
    setSkillDisponibili((prev) => [...prev, res.data]);
    setForm((f) => ({ ...f, skillIds: [...f.skillIds, res.data.id] }));
    setNuovaSkill("");
  }

  async function salva() {
    if (!form.nome.trim() || !form.indirizzo.trim()) {
      setErrore("Nome e indirizzo sono obbligatori");
      return;
    }
    setSalvando(true);
    setErrore("");
    try {
      if (operatore?.id) {
        await apiOperatori.aggiorna(operatore.id, form);
      } else {
        await apiOperatori.crea(form);
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
      titolo={operatore ? "Modifica operatore" : "Nuovo operatore"}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              style={inputStyle}
              placeholder="Es. Maria Rossi"
            />
          </div>
          <div>
            <label style={labelStyle}>Telefono</label>
            <input
              value={form.telefono}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefono: e.target.value }))
              }
              style={inputStyle}
              placeholder="333-1234567"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Email (per ricezione turni)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              style={inputStyle}
              placeholder="maria.rossi@email.it"
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Qualifica *</label>
            <select
              value={form.qualifica}
              onChange={(e) =>
                setForm((f) => ({ ...f, qualifica: e.target.value }))
              }
              style={inputStyle}
            >
              {QUALIFICHE.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Ore settimanali</label>
            <input
              type="number"
              value={form.oreSettimanali}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  oreSettimanali: parseInt(e.target.value),
                }))
              }
              style={inputStyle}
              min={1}
              max={40}
            />
          </div>
          <div>
            <label style={labelStyle}>Preferenza turno</label>
            <select
              value={form.preferenzaTurno}
              onChange={(e) =>
                setForm((f) => ({ ...f, preferenzaTurno: e.target.value }))
              }
              style={inputStyle}
            >
              {TURNI.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Mezzo di trasporto</label>
            <select
              value={form.mezzoTrasporto}
              onChange={(e) =>
                setForm((f) => ({ ...f, mezzoTrasporto: e.target.value }))
              }
              style={inputStyle}
            >
              {MEZZI.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          ;
        </div>

        <div>
          <div>
            <label style={labelStyle}>Indirizzo *</label>
            <InputIndirizzo
              valore={form.indirizzo}
              onChange={(indirizzo, lat, lon) =>
                setForm((f) => ({ ...f, indirizzo, lat, lon }))
              }
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Skill</label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {skillDisponibili.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSkill(s.id)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: "pointer",
                  border: form.skillIds.includes(s.id)
                    ? "1.5px solid #1a1a1a"
                    : "1px solid #e5e5e3",
                  background: form.skillIds.includes(s.id) ? "#1a1a1a" : "#fff",
                  color: form.skillIds.includes(s.id) ? "#fff" : "#555",
                }}
              >
                {s.nome}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={nuovaSkill}
              onChange={(e) => setNuovaSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && aggiungiSkill()}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Aggiungi nuova skill..."
            />
            <button onClick={aggiungiSkill} style={btnSecondarioStyle}>
              + Aggiungi
            </button>
          </div>
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
