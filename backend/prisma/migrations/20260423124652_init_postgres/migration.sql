-- CreateTable
CREATE TABLE "Operatore" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "qualifica" TEXT NOT NULL,
    "oreSettimanali" INTEGER NOT NULL DEFAULT 36,
    "indirizzo" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "preferenzaTurno" TEXT,
    "telefono" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mezzoTrasporto" TEXT NOT NULL DEFAULT 'foot',

    CONSTRAINT "Operatore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatoreSkill" (
    "operatoreId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    CONSTRAINT "OperatoreSkill_pkey" PRIMARY KEY ("operatoreId","skillId")
);

-- CreateTable
CREATE TABLE "TipoServizio" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "durata" INTEGER NOT NULL,
    "descrizione" TEXT,

    CONSTRAINT "TipoServizio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServizioSkill" (
    "tipoServizioId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    CONSTRAINT "ServizioSkill_pkey" PRIMARY KEY ("tipoServizioId","skillId")
);

-- CreateTable
CREATE TABLE "Utente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "indirizzo" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "oreSettimanali" INTEGER NOT NULL DEFAULT 10,
    "note" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PianoAssistenziale" (
    "id" SERIAL NOT NULL,
    "utenteId" INTEGER NOT NULL,
    "tipoServizioId" INTEGER NOT NULL,
    "giorniSettimana" TEXT NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PianoAssistenziale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipe" (
    "id" SERIAL NOT NULL,
    "utenteId" INTEGER NOT NULL,
    "nome" TEXT,

    CONSTRAINT "Equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipeMembro" (
    "equipeId" INTEGER NOT NULL,
    "operatoreId" INTEGER NOT NULL,
    "ruolo" TEXT,

    CONSTRAINT "EquipeMembro_pkey" PRIMARY KEY ("equipeId","operatoreId")
);

-- CreateTable
CREATE TABLE "Intervento" (
    "id" SERIAL NOT NULL,
    "utenteId" INTEGER NOT NULL,
    "operatoreId" INTEGER,
    "tipoServizioId" INTEGER,
    "data" TIMESTAMP(3) NOT NULL,
    "turno" TEXT NOT NULL,
    "durata" INTEGER NOT NULL,
    "ordineGiornata" INTEGER,
    "completato" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Intervento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indisponibilita" (
    "id" SERIAL NOT NULL,
    "operatoreId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Indisponibilita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtenteApp" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ruolo" TEXT NOT NULL DEFAULT 'operatore',
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "operatoreId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtenteApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_nome_key" ON "Skill"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoServizio_nome_key" ON "TipoServizio"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "UtenteApp_email_key" ON "UtenteApp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UtenteApp_operatoreId_key" ON "UtenteApp"("operatoreId");

-- AddForeignKey
ALTER TABLE "OperatoreSkill" ADD CONSTRAINT "OperatoreSkill_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatoreSkill" ADD CONSTRAINT "OperatoreSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServizioSkill" ADD CONSTRAINT "ServizioSkill_tipoServizioId_fkey" FOREIGN KEY ("tipoServizioId") REFERENCES "TipoServizio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServizioSkill" ADD CONSTRAINT "ServizioSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PianoAssistenziale" ADD CONSTRAINT "PianoAssistenziale_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PianoAssistenziale" ADD CONSTRAINT "PianoAssistenziale_tipoServizioId_fkey" FOREIGN KEY ("tipoServizioId") REFERENCES "TipoServizio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipe" ADD CONSTRAINT "Equipe_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipeMembro" ADD CONSTRAINT "EquipeMembro_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipeMembro" ADD CONSTRAINT "EquipeMembro_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervento" ADD CONSTRAINT "Intervento_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "Utente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervento" ADD CONSTRAINT "Intervento_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervento" ADD CONSTRAINT "Intervento_tipoServizioId_fkey" FOREIGN KEY ("tipoServizioId") REFERENCES "TipoServizio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indisponibilita" ADD CONSTRAINT "Indisponibilita_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtenteApp" ADD CONSTRAINT "UtenteApp_operatoreId_fkey" FOREIGN KEY ("operatoreId") REFERENCES "Operatore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
