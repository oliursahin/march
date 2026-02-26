import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ObjectStatus, ObjectType } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const statusParam = (searchParams.get("status") || "INBOX").toUpperCase();
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

  // Validate status
  if (!Object.values(ObjectStatus).includes(statusParam as ObjectStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const status = statusParam as ObjectStatus;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId: auth.userId, status };
  if (search) {
    where.subject = { contains: search };
    // When searching, don't filter by status
    delete where.status;
    // Exclude LIST objects from search results (lists aren't addable to other lists)
    where.type = { not: ObjectType.LIST };
  }

  const [objects, total] = await Promise.all([
    prisma.obj.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip,
      take: limit,
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
    }),
    prisma.obj.count({ where }),
  ]);

  return NextResponse.json({ objects, total, page });
}
