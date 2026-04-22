import { useState, useRef, useEffect } from "react";
import { chat, briefing as apiBriefing } from "../api/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Messaggio {
  ruolo: "user" | "ai";
  testo: string;
  timestamp?: Date;
}

const SUGGERIMENTI = [
  "Chi è disponibile oggi?",
  "Genera i turni di questa settimana",
  "Mostrami le indisponibilità future",
  "Dammi un riepilogo della settimana",
  "Chi può fare medicazioni?",
];

export default function ChatAI({
  messaggi,
  setMessaggi,
}: {
  messaggi: Messaggio[];
  setMessaggi: React.Dispatch<React.SetStateAction<Messaggio[]>>;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [reasoning, setReasoning] = useState<
    { tipo: string; testo: string; nome?: string }[]
  >([]);
  const [reasoningAttivo, setReasoningAttivo] = useState(false);

  const briefingCaricatoRef = useRef(false);

  useEffect(() => {
    if (!briefingCaricatoRef.current && messaggi.length <= 1) {
      briefingCaricatoRef.current = true;
      caricaBriefing();
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi, reasoning]);

  async function caricaBriefing() {
    try {
      const res = await apiBriefing.get();
      const b = res.data;
      let testo = `Buongiorno Paola! Ecco il briefing di oggi — ${b.data}.\n\n`;
      if (b.indisponibili.length > 0) {
        testo += `⚠️ Operatori assenti oggi:\n`;
        b.indisponibili.forEach((i: any) => {
          testo += `• ${i.nome}${i.motivo ? ` (${i.motivo})` : ""}\n`;
        });
        testo += "\n";
      }
      if (b.utentiSenzaCopertura.length > 0) {
        testo += `🔴 Utenti senza copertura oggi:\n`;
        b.utentiSenzaCopertura.forEach((u: string) => {
          testo += `• ${u}\n`;
        });
        testo += "\n";
      } else {
        testo += `✅ Tutti gli utenti hanno copertura oggi.\n\n`;
      }
      testo += `📊 Settimana in corso:\n`;
      testo += `• ${b.interventiOggi} interventi oggi\n`;
      testo += `• ${b.interventiSettimana} interventi questa settimana\n`;
      testo += `• ${b.operatoriAttivi} operatori · ${b.utentiAttivi} utenti in carico\n`;
      if (b.sovraccarichi.length > 0) {
        testo += `\n⚠️ Operatori in sovraccarico:\n`;
        b.sovraccarichi.forEach((s: any) => {
          testo += `• ${s.nome}: ${s.oreUsate}h su ${s.oreMax}h\n`;
        });
      }
      testo += `\nCome posso aiutarti oggi?`;
      setMessaggi((prev) => [
        ...prev,
        { ruolo: "ai", testo, timestamp: new Date() },
      ]);
    } catch {
      /* silenzioso */
    }
  }

  async function invia(testo?: string) {
    const msg = (testo ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setMessaggi((prev) => [
      ...prev,
      { ruolo: "user", testo: msg, timestamp: new Date() },
    ]);
    setLoading(true);
    setReasoning([]);
    setReasoningAttivo(true);

    try {
      const history = messaggi.map((m) => ({
        role: m.ruolo === "user" ? "user" : "assistant",
        content: m.testo,
      }));

      await chat.stream(msg, history, (event) => {
        if (event.tipo === "stato") {
          setReasoning((prev) => [
            ...prev,
            { tipo: "stato", testo: event.testo },
          ]);
        } else if (event.tipo === "tool") {
          setReasoning((prev) => [
            ...prev,
            { tipo: "tool", testo: event.testo, nome: event.nome },
          ]);
        } else if (event.tipo === "tool_ok") {
          setReasoning((prev) =>
            prev.map((r) =>
              r.nome === event.nome && r.tipo === "tool"
                ? { ...r, tipo: "tool_ok" }
                : r,
            ),
          );
        } else if (event.tipo === "risposta") {
          setReasoningAttivo(false);
          setMessaggi((prev) => [
            ...prev,
            { ruolo: "ai", testo: event.testo, timestamp: new Date() },
          ]);
        } else if (event.tipo === "errore") {
          setReasoningAttivo(false);
          setMessaggi((prev) => [
            ...prev,
            { ruolo: "ai", testo: event.testo, timestamp: new Date() },
          ]);
        } else if (event.tipo === "fine") {
          setReasoningAttivo(false);
        }
      });
    } catch {
      setReasoningAttivo(false);
      setMessaggi((prev) => [
        ...prev,
        {
          ruolo: "ai",
          testo: "Errore di connessione. Riprova.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      setReasoning([]);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bianco)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 32px 18px",
          borderBottom: "1px solid var(--bordo)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--inchiostro)",
            }}
          >
            Assistente
          </div>
          <div style={{ fontSize: 12, color: "var(--grigio)", marginTop: 2 }}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 20,
            background: "var(--salvia-light)",
            color: "var(--salvia-dark)",
            fontWeight: 500,
          }}
        >
          ● online
        </div>
      </div>

      {/* Messaggi */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {messaggi.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: m.ruolo === "user" ? "flex-end" : "flex-start",
            }}
          >
            {/* Label mittente */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 5,
                color: "var(--grigio)",
                letterSpacing: "0.04em",
              }}
            >
              {m.ruolo === "user" ? "Paola" : "Coordina*menti*"}
            </div>

            {/* Bolla */}
            <div
              style={{
                maxWidth: "68%",
                padding: "13px 16px",
                borderRadius:
                  m.ruolo === "user"
                    ? "16px 4px 16px 16px"
                    : "4px 16px 16px 16px",
                fontSize: 14,
                lineHeight: 1.7,
                background:
                  m.ruolo === "user" ? "var(--inchiostro)" : "var(--sabbia)",
                color:
                  m.ruolo === "user" ? "var(--bianco)" : "var(--inchiostro)",
                whiteSpace: "pre-wrap",
                border: m.ruolo === "ai" ? "1px solid var(--bordo)" : "none",
              }}
            >
              {m.testo}
            </div>

            {/* Timestamp */}
            {m.timestamp && (
              <div
                style={{ fontSize: 11, color: "var(--grigio)", marginTop: 4 }}
              >
                {format(m.timestamp, "HH:mm")}
              </div>
            )}
          </div>
        ))}

        {/* Reasoning in tempo reale */}
        {reasoningAttivo && reasoning.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 5,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--grigio)",
                letterSpacing: "0.04em",
              }}
            >
              Coordina*menti*
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "4px 16px 16px 16px",
                background: "var(--sabbia)",
                border: "1px solid var(--bordo)",
                minWidth: 240,
              }}
            >
              {reasoning.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color:
                      r.tipo === "tool_ok"
                        ? "var(--salvia-dark)"
                        : "var(--inchiostro-light)",
                    marginBottom: idx < reasoning.length - 1 ? 6 : 0,
                    opacity: r.tipo === "tool_ok" ? 0.6 : 1,
                  }}
                >
                  {r.tipo === "tool_ok" ? (
                    <span style={{ color: "var(--salvia-dark)", fontSize: 13 }}>
                      ✓
                    </span>
                  ) : r.tipo === "tool" ? (
                    <div style={{ display: "flex", gap: 3 }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: "var(--terra)",
                            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "var(--grigio)",
                      }}
                    />
                  )}
                  <span>{r.testo}</span>
                </div>
              ))}

              {/* Pallini sempre visibili mentre aspetta */}
              <div
                style={{
                  display: "flex",
                  gap: 5,
                  alignItems: "center",
                  marginTop: reasoning.length > 0 ? 10 : 0,
                  paddingTop: reasoning.length > 0 ? 10 : 0,
                  borderTop:
                    reasoning.length > 0 ? "1px solid var(--bordo)" : "none",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--terra)",
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && !reasoningAttivo && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 5,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--grigio)",
                letterSpacing: "0.04em",
              }}
            >
              Coordina*menti*
            </div>
            <div
              style={{
                padding: "13px 18px",
                borderRadius: "4px 16px 16px 16px",
                background: "var(--sabbia)",
                border: "1px solid var(--bordo)",
              }}
            >
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--terra)",
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggerimenti */}
      {messaggi.length <= 2 && !loading && (
        <div
          style={{
            padding: "0 32px 14px",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {SUGGERIMENTI.map((s) => (
            <button
              key={s}
              onClick={() => invia(s)}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                border: "1px solid var(--bordo)",
                background: "var(--bianco)",
                fontSize: 12,
                cursor: "pointer",
                color: "var(--inchiostro-light)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--terra-light)";
                e.currentTarget.style.borderColor = "var(--terra)";
                e.currentTarget.style.color = "var(--terra-dark)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bianco)";
                e.currentTarget.style.borderColor = "var(--bordo)";
                e.currentTarget.style.color = "var(--inchiostro-light)";
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: "12px 32px 28px",
          borderTop: "1px solid var(--bordo)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && invia()}
            placeholder="Scrivi a Coordina*menti*..."
            style={{
              flex: 1,
              padding: "12px 18px",
              border: "1.5px solid var(--bordo)",
              borderRadius: 14,
              fontSize: 14,
              outline: "none",
              background: "var(--bianco)",
              color: "var(--inchiostro)",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--terra)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--bordo)")}
          />
          <button
            onClick={() => invia()}
            disabled={loading || !input.trim()}
            style={{
              padding: "12px 24px",
              borderRadius: 14,
              border: "none",
              background:
                loading || !input.trim()
                  ? "var(--sabbia-dark)"
                  : "var(--terra)",
              color:
                loading || !input.trim() ? "var(--grigio)" : "var(--bianco)",
              fontSize: 14,
              cursor: loading || !input.trim() ? "default" : "pointer",
              fontWeight: 500,
              transition: "all 0.15s",
            }}
          >
            Invia
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
