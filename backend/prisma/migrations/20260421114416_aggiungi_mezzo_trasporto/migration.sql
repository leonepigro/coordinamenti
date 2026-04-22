-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Operatore" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mezzoTrasporto" TEXT NOT NULL DEFAULT 'foot'
);
INSERT INTO "new_Operatore" ("attivo", "createdAt", "id", "indirizzo", "lat", "lon", "nome", "oreSettimanali", "preferenzaTurno", "qualifica", "telefono") SELECT "attivo", "createdAt", "id", "indirizzo", "lat", "lon", "nome", "oreSettimanali", "preferenzaTurno", "qualifica", "telefono" FROM "Operatore";
DROP TABLE "Operatore";
ALTER TABLE "new_Operatore" RENAME TO "Operatore";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
