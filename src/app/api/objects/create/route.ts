import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ObjectType } from "@/generated/prisma/enums";

const VALID_TYPES = new Set(Object.values(ObjectType));

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  try {
    const object = await prisma.emailObject.create({
      data: {
        gmailId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.userId,
        subject,
        senderName: "You",
        senderEmail: auth.email,
        bodyText: trimmed,
        receivedAt: new Date(),
        gmailUrl: isUrl ? trimmed : "",
        type: objectType,
        status: "INBOX",
      },
    });

    return NextResponse.json({ success: true, id: object.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to create object:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
