import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeObjectFile } from "@/lib/vault";

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

  const { id } = await params;
  const body = await request.json();
  const { bodyText, subject, dueDate } = body;

  const object = await prisma.emailObject.findUnique({
    where: { id, userId: auth.userId },
    select: { id: true },
  });

  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.emailObject.update({
    where: { id },
    data: {
      ...(bodyText !== undefined && { bodyText }),
      ...(subject !== undefined && { subject }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
  });

  // Sync updated object to vault file (best-effort)
  writeObjectFile(updated).catch((err) =>
    console.error("Failed to update vault file:", err)
  );

  return NextResponse.json({ object: updated });
}
