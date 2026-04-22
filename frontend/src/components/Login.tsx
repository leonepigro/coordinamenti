import { useState } from "react";
import { auth } from "../api/client";

export default function Login({ onLogin }: { onLogin: (utente: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(false);

  async function accedi() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setErrore("");
    try {
      const res = await auth.login(email, password);
      localStorage.setItem("cm_token", res.data.token);
      localStorage.setItem("cm_utente", JSON.stringify(res.data.utente));
      onLogin(res.data.utente);
    } catch (e: any) {
      setErrore(e.response?.data?.errore ?? "Errore di connessione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--sabbia)",
      }}
    >
      <div
        style={{
          width: 360,
          padding: "48px 40px",
          background: "var(--bianco)",
          borderRadius: 20,
          border: "1px solid var(--bordo)",
          boxShadow: "0 4px 24px rgba(44,36,32,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--inchiostro)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                color: "var(--terra)",
              }}
            >
              m
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--terra)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Coordina
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 300,
              color: "var(--inchiostro)",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
            }}
          >
            menti
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && accedi()}
            placeholder="paola@coordinamenti.it"
            autoFocus
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--terra)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--bordo)")}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && accedi()}
            placeholder="••••••••••••"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--terra)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--bordo)")}
          />
        </div>

        {errore && (
          <div
            style={{
              fontSize: 12,
              color: "#A02020",
              marginBottom: 12,
              marginTop: 6,
            }}
          >
            {errore}
          </div>
        )}

        <button
          onClick={accedi}
          disabled={loading || !email.trim() || !password.trim()}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: 12,
            border: "none",
            background:
              loading || !email.trim() || !password.trim()
                ? "var(--sabbia-dark)"
                : "var(--terra)",
            color:
              loading || !email.trim() || !password.trim()
                ? "var(--grigio)"
                : "var(--bianco)",
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 500,
            marginTop: 8,
          }}
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--grigio)",
            marginTop: 24,
          }}
        >
          Gestione servizi domiciliari · Coordina*menti*
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--grigio)",
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "1.5px solid var(--bordo)",
  borderRadius: 12,
  fontSize: 14,
  outline: "none",
  background: "var(--bianco)",
  color: "var(--inchiostro)",
  boxSizing: "border-box" as const,
  transition: "border-color 0.15s",
};
