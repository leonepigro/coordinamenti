CREATE TABLE "Qualifica" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    CONSTRAINT "Qualifica_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Qualifica_nome_key" ON "Qualifica"("nome");

INSERT INTO "Qualifica" ("nome") VALUES ('OSS');
