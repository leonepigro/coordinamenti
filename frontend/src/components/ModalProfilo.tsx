import { useState } from "react";
import Modal from "./Modal";
import { auth } from "../api/client";

export default function ModalProfilo({
  utente,
  onClose,
  onAggiornato,
}: {
  utente: any;
  onClose: () => void;
  onAggiornato: (nuovaEmail: string) => void;
}) {
  const [form, setForm] = useState({
    passwordAttuale: "",
    nuovaEmail: "",
    nuovaPassword: "",
    confermaPassword: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");

  async function salva() {
    if (!form.passwordAttuale.trim()) {
      setErrore("Inserisci la password attuale");
      return;
    }
    if (form.nuovaPassword && form.nuovaPassword !== form.confermaPassword) {
      setErrore("Le password non coincidono");
      return;
    }
    if (!form.nuovaEmail.trim() && !form.nuovaPassword.trim()) {
      setErrore("Inserisci una nuova email o una nuova password");
      return;
    }
    setSalvando(true);
    setErrore("");
    try {
      const res = await auth.aggiornaProfilo({
        passwordAttuale: form.passwordAttuale,
        nuovaEmail: form.nuovaEmail.trim() || undefined,
        nuovaPassword: form.nuovaPassword.trim() || undefined,
      });
      setSuccesso("Profilo aggiornato");
      onAggiornato(res.data.email ?? utente?.email);
    } catch (err: any) {
      setErrore(err.response?.data?.errore ?? "Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titolo="Il mio profilo" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
          Account: <strong>{utente?.email ?? utente?.nome}</strong>
        </div>

        <div>
          <label style={labelStyle}>Password attuale *</label>
          <input
            type="password"
            value={form.passwordAttuale}
            onChange={(e) => setForm((f) => ({ ...f, passwordAttuale: e.target.value }))}
            style={inputStyle}
            placeholder="Password corrente"
            autoFocus
          />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #e5e5e3", margin: "4px 0" }} />

        <div>
          <label style={labelStyle}>Nuova email (lascia vuoto per non cambiare)</label>
          <input
            type="email"
            value={form.nuovaEmail}
            onChange={(e) => setForm((f) => ({ ...f, nuovaEmail: e.target.value }))}
            style={inputStyle}
            placeholder={utente?.email ?? "nuova@email.it"}
          />
        </div>

        <div>
          <label style={labelStyle}>Nuova password (lascia vuoto per non cambiare)</label>
          <input
            type="password"
            value={form.nuovaPassword}
            onChange={(e) => setForm((f) => ({ ...f, nuovaPassword: e.target.value }))}
            style={inputStyle}
            placeholder="Minimo 6 caratteri"
          />
        </div>

        {form.nuovaPassword && (
          <div>
            <label style={labelStyle}>Conferma nuova password</label>
            <input
              type="password"
              value={form.confermaPassword}
              onChange={(e) => setForm((f) => ({ ...f, confermaPassword: e.target.value }))}
              style={inputStyle}
              placeholder="Ripeti la nuova password"
            />
          </div>
        )}

        {errore && <div style={{ color: "#dc2626", fontSize: 13 }}>{errore}</div>}
        {successo && <div style={{ color: "#15803d", fontSize: 13 }}>{successo}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={btnSecondarioStyle}>
            {successo ? "Chiudi" : "Annulla"}
          </button>
          {!successo && (
            <button onClick={salva} disabled={salvando} style={btnPrimarioStyle}>
              {salvando ? "Salvataggio..." : "Salva modifiche"}
            </button>
          )}
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
