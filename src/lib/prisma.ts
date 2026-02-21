import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { join } from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./march.db";
  const absolutePath = dbPath.startsWith("/") ? dbPath : join(process.cwd(), dbPath);
  const adapter = new PrismaBetterSqlite3({ url: `file:${absolutePath}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
