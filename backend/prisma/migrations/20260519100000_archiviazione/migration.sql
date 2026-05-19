ALTER TABLE "Operatore" ADD COLUMN "dataArchiviazione" TIMESTAMP(3);
ALTER TABLE "Operatore" ADD COLUMN "motivoArchiviazione" TEXT;

ALTER TABLE "Utente" ADD COLUMN "dataArchiviazione" TIMESTAMP(3);
ALTER TABLE "Utente" ADD COLUMN "motivoArchiviazione" TEXT;
