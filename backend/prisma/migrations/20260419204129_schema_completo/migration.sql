/*
  Warnings:

  - You are about to drop the `Paziente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Visita` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Paziente";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Visita";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Skill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT
);

-- CreateTable
CREATE TABLE "OperatoreSkill" (
    "operatoreId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    PRIMARY KEY ("operatoreId", "skillId"),
    CONSTRAINT "OperatoreSkill_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OperatoreSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TipoServizio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "durata" INTEGER NOT NULL,
    "descrizione" TEXT
);

-- CreateTable
CREATE TABLE "ServizioSkill" (
    "tipoServizioId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    PRIMARY KEY ("tipoServizioId", "skillId"),
    CONSTRAINT "ServizioSkill_tipoServizioId_fkey" FOREIGN KEY ("tipoServizioId") REFERENCES "TipoServizio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServizioSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Utente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "indirizzo" TEXT NOT NULL,
    "lat" REAL,
    "lon" REAL,
    "oreSettimanali" INTEGER NOT NULL DEFAULT 10,
    "note" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PianoAssistenziale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utenteId" INTEGER NOT NULL,
    "tipoServizioId" INTEGER NOT NULL,
    "giorniSettimana" TEXT NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PianoAssistenziale_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PianoAssistenziale_tipoServizioId_fkey" FOREIGN KEY ("tipoServizioId") REFERENCES "TipoServizio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utenteId" INTEGER NOT NULL,
    "nome" TEXT,
    CONSTRAINT "Equipe_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipeMembro" (
    "equipeId" INTEGER NOT NULL,
    "operatoreId" INTEGER NOT NULL,
    "ruolo" TEXT,

    PRIMARY KEY ("equipeId", "operatoreId"),
    CONSTRAINT "EquipeMembro_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EquipeMembro_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Intervento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utenteId" INTEGER NOT NULL,
    "operatoreId" INTEGER,
    "tipoServizioId" INTEGER,
    "data" DATETIME NOT NULL,
    "turno" TEXT NOT NULL,
    "durata" INTEGER NOT NULL,
    "ordineGiornata" INTEGER,
    "completato" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Intervento_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Intervento_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Intervento_tipoServizioId_fkey" FOREIGN KEY ("tipoServizioId") REFERENCES "TipoServizio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_nome_key" ON "Skill"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoServizio_nome_key" ON "TipoServizio"("nome");
