import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ObjectStatus } from "@/generated/prisma/enums";
import { writeObjectFile, readObjectFile } from "@/lib/vault";

const VALID_STATUSES = new Set(Object.values(ObjectStatus));

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { vaultPath: true },
  });

  if (!user?.vaultPath) {
    return NextResponse.json({ error: "Vault not configured" }, { status: 400 });
  }

  const { id } = await params;
  const body = await request.json();
  const newStatus = body.status?.toUpperCase();

  if (!newStatus || !VALID_STATUSES.has(newStatus as ObjectStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Must be INBOX or PLANNED" },
      { status: 400 }
    );
  }

  // Read current object from vault
  const existing = await readObjectFile(user.vaultPath, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updatedData = {
    ...existing,
    status: newStatus,
    statusChangedAt: now,
    updatedAt: now,
    ...(newStatus === "INBOX" && { dueDate: null }),
  };

  try {
    // 1. Write to vault FIRST (source of truth)
    await writeObjectFile(user.vaultPath, updatedData);

    // 2. Update SQLite index (best-effort)
    try {
      await prisma.obj.update({
        where: { id },
        data: {
          status: newStatus as ObjectStatus,
          statusChangedAt: new Date(),
          ...(newStatus === "INBOX" && { dueDate: null }),
        },
      });
    } catch (indexErr) {
      console.error("Index update failed (data safe in vault):", indexErr);
    }

    return NextResponse.json({ object: updatedData });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
