import { useState, useEffect } from "react";
import type { Pagina } from "../App";

const TIPS: {
  titolo: string;
  descrizione: string;
  cta: string;
  pagina: Pagina;
}[] = [
  {
    titolo: "Assistente AI",
    descrizione:
      "Chiedi chi può sostituire un operatore assente oggi — l'AI consulta disponibilità, skill e preferenze in tempo reale.",
    cta: "Apri Assistente",
    pagina: "chat",
  },
  {
    titolo: "Cambio manuale turni",
    descrizione:
      "Clicca su qualsiasi intervento nella griglia per riassegnarlo. I candidati sono già ordinati per idoneità.",
    cta: "Vai ai Turni",
    pagina: "turni",
  },
  {
    titolo: "Archiviazione",
    descrizione:
      "Utenti e operatori possono essere archiviati con motivo e data. Lo storico è sempre consultabile nella tab Archiviati.",
    cta: "Gestisci Utenti",
    pagina: "utenti",
  },
  {
    titolo: "Ricerca per zona",
    descrizione:
      "Chiedi all'assistente chi lavora in una zona specifica — cerca per indirizzo tra operatori e utenti.",
    cta: "Apri Assistente",
    pagina: "chat",
  },
  {
    titolo: "Operatori preferiti per equipe",
    descrizione:
      "Nella scheda utente puoi assegnare operatori raggruppati per equipe e selezionare un'intera equipe con un click.",
    cta: "Gestisci Utenti",
    pagina: "utenti",
  },
  {
    titolo: "Gap ore",
    descrizione:
      "Dalla dashboard vedi subito quali utenti hanno ore scoperte rispetto al contratto e puoi proporre nuove attività.",
    cta: "Vai alla Dashboard",
    pagina: "dashboard",
  },
  {
    titolo: "Email riepilogo",
    descrizione:
      "Chiedi all'assistente di inviare il riepilogo dei turni del giorno — gli operatori ricevono la loro agenda via email.",
    cta: "Apri Assistente",
    pagina: "chat",
  },
];

export function getSplashKey() {
  return `cm_splash_${new Date().toISOString().slice(0, 10)}`;
}

export default function DailySplash({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (p: Pagina) => void;
}) {
  const [visible, setVisible] = useState(false);
  const tip = TIPS[new Date().getDay() % 7];
  const oggi = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(getSplashKey(), "1");
    onClose();
  }

  function goToFeature() {
    localStorage.setItem(getSplashKey(), "1");
    onNavigate(tip.pagina);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44,36,32,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
      onClick={dismiss}
    >
      <div
        style={{
          background: "var(--bianco)",
          borderRadius: 20,
          padding: "28px 28px 24px",
          maxWidth: 420,
          width: "calc(100vw - 40px)",
          boxShadow: "var(--shadow-modal)",
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "transform 0.3s ease, opacity 0.3s ease",
          opacity: visible ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--grigio)", textTransform: "capitalize" }}>
            {oggi}
          </div>
          <button
            onClick={dismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "var(--grigio)",
              padding: "0 0 0 12px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--terra-light)",
            color: "var(--terra-dark)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 500,
            marginBottom: 14,
          }}
        >
          💡 Funzione del giorno
        </div>

        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            color: "var(--inchiostro)",
            lineHeight: 1.25,
            marginBottom: 10,
          }}
        >
          {tip.titolo}
        </div>

        <div
          style={{
            fontSize: 14,
            color: "var(--inchiostro-light)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {tip.descrizione}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={goToFeature}
            style={{
              flex: 1,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "var(--terra)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(196,113,74,0.3)",
              transition: "transform var(--transition-base), box-shadow var(--transition-base)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "var(--shadow-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(196,113,74,0.3)";
            }}
          >
            {tip.cta}
          </button>
          <button
            onClick={dismiss}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "none",
              color: "var(--grigio)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Più tardi
          </button>
        </div>
      </div>
    </div>
  );
}
