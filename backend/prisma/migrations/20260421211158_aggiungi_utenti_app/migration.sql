-- CreateTable
CREATE TABLE "UtenteApp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ruolo" TEXT NOT NULL DEFAULT 'operatore',
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "operatoreId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UtenteApp_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UtenteApp_email_key" ON "UtenteApp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UtenteApp_operatoreId_key" ON "UtenteApp"("operatoreId");
