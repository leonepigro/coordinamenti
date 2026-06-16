import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway internal network (.railway.internal) non richiede SSL
  // Per connessioni esterne accettiamo cert self-signed
  ssl: process.env.DATABASE_URL?.includes(".railway.internal")
    ? false
    : process.env.DATABASE_URL?.startsWith("postgresql://")
      ? { rejectUnauthorized: false }
      : false,
});

export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
