-- CreateTable
CREATE TABLE "Operatore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "qualifica" TEXT NOT NULL,
    "oreSettimanali" INTEGER NOT NULL DEFAULT 36,
    "indirizzo" TEXT NOT NULL,
    "lat" REAL,
    "lon" REAL,
    "preferenzaTurno" TEXT,
    "telefono" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Paziente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "indirizzo" TEXT NOT NULL,
    "lat" REAL,
    "lon" REAL,
    "qualificaRichiesta" TEXT NOT NULL,
    "durataVisita" INTEGER NOT NULL DEFAULT 60,
    "turnoPreferito" TEXT,
    "note" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Visita" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pazienteId" INTEGER NOT NULL,
    "operatoreId" INTEGER,
    "data" DATETIME NOT NULL,
    "turno" TEXT NOT NULL,
    "durata" INTEGER NOT NULL,
    "ordineGiornata" INTEGER,
    "completata" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visita_pazienteId_fkey" FOREIGN KEY ("pazienteId") REFERENCES "Paziente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visita_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Indisponibilita" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "operatoreId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "motivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Indisponibilita_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
