CREATE TABLE "OperatorePreferito" (
    "utenteId" INTEGER NOT NULL,
    "operatoreId" INTEGER NOT NULL,
    CONSTRAINT "OperatorePreferito_pkey" PRIMARY KEY ("utenteId", "operatoreId")
);

ALTER TABLE "OperatorePreferito" ADD CONSTRAINT "OperatorePreferito_utenteId_fkey"
    FOREIGN KEY ("utenteId") REFERENCES "Utente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OperatorePreferito" ADD CONSTRAINT "OperatorePreferito_operatoreId_fkey"
    FOREIGN KEY ("operatoreId") REFERENCES "Operatore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
