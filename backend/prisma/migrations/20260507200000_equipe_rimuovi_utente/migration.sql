-- Equipe diventa gruppo standalone: rimuovi utenteId e rendi nome obbligatorio

-- Imposta nome dove è NULL (fallback al cognome dell'utente associato)
UPDATE "Equipe" SET "nome" = 'Equipe ' || "id" WHERE "nome" IS NULL;

-- Drop FK verso Utente
ALTER TABLE "Equipe" DROP CONSTRAINT IF EXISTS "Equipe_utenteId_fkey";

-- Rimuovi colonna utenteId
ALTER TABLE "Equipe" DROP COLUMN IF EXISTS "utenteId";

-- Rendi nome NOT NULL
ALTER TABLE "Equipe" ALTER COLUMN "nome" SET NOT NULL;
