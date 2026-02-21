import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeObjectFile, readObjectFile } from "@/lib/vault";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const object = await prisma.emailObject.findUnique({
    where: { id, userId: auth.userId },
  });

  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ object });
}

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
  const { bodyText, subject, dueDate } = body;

  // Read current object from vault
  const existing = await readObjectFile(user.vaultPath, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Apply updates
  const updatedData = {
    ...existing,
    ...(bodyText !== undefined && { bodyText }),
    ...(subject !== undefined && { subject }),
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate).toISOString() : null }),
    updatedAt: new Date().toISOString(),
  };

  try {
    // 1. Write to vault FIRST (source of truth)
    await writeObjectFile(user.vaultPath, updatedData);

    // 2. Update SQLite index (best-effort)
    try {
      await prisma.emailObject.update({
        where: { id },
        data: {
          ...(bodyText !== undefined && { bodyText }),
          ...(subject !== undefined && { subject }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
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
