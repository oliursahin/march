import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ObjectType } from "@/generated/prisma/enums";
import { writeObjectFile } from "@/lib/vault";
import { randomUUID } from "crypto";

const VALID_TYPES = new Set(Object.values(ObjectType));

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's vault path
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { vaultPath: true },
  });

  if (!user?.vaultPath) {
    return NextResponse.json({ error: "Vault not configured" }, { status: 400 });
  }

  const body = await req.json();
  const { content, type } = body;
  const objectType = type && VALID_TYPES.has(type) ? type : "NOTE";

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const trimmed = content.trim();
  const isUrl = /^https?:\/\/\S+$/i.test(trimmed);

  const subject = isUrl
    ? trimmed
    : trimmed.length > 100
      ? trimmed.slice(0, 100) + "..."
      : trimmed;

  const now = new Date();
  const id = randomUUID();
  const objectData = {
    id,
    gmailId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: auth.userId,
    subject,
    senderName: "You",
    senderEmail: auth.email,
    bodyText: trimmed,
    receivedAt: now,
    gmailUrl: isUrl ? trimmed : "",
    dueDate: null,
    type: objectType,
    metadata: null,
    status: "INBOX" as const,
    statusChangedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    // 1. Write to vault FIRST (source of truth)
    await writeObjectFile(user.vaultPath, objectData);

    // 2. Index into SQLite (best-effort)
    try {
      await prisma.obj.create({ data: objectData });
    } catch (indexErr) {
      console.error("Index write failed (data safe in vault):", indexErr);
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to create object:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
