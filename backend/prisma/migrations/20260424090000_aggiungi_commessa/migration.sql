CREATE TABLE "Commessa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    CONSTRAINT "Commessa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Commessa_nome_key" ON "Commessa"("nome");

CREATE TABLE "OperatoreCommessa" (
    "operatoreId" INTEGER NOT NULL,
    "commessaId"  INTEGER NOT NULL,
    CONSTRAINT "OperatoreCommessa_pkey" PRIMARY KEY ("operatoreId", "commessaId"),
    CONSTRAINT "OperatoreCommessa_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OperatoreCommessa_commessaId_fkey"  FOREIGN KEY ("commessaId")  REFERENCES "Commessa"("id")  ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "Utente" ADD COLUMN "commessaId" INTEGER;
ALTER TABLE "Utente" ADD CONSTRAINT "Utente_commessaId_fkey" FOREIGN KEY ("commessaId") REFERENCES "Commessa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Commessa" ("nome") VALUES
    ('SAISA Mun. XII'),
    ('S.A.I.S.H.'),
    ('CONDOMINI - Donna Olimpia 30'),
    ('CONDOMINI - Donna Olimpia 5'),
    ('GONZICHI'),
    ('GIORGIO BO'),
    ('CONSOLATA'),
    ('DIMISSIONI PROTETTE'),
    ('SAISA Mun. XI'),
    ('SADISMA'),
    ('PIOPPO');
