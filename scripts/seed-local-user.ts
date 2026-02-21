/**
 * Seed a local user in the SQLite database.
 * Usage: npx tsx scripts/seed-local-user.ts
 *
 * This creates a default user so you can use the app without OAuth.
 * After running, sign in via Google OAuth to get a valid session cookie.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { join } from "path";

const dbPath = (process.env.DATABASE_URL || "file:./march.db").replace("file:", "");
const absolutePath = dbPath.startsWith("/") ? dbPath : join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url: `file:${absolutePath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "local@march.cat" },
    create: {
      email: "local@march.cat",
      name: "Local User",
    },
    update: {},
  });

  console.log("Seeded user:", user.id, user.email);
  console.log("\nSign in via Google OAuth to get a session cookie.");
  console.log("The OAuth callback will upsert your real user record.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
