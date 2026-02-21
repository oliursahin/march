import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { getGmailClient, sendToGmail } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const tokens = await prisma.gmailTokens.findUnique({
    where: { userId: auth.userId },
    select: { email: true },
  });

  const trimmed = content.trim();
  const isUrl = /^https?:\/\/\S+$/i.test(trimmed);

  const subject = isUrl
    ? trimmed
    : trimmed.length > 100
      ? trimmed.slice(0, 100) + "..."
      : trimmed;

  try {
    // Create locally first
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const object = await prisma.emailObject.create({
      data: {
        gmailId: localId,
        userId: auth.userId,
        subject,
        senderName: "You",
        senderEmail: tokens?.email ?? "",
        bodyText: trimmed,
        receivedAt: new Date(),
        gmailUrl: isUrl ? trimmed : "",
        status: "INBOX",
        metadata: { label: "march_inbox" },
      },
    });

    // Try Gmail send (best-effort)
    if (tokens) {
      try {
        const gmail = await getGmailClient(auth.userId);
        const gmailMessageId = await sendToGmail(
          gmail,
          tokens.email,
          subject,
          trimmed,
          "march_inbox"
        );

        await prisma.emailObject.update({
          where: { id: object.id },
          data: {
            gmailId: gmailMessageId,
            gmailUrl: isUrl ? trimmed : `https://mail.google.com/mail/u/0/#inbox/${gmailMessageId}`,
          },
        });
      } catch (gmailError) {
        console.error("Gmail send failed (object saved locally):", gmailError);
      }
    }

    return NextResponse.json({ success: true, id: object.id });
  } catch (error) {
    console.error("Failed to create object:", error);
    return NextResponse.json({ error: "Failed to create object" }, { status: 500 });
  }
}
