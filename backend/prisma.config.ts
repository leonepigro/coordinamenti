import path from "path";
import { defineConfig } from "prisma/config";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    async adapter() {
      const { default: Database } = await import("better-sqlite3");
      const { PrismaAdapterBetterSqlite3 } = await import("prisma-adapter-better-sqlite3");
      const db = new Database(path.join("prisma", "turni.db"));
      return new PrismaAdapterBetterSqlite3(db);
    },
  },
});