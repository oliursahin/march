import { readdir, readFile, writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Vault directory — defaults to ./vault relative to project root
const VAULT_DIR = process.env.VAULT_DIR || join(process.cwd(), "vault");

// --- Frontmatter types ---

interface ObjectFrontmatter {
  id: string;
  type: string;
  status: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  gmailId: string;
  gmailUrl: string;
  dueDate: string | null;
  receivedAt: string;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata: string | null;
}

export interface VaultObject extends ObjectFrontmatter {
  bodyText: string;
}

// --- Vault directory management ---

export function getVaultDir(): string {
  return VAULT_DIR;
}

export async function ensureVaultDir(): Promise<void> {
  if (!existsSync(VAULT_DIR)) {
    await mkdir(VAULT_DIR, { recursive: true });
  }
}

// --- Serialization ---

function serializeFrontmatter(data: ObjectFrontmatter): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      lines.push(`${key}: null`);
    } else if (typeof value === "string" && (value.includes(":") || value.includes('"') || value.includes("\n") || value === "")) {
      // Quote strings that contain special YAML characters
      lines.push(`${key}: "${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string | null>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const rawFrontmatter = match[1];
  const body = match[2];
  const frontmatter: Record<string, string | null> = {};

  for (const line of rawFrontmatter.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    if (value === "null") {
      frontmatter[key] = null;
    } else if (value.startsWith('"') && value.endsWith('"')) {
      // Unquote and unescape
      frontmatter[key] = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

// --- File operations ---

function objectFilePath(id: string): string {
  return join(VAULT_DIR, `${id}.md`);
}

/**
 * Convert a database object (or create result) to a markdown file.
 */
export function objectToMarkdown(obj: {
  id: string;
  type: string;
  status: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  gmailId: string;
  gmailUrl: string;
  dueDate: Date | string | null;
  receivedAt: Date | string;
  statusChangedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata: string | null;
  bodyText: string;
}): string {
  const frontmatter: ObjectFrontmatter = {
    id: obj.id,
    type: obj.type,
    status: obj.status,
    subject: obj.subject,
    senderName: obj.senderName,
    senderEmail: obj.senderEmail,
    gmailId: obj.gmailId,
    gmailUrl: obj.gmailUrl,
    dueDate: obj.dueDate ? new Date(obj.dueDate).toISOString() : null,
    receivedAt: new Date(obj.receivedAt).toISOString(),
    statusChangedAt: new Date(obj.statusChangedAt).toISOString(),
    createdAt: new Date(obj.createdAt).toISOString(),
    updatedAt: new Date(obj.updatedAt).toISOString(),
    metadata: obj.metadata,
  };

  return serializeFrontmatter(frontmatter) + "\n" + obj.bodyText;
}

/**
 * Parse a markdown file's content into a VaultObject.
 */
export function parseMarkdown(content: string): VaultObject | null {
  const { frontmatter, body } = parseFrontmatter(content);

  if (!frontmatter.id || !frontmatter.type || !frontmatter.status) {
    return null;
  }

  return {
    id: frontmatter.id,
    type: frontmatter.type,
    status: frontmatter.status,
    subject: frontmatter.subject || "",
    senderName: frontmatter.senderName || "",
    senderEmail: frontmatter.senderEmail || "",
    gmailId: frontmatter.gmailId || "",
    gmailUrl: frontmatter.gmailUrl || "",
    dueDate: frontmatter.dueDate,
    receivedAt: frontmatter.receivedAt || new Date().toISOString(),
    statusChangedAt: frontmatter.statusChangedAt || new Date().toISOString(),
    createdAt: frontmatter.createdAt || new Date().toISOString(),
    updatedAt: frontmatter.updatedAt || new Date().toISOString(),
    metadata: frontmatter.metadata,
    bodyText: body.trim(),
  };
}

/**
 * Write an object to a .md file in the vault.
 */
export async function writeObjectFile(obj: Parameters<typeof objectToMarkdown>[0]): Promise<void> {
  await ensureVaultDir();
  const filePath = objectFilePath(obj.id);
  const markdown = objectToMarkdown(obj);
  await writeFile(filePath, markdown, "utf-8");
}

/**
 * Read an object from its .md file in the vault.
 */
export async function readObjectFile(id: string): Promise<VaultObject | null> {
  const filePath = objectFilePath(id);
  if (!existsSync(filePath)) return null;

  const content = await readFile(filePath, "utf-8");
  return parseMarkdown(content);
}

/**
 * Delete an object's .md file from the vault.
 */
export async function deleteObjectFile(id: string): Promise<void> {
  const filePath = objectFilePath(id);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

/**
 * Scan the vault directory and return all parsed objects.
 */
export async function scanVault(): Promise<VaultObject[]> {
  await ensureVaultDir();

  const files = await readdir(VAULT_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  const objects: VaultObject[] = [];

  for (const file of mdFiles) {
    const content = await readFile(join(VAULT_DIR, file), "utf-8");
    const obj = parseMarkdown(content);
    if (obj) {
      objects.push(obj);
    }
  }

  return objects;
}

/**
 * Rebuild the SQLite index from vault .md files.
 * Upserts each object found in the vault into the database.
 */
export async function rebuildIndex(userId: string): Promise<{ synced: number; errors: number }> {
  // Dynamic import to avoid circular dependency
  const { prisma } = await import("./prisma");

  const objects = await scanVault();
  let synced = 0;
  let errors = 0;

  for (const obj of objects) {
    try {
      await prisma.emailObject.upsert({
        where: { id: obj.id },
        create: {
          id: obj.id,
          gmailId: obj.gmailId,
          userId,
          subject: obj.subject,
          senderName: obj.senderName,
          senderEmail: obj.senderEmail,
          bodyText: obj.bodyText,
          receivedAt: new Date(obj.receivedAt),
          gmailUrl: obj.gmailUrl,
          dueDate: obj.dueDate ? new Date(obj.dueDate) : null,
          type: obj.type as "NOTE" | "TODO" | "PAGE" | "BOOKMARK" | "URL",
          metadata: obj.metadata,
          status: obj.status as "INBOX" | "PLANNED",
          statusChangedAt: new Date(obj.statusChangedAt),
        },
        update: {
          subject: obj.subject,
          senderName: obj.senderName,
          senderEmail: obj.senderEmail,
          bodyText: obj.bodyText,
          receivedAt: new Date(obj.receivedAt),
          gmailUrl: obj.gmailUrl,
          dueDate: obj.dueDate ? new Date(obj.dueDate) : null,
          type: obj.type as "NOTE" | "TODO" | "PAGE" | "BOOKMARK" | "URL",
          metadata: obj.metadata,
          status: obj.status as "INBOX" | "PLANNED",
          statusChangedAt: new Date(obj.statusChangedAt),
          updatedAt: new Date(obj.updatedAt),
        },
      });
      synced++;
    } catch (e) {
      console.error(`Failed to index ${obj.id}:`, e);
      errors++;
    }
  }

  return { synced, errors };
}
