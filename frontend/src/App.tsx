import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import TurniGriglia from "./components/TurniGriglia";
import Operatori from "./components/Operatori";
import Utenti from "./components/Utenti";
import Equipe from "./components/Equipe";
import ChatAI from "./components/ChatAI";
import Indisponibilita from "./components/Indisponibilita";
import Skill from "./components/Skills";
import PianiAssistenziali from "./components/PianiAssistenziali";
import TipiServizio from "./components/TipiServizio";
import GestioneAccount from "./components/GestioneAccount";
import Login from "./components/Login";

import { auth } from "./api/client";

export type Pagina =
  | "turni"
  | "operatori"
  | "utenti"
  | "equipe"
  | "indisponibilita"
  | "skill"
  | "servizi"
  | "chat";

interface Messaggio {
  ruolo: "user" | "ai";
  testo: string;
  timestamp?: Date;
}

export default function App() {
  const [autenticato, setAutenticato] = useState<boolean | null>(null);
  const [utente, setUtente] = useState<any>(null);
  const [pagina, setPagina] = useState<Pagina>("chat");
  const [messaggi, setMessaggi] = useState<Messaggio[]>([
    {
      ruolo: "ai",
      testo:
        "Ciao Paola! 👋 Sono il tuo assistente di Coordina*menti*.\n\nPosso aiutarti a:\n• Generare e gestire i turni settimanali\n• Trovare un sostituto in caso di assenza\n• Ottimizzare i percorsi giornalieri degli operatori\n• Consultare piani assistenziali, equipe e indisponibilità\n• Darti un riepilogo rapido della settimana\n\nCosa ti serve oggi?",
    },
  ]);

  useEffect(() => {
    const token = localStorage.getItem("cm_token");
    const utenteStr = localStorage.getItem("cm_utente");
    if (!token) {
      setAutenticato(false);
      return;
    }
    auth
      .verifica()
      .then((res) => {
        setAutenticato(true);
        setUtente(res.data.utente);
      })
      .catch(() => {
        localStorage.removeItem("cm_token");
        setAutenticato(false);
      });
  }, []);

  // se l'utente è operatore, forza la pagina turni all'avvio
  useEffect(() => {
    if (utente?.ruolo === "operatore") setPagina("turni");
  }, [utente]);

  // aggiorna onLogin
  function handleLogin(u: any) {
    setAutenticato(true);
    setUtente(u);
  }

  if (autenticato === null) {
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
        <div style={{ fontSize: 13, color: "var(--grigio)" }}>
          Caricamento...
        </div>
      </div>
    );
  }

  if (!autenticato) {
    return <Login onLogin={() => setAutenticato(true)} />;
  }
  return (
    <Layout
      pagina={pagina}
      setPagina={setPagina}
      onLogout={() => {
        auth.logout();
        setAutenticato(false);
      }}
      utente={utente}
    >
      {pagina === "turni" && <TurniGriglia />}
      {pagina === "operatori" && <Operatori />}
      {pagina === "utenti" && <Utenti />}
      {pagina === "equipe" && <Equipe />}
      {pagina === "indisponibilita" && <Indisponibilita />}
      {pagina === "skill" && <Skill />}{" "}
      {pagina === "piani" && <PianiAssistenziali />}
      {pagina === "servizi" && <TipiServizio />}
      {pagina === "chat" && (
        <ChatAI messaggi={messaggi} setMessaggi={setMessaggi} />
      )}
      {pagina === "utenti-app" && utente?.ruolo === "admin" && (
        <GestioneAccount />
      )}
    </Layout>
  );
}
