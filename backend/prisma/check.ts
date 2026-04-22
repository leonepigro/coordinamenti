import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const operatori = await prisma.operatore.findMany();
  const pazienti = await prisma.paziente.findMany();
  console.log("Operatori:", operatori.length, operatori.map(o => o.nome));
  console.log("Pazienti:", pazienti.length, pazienti.map(p => p.nome));
}

main().finally(() => prisma.$disconnect());