import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string; itemId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId, itemId } = await params;

  // Verify the list belongs to user
  const list = await prisma.obj.findUnique({
    where: { id: listId, userId: auth.userId },
    select: { id: true },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Verify the item exists in this list
  const item = await prisma.listItem.findUnique({
    where: { id: itemId, listId },
    select: { id: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.listItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
