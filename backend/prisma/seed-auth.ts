import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Prendi il primo operatore esistente per collegarlo a Paola
  const operatori = await prisma.operatore.findMany({ orderBy: { id: "asc" } });

  await prisma.utenteApp.upsert({
    where: { email: "paola@coordinamenti.it" },
    update: {},
    create: {
      email: "paola@coordinamenti.it",
      nome: "Paola",
      passwordHash: bcrypt.hashSync("coordinamenti2026", 10),
      ruolo: "admin",
    },
  });

  // Crea un account operatore per ogni operatore esistente
  for (const op of operatori) {
    const email = `${op.nome.split(" ")[1]?.toLowerCase() ?? op.id}@coordinamenti.it`;
    await prisma.utenteApp.upsert({
      where: { email },
      update: {},
      create: {
        email,
        nome: op.nome,
        passwordHash: bcrypt.hashSync("operatore123", 10),
        ruolo: "operatore",
        operatoreId: op.id,
      },
    });
    console.log(`✓ Account creato: ${email}`);
  }

  console.log("Seed auth completato!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
