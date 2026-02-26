import { readdir, readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

// --- Serialization ---

function serializeFrontmatter(data: ObjectFrontmatter): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      lines.push(`${key}: null`);
    } else if (typeof value === "string" && (value.includes(":") || value.includes('"') || value.includes("\n") || value === "")) {
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
      frontmatter[key] = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

// --- Object data type ---

export type ObjectData = {
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
};

export function objectToMarkdown(obj: ObjectData): string {
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
 * Write an object to a .md file in the vault (source of truth).
 */
export async function writeObjectFile(vaultDir: string, obj: ObjectData): Promise<void> {
  const filePath = join(vaultDir, `${obj.id}.md`);
  const markdown = objectToMarkdown(obj);
  await writeFile(filePath, markdown, "utf-8");
}

/**
 * Read an object from its .md file in the vault.
 */
export async function readObjectFile(vaultDir: string, id: string): Promise<VaultObject | null> {
  const filePath = join(vaultDir, `${id}.md`);
  if (!existsSync(filePath)) return null;

  const content = await readFile(filePath, "utf-8");
  return parseMarkdown(content);
}

/**
 * Delete an object's .md file from the vault.
 */
export async function deleteObjectFile(vaultDir: string, id: string): Promise<void> {
  const filePath = join(vaultDir, `${id}.md`);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

/**
 * Scan the vault directory and return all parsed objects.
 */
export async function scanVault(vaultDir: string): Promise<VaultObject[]> {
  if (!existsSync(vaultDir)) return [];

  const files = await readdir(vaultDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  const objects: VaultObject[] = [];

  for (const file of mdFiles) {
    const content = await readFile(join(vaultDir, file), "utf-8");
    const obj = parseMarkdown(content);
    if (obj) {
      objects.push(obj);
    }
  }

  return objects;
}

/**
 * Rebuild the SQLite index from vault .md files.
 */
export async function rebuildIndex(vaultDir: string, userId: string): Promise<{ synced: number; errors: number }> {
  const { prisma } = await import("./prisma");

  const objects = await scanVault(vaultDir);
  let synced = 0;
  let errors = 0;

  for (const obj of objects) {
    try {
      await prisma.obj.upsert({
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
          type: obj.type as "NOTE" | "TODO" | "LIST" | "BOOKMARK" | "URL" | "JOURNAL",
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
          type: obj.type as "NOTE" | "TODO" | "LIST" | "BOOKMARK" | "URL" | "JOURNAL",
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
