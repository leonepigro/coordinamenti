# Coordinamenti

Applicazione web per la gestione dei turni di assistenza domiciliare. Permette alla coordinatrice di generare turni settimanali, ottimizzare i percorsi degli operatori e gestire assenze e sostituzioni — il tutto assistita da un'AI conversazionale.

---

## Funzionalità principali

### Turni
- Griglia con viste giorno / settimana / mese
- **Generazione automatica** dei turni da piani assistenziali ricorrenti, rispettando skill, ore contrattuali, equipe e indisponibilità
- **Ottimizzazione percorso**: riordina gli interventi giornalieri di un operatore col minor numero di km (algoritmo nearest neighbor, considera il mezzo di trasporto) e genera il link Google Maps

### Operatori e utenti
- CRUD completo con geocodifica automatica degli indirizzi (Nominatim/OSM)
- Assegnazione skill agli operatori e skill richieste per ogni tipo di servizio
- Import massivo da file Excel

### Piani assistenziali ed equipe
- Servizi ricorrenti per utente (es. "Igiene personale lun-ven alle 10:00")
- Equipe per ogni utente con ruoli (principale, backup, alternato…) — gli operatori dell'equipe sono preferiti nell'assegnazione

### Indisponibilità
- Registrazione assenze con ricalcolo automatico: il sistema trova un sostituto idoneo rispettando skill, ore disponibili e appartenenza all'equipe

### Assistente AI
- Chat in streaming con briefing giornaliero automatico (assenti, utenti senza copertura, sovraccarichi)
- 14 tool attivi: genera turni, ottimizza percorso, trova sostituto, interroga operatori/utenti/interventi/statistiche…
- Fallback automatico: Ollama locale → Groq (LLaMA 3.3 70B)

### Autenticazione e ruoli
- Ruoli: `admin`, `coordinatore`, `operatore`
- Gli operatori vedono solo i propri turni
- Token JWT, password hashate con bcrypt

---

## Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript, Vite |
| Backend | Node.js + TypeScript, Express 5 |
| Database | SQLite via Prisma ORM |
| AI | OpenAI SDK → Ollama (locale) / Groq |
| Geocodifica | Nominatim (OpenStreetMap) |
| Routing | OSRM (OpenStreetMap Routing Machine) |
| Auth | JWT + bcrypt |
| Import | XLSX (Excel) |

---

## Avvio in sviluppo

### Prerequisiti
- Node.js ≥ 18
- Ollama installato localmente (opzionale, usato come AI primaria)

### Backend

```bash
cd backend
npm install
```

Crea il file `.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=cambia_questo_valore
GROQ_API_KEY=gsk_...          # necessario solo se Ollama non è disponibile
PAOLA_PASSWORD=password_coordinatrice
```

Inizializza il database e avvia:

```bash
npx prisma migrate deploy
npx prisma db seed            # crea utenti e dati di esempio
npm run dev                   # http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

---

## Struttura del progetto

```
coordinamenti/
├── backend/
│   ├── src/
│   │   ├── index.ts          # entry point, server Express
│   │   ├── router.ts         # tutte le route API
│   │   ├── scheduler.ts      # logica generazione/assegnazione turni
│   │   └── tools.ts          # tool dell'assistente AI
│   └── prisma/
│       ├── schema.prisma     # schema database
│       ├── migrations/       # migrazioni SQL
│       └── seed.ts           # dati iniziali
└── frontend/
    └── src/
        ├── App.tsx            # root, routing, autenticazione
        ├── api/client.ts      # Axios con Bearer token
        └── components/
            ├── TurniGriglia.tsx
            ├── Operatori.tsx
            ├── Utenti.tsx
            ├── PianiAssistenziali.tsx
            ├── Equipe.tsx
            ├── Indisponibilita.tsx
            ├── ChatAI.tsx
            └── ...
```

---

## API principali

| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/api/login` | Autenticazione, restituisce JWT |
| GET | `/api/operatori` | Lista operatori |
| GET | `/api/utenti` | Lista utenti |
| GET | `/api/interventi` | Interventi (filtri: data, operatore, utente) |
| POST | `/api/genera-turni` | Genera turni automatici in un range di date |
| POST | `/api/ottimizza-percorso` | Riordina interventi giornalieri per distanza |
| POST | `/api/trova-sostituto` | Trova sostituto per un'indisponibilità |
| GET | `/api/briefing` | Riepilogo giornaliero per l'AI |
| POST | `/api/chat` | Chat streaming con l'assistente AI |
| GET | `/api/turni-miei` | Turni del solo operatore autenticato |

---

## Note di sicurezza

Il file `.env` non è incluso nel repository. Prima di avviare il backend crea il file con i valori reali. Non usare i valori di esempio in produzione.
