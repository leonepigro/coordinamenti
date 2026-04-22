import type { Pagina } from "../App";

const tutteLeVoci = [
  {
    id: "dashboard",
    label: "Situazione",
    icona: "◈",
    gruppo: "principale",
    ruoli: ["admin", "coordinatore"],
  },
  {
    id: "chat",
    label: "Assistente",
    icona: "✦",
    gruppo: "principale",
    ruoli: ["admin", "coordinatore"],
  },
  {
    id: "turni",
    label: "Turni",
    icona: "▦",
    gruppo: "principale",
    ruoli: ["admin", "coordinatore", "operatore"],
  },
  {
    id: "operatori",
    label: "Operatori",
    icona: "◎",
    gruppo: "anagrafica",
    ruoli: ["admin", "coordinatore"],
  },
  {
    id: "utenti",
    label: "Utenti",
    icona: "⌂",
    gruppo: "anagrafica",
    ruoli: ["admin", "coordinatore"],
  },
  {
    id: "equipe",
    label: "Equipe",
    icona: "◈",
    gruppo: "anagrafica",
    ruoli: ["admin", "coordinatore"],
  },
  {
    id: "indisponibilita",
    label: "Indisponibilità",
    icona: "◷",
    gruppo: "anagrafica",
    ruoli: ["admin", "coordinatore", "operatore"],
  },
  {
    id: "skill",
    label: "Skill",
    icona: "◆",
    gruppo: "configurazione",
    ruoli: ["admin"],
  },
  {
    id: "servizi",
    label: "Servizi",
    icona: "◉",
    gruppo: "configurazione",
    ruoli: ["admin"],
  },
  {
    id: "utenti-app",
    label: "Account",
    icona: "⊙",
    gruppo: "configurazione",
    ruoli: ["admin"],
  },
] as const;

export default function Layout({
  pagina,
  setPagina,
  children,
  onLogout,
  utente,
}: {
  pagina: Pagina;
  setPagina: (p: Pagina) => void;
  children: React.ReactNode;
  onLogout: () => void;
  utente: any;
}) {
  const ruolo = utente?.ruolo ?? "operatore";

  const voci = tutteLeVoci.filter((v) =>
    (v.ruoli as readonly string[]).includes(ruolo),
  );

  const gruppi = [
    { id: "principale", label: null },
    { id: "anagrafica", label: "Anagrafica" },
    { id: "configurazione", label: "Configurazione" },
  ];

  return (
    <div
      style={{ display: "flex", height: "100vh", background: "var(--sabbia)" }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 236,
          background: "var(--inchiostro)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "28px 20px 24px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--terra)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Coordina
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 300,
              color: "var(--bianco)",
              fontFamily: "'DM Serif Display', serif",
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontStyle: "italic" }}>menti</span>
          </div>
          <div
            style={{
              width: 32,
              height: 1.5,
              background: "var(--terra)",
              marginTop: 12,
              borderRadius: 1,
            }}
          />
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 12px", overflowY: "auto" }}>
          {gruppi.map((gruppo) => {
            const vociGruppo = voci.filter((v) => v.gruppo === gruppo.id);
            return (
              <div key={gruppo.id} style={{ marginBottom: 8 }}>
                {gruppo.label && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--grigio)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "10px 8px 6px",
                    }}
                  >
                    {gruppo.label}
                  </div>
                )}
                {vociGruppo.map((v) => {
                  const attiva = pagina === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setPagina(v.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "9px 10px",
                        marginBottom: 1,
                        background: attiva ? "var(--terra)" : "transparent",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        color: attiva ? "var(--bianco)" : "var(--grigio)",
                        fontSize: 13,
                        fontWeight: attiva ? 500 : 400,
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!attiva)
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.06)";
                        e.currentTarget.style.color = "var(--bianco)";
                      }}
                      onMouseLeave={(e) => {
                        if (!attiva) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--grigio)";
                        }
                      }}
                    >
                      <span style={{ fontSize: 13, opacity: attiva ? 1 : 0.7 }}>
                        {v.icona}
                      </span>
                      {v.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        {/* Footer */}{" "}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--grigio)" }}>
            AI locale · Ollama
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              marginTop: 2,
              marginBottom: 10,
            }}
          >
            qwen2.5:14b
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--bianco)",
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            {utente?.nome ?? ""}
          </div>
          <div
            style={{ fontSize: 11, color: "var(--grigio)", marginBottom: 10 }}
          >
            {utente?.ruolo ?? ""}
          </div>
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: "var(--grigio)",
              fontSize: 12,
              cursor: "pointer",
              textAlign: "left" as const,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "var(--bianco)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--grigio)";
            }}
          >
            ← Esci
          </button>
        </div>
      </aside>

      {/* Contenuto */}
      <main style={{ flex: 1, overflow: "auto", background: "var(--bianco)" }}>
        {children}
      </main>
    </div>
  );
}
