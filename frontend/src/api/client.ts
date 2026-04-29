import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

export default api;

export const scheduling = {
  genera: (dataInizio: string, dataFine: string) =>
    api.post("/scheduling/genera", { dataInizio, dataFine }),
};

export const routing = {
  ottimizza: (operatoreId: number, data: string) =>
    api.post("/routing/ottimizza", { operatoreId, data }),
};

export const interventi = {
  perGiorno: (data: string) => api.get(`/interventi?data=${data}`),
  perSettimana: (dataInizio: string, dataFine: string) =>
    api.get(`/interventi?dataInizio=${dataInizio}&dataFine=${dataFine}`),
  elimina: (dataInizio: string, dataFine: string) =>
    api.delete("/interventi", { params: { dataInizio, dataFine } }),
};

export const commesse = {
  lista: () => api.get("/commesse"),
  crea: (nome: string) => api.post("/commesse", { nome }),
};

export const qualifiche = {
  lista: () => api.get("/qualifiche"),
  crea: (nome: string) => api.post("/qualifiche", { nome }),
};

export const skill = {
  lista: () => api.get("/skill"),
  crea: (data: { nome: string; descrizione?: string }) =>
    api.post("/skill", data),
  aggiorna: (id: number, data: { nome: string; descrizione?: string }) =>
    api.put(`/skill/${id}`, data),
  elimina: (id: number) => api.delete(`/skill/${id}`),
};

export const operatori = {
  lista: () => api.get("/operatori"),
  crea: (data: any) => api.post("/operatori", data),
  aggiorna: (id: number, data: any) => api.put(`/operatori/${id}`, data),
  elimina: (id: number) => api.delete(`/operatori/${id}`),
};

export const utenti = {
  lista: () => api.get("/utenti"),
  crea: (data: any) => api.post("/utenti", data),
  aggiorna: (id: number, data: any) => api.put(`/utenti/${id}`, data),
  elimina: (id: number) => api.delete(`/utenti/${id}`),
};

export const equipe = {
  lista: () => api.get("/equipe"),
  crea: (data: any) => api.post("/equipe", data),
  aggiorna: (id: number, data: any) => api.put(`/equipe/${id}`, data),
  elimina: (id: number) => api.delete(`/equipe/${id}`),
};

export const indisponibilita = {
  lista: (operatoreId?: number) =>
    api.get("/indisponibilita", { params: operatoreId ? { operatoreId } : {} }),
  crea: (data: { operatoreId: number; data: string; motivo?: string }) =>
    api.post("/indisponibilita", data),
  elimina: (id: number) => api.delete(`/indisponibilita/${id}`),
  ricalcola: (operatoreId: number, data: string) =>
    api.post("/indisponibilita/ricalcola", { operatoreId, data }),
};

export const piani = {
  lista: (utenteId?: number) =>
    api.get("/piani", { params: utenteId ? { utenteId } : {} }),
  crea: (data: {
    utenteId: number;
    tipoServizioId: number;
    giorniSettimana: string;
    oraInizio: string;
  }) => api.post("/piani", data),
  aggiorna: (
    id: number,
    data: {
      tipoServizioId: number;
      giorniSettimana: string;
      oraInizio: string;
    },
  ) => api.put(`/piani/${id}`, data),
  elimina: (id: number) => api.delete(`/piani/${id}`),
};

export const tipiServizio = {
  lista: () => api.get("/tipi-servizio"),
  crea: (data: any) => api.post("/tipi-servizio", data),
  aggiorna: (id: number, data: any) => api.put(`/tipi-servizio/${id}`, data),
  elimina: (id: number) => api.delete(`/tipi-servizio/${id}`),
};

export const briefing = {
  get: () => api.get("/briefing"),
  candidati: (interventoId: number) =>
    api.get(`/interventi/${interventoId}/candidati`),
  assegna: (interventoId: number, operatoreId: number) =>
    api.put(`/interventi/${interventoId}/assegna`, { operatoreId }),
};

export const chat = {
  invia: (message: string, history: any[]) =>
    api.post("/chat", { message, history }),
  stream: (
    message: string,
    history: any[],
    onEvent: (event: any) => void,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      })
        .then((res) => {
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          function leggi() {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  resolve();
                  return;
                }
                buffer += decoder.decode(value, { stream: true });
                const righe = buffer.split("\n\n");
                buffer = righe.pop() ?? "";
                righe.forEach((riga) => {
                  if (riga.startsWith("data: ")) {
                    try {
                      const data = JSON.parse(riga.slice(6));
                      onEvent(data);
                    } catch {
                      /* ignora righe malformate */
                    }
                  }
                });
                leggi();
              })
              .catch(reject);
          }
          leggi();
        })
        .catch(reject);
    });
  },
};

export const importa = {
  operatori: (righe: any[]) => api.post("/import/operatori", { righe }),
  utenti: (righe: any[]) => api.post("/import/utenti", { righe }),
};

export const auth = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  verifica: () => api.get("/auth/verifica"),
  logout: () => {
    localStorage.removeItem("cm_token");
    localStorage.removeItem("cm_utente");
    window.location.href = "/";
  },
};

export const utentiApp = {
  lista: () => api.get("/utenti-app"),
  crea: (data: any) => api.post("/utenti-app", data),
  aggiorna: (id: number, data: any) => api.put(`/utenti-app/${id}`, data),
  elimina: (id: number) => api.delete(`/utenti-app/${id}`),
};

// Interceptor: aggiunge il token a ogni richiesta
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: se 401 redirect al login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("cm_token");
      window.location.href = "/";
    }
    return Promise.reject(err);
  },
);
