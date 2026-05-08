CREATE TABLE "FeedbackAI" (
  "id"         SERIAL PRIMARY KEY,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tipo"       TEXT NOT NULL,
  "messaggio"  TEXT NOT NULL,
  "risposta"   TEXT NOT NULL,
  "toolsUsati" TEXT[] NOT NULL DEFAULT '{}',
  "rating"     INTEGER NOT NULL,
  "nota"       TEXT,
  "contesto"   JSONB
);
