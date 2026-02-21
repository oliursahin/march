import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EmailStatus } from "@/generated/prisma/enums";
import { writeObjectFile } from "@/lib/vault";

const VALID_STATUSES = new Set(Object.values(EmailStatus));

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
  const newStatus = body.status?.toUpperCase();

  if (!newStatus || !VALID_STATUSES.has(newStatus as EmailStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Must be INBOX or PLANNED" },
      { status: 400 }
    );
  }

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
      status: newStatus as EmailStatus,
      statusChangedAt: new Date(),
      ...(newStatus === "INBOX" && { dueDate: null }),
    },
  });

  // Sync updated object to vault file (best-effort)
  writeObjectFile(updated).catch((err) =>
    console.error("Failed to update vault file:", err)
  );

  return NextResponse.json({ object: updated });
}
