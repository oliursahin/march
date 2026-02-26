import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ObjectType } from "@/generated/prisma/enums";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;
  const { objectId } = await req.json();

  if (!objectId || typeof objectId !== "string") {
    return NextResponse.json({ error: "objectId is required" }, { status: 400 });
  }

  if (listId === objectId) {
    return NextResponse.json({ error: "Cannot add a list to itself" }, { status: 400 });
  }

  // Verify the list exists and belongs to user
  const list = await prisma.obj.findUnique({
    where: { id: listId, userId: auth.userId, type: ObjectType.LIST },
    select: { id: true },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Verify the object exists and belongs to user
  const object = await prisma.obj.findUnique({
    where: { id: objectId, userId: auth.userId },
    select: { id: true },
  });

  if (!object) {
    return NextResponse.json({ error: "Object not found" }, { status: 404 });
  }

  // Get next position
  const maxPos = await prisma.listItem.findFirst({
    where: { listId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  try {
    const listItem = await prisma.listItem.create({
      data: {
        listId,
        objectId,
        position: (maxPos?.position ?? -1) + 1,
      },
    });

    return NextResponse.json({ success: true, listItem });
  } catch (e: unknown) {
    // Unique constraint violation — already in list
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "Object already in list" }, { status: 409 });
    }
    throw e;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;

  // Verify the list exists and belongs to user
  const list = await prisma.obj.findUnique({
    where: { id: listId, userId: auth.userId, type: ObjectType.LIST },
    select: { id: true },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const items = await prisma.listItem.findMany({
    where: { listId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      objectId: true,
      position: true,
      object: {
        select: {
          id: true,
          subject: true,
          senderName: true,
          senderEmail: true,
          receivedAt: true,
          status: true,
          type: true,
          bodyText: true,
          dueDate: true,
        },
      },
    },
  });

  return NextResponse.json({ items });
}
