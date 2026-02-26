import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeObjectFile } from "@/lib/vault";
import { randomUUID } from "crypto";

interface OEmbedResponse {
  author_name?: string;
  author_url?: string;
  html?: string;
}

async function fetchTweetMetadata(
  url: string
): Promise<{ authorName: string; authorUsername: string; text: string } | null> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;

    const data: OEmbedResponse = await res.json();

    // Extract tweet text from the HTML blockquote
    const textMatch = data.html?.match(/<blockquote[^>]*><p[^>]*>([\s\S]*?)<\/p>/);
    const text = textMatch
      ? textMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
      : "";

    const username = data.author_url?.split("/").pop() ?? "";

    return {
      authorName: data.author_name ?? "Unknown",
      authorUsername: username,
      text,
    };
  } catch {
    return null;
  }
}

function isTweetUrl(url: string): boolean {
  return /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/i.test(url);
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true, email: true, vaultPath: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!user.vaultPath) {
    return NextResponse.json({ error: "Vault not configured" }, { status: 400 });
  }

  const body = await req.json();
  const { url } = body;

  if (!url || typeof url !== "string" || !/^https?:\/\/\S+$/i.test(url.trim())) {
    return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
  }

  const trimmedUrl = url.trim();
  const isTweet = isTweetUrl(trimmedUrl);

  // Fetch metadata for tweets
  const tweetMeta = isTweet ? await fetchTweetMetadata(trimmedUrl) : null;

  const subject = tweetMeta?.text
    ? tweetMeta.text.length > 100
      ? tweetMeta.text.slice(0, 100) + "..."
      : tweetMeta.text
    : trimmedUrl;

  const now = new Date();
  const id = randomUUID();
  const objectData = {
    id,
    gmailId: `ingest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: user.id,
    subject,
    senderName: tweetMeta?.authorName ?? "Saved",
    senderEmail: tweetMeta?.authorUsername ? `@${tweetMeta.authorUsername}` : "",
    bodyText: tweetMeta?.text ?? trimmedUrl,
    receivedAt: now,
    gmailUrl: trimmedUrl,
    dueDate: null,
    type: isTweet ? ("BOOKMARK" as const) : ("URL" as const),
    metadata: tweetMeta
      ? JSON.stringify({
          source: "twitter",
          authorName: tweetMeta.authorName,
          authorUsername: tweetMeta.authorUsername,
        })
      : null,
    status: "INBOX" as const,
    statusChangedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await writeObjectFile(user.vaultPath, objectData);

    try {
      await prisma.obj.create({ data: objectData });
    } catch (indexErr) {
      console.error("Index write failed (data safe in vault):", indexErr);
    }

    return NextResponse.json({ success: true, id, type: objectData.type });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Ingest failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
