import { prisma } from "./prisma";
import { getValidTwitterToken } from "./twitter";
import { writeObjectFile } from "./vault";
import { randomUUID } from "crypto";

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
}

interface TweetAuthor {
  id: string;
  name: string;
  username: string;
}

interface BookmarksResponse {
  data?: Tweet[];
  includes?: { users?: TweetAuthor[] };
  meta?: { next_token?: string; result_count: number };
}

export async function syncTwitterBookmarks(
  userId: string
): Promise<{ synced: number; errors: number }> {
  const { accessToken, xUserId } = await getValidTwitterToken(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vaultPath: true, email: true },
  });

  if (!user?.vaultPath) {
    throw new Error("Vault not configured");
  }

  // Get existing tweet IDs for deduplication
  const existing = await prisma.obj.findMany({
    where: {
      userId,
      type: "BOOKMARK",
      gmailId: { startsWith: "tweet_" },
    },
    select: { gmailId: true },
  });
  const existingIds = new Set(existing.map((e) => e.gmailId));

  let synced = 0;
  let errors = 0;
  let paginationToken: string | undefined;

  do {
    const url = new URL(`https://api.twitter.com/2/users/${xUserId}/bookmarks`);
    url.searchParams.set("max_results", "100");
    url.searchParams.set("tweet.fields", "created_at,author_id,text");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "name,username");
    if (paginationToken) {
      url.searchParams.set("pagination_token", paginationToken);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Twitter bookmarks API error (${response.status}): ${errText}`
      );
    }

    const json: BookmarksResponse = await response.json();

    if (!json.data || json.data.length === 0) break;

    // Build author lookup map
    const authors = new Map<string, TweetAuthor>();
    for (const u of json.includes?.users ?? []) {
      authors.set(u.id, u);
    }

    for (const tweet of json.data) {
      const tweetKey = `tweet_${tweet.id}`;

      if (existingIds.has(tweetKey)) continue;

      const author = authors.get(tweet.author_id);
      const authorName = author ? author.name : "Unknown";
      const authorUsername = author ? `@${author.username}` : "";
      const tweetUrl = author
        ? `https://x.com/${author.username}/status/${tweet.id}`
        : `https://x.com/i/status/${tweet.id}`;

      const subject =
        tweet.text.length > 100
          ? tweet.text.slice(0, 100) + "..."
          : tweet.text;

      const metadata = JSON.stringify({
        source: "twitter",
        tweetId: tweet.id,
        authorName,
        authorUsername: author?.username ?? null,
        authorId: tweet.author_id,
      });

      const now = new Date();
      const id = randomUUID();
      const objectData = {
        id,
        gmailId: tweetKey,
        userId,
        subject,
        senderName: authorName,
        senderEmail: authorUsername,
        bodyText: tweet.text,
        receivedAt: new Date(tweet.created_at),
        gmailUrl: tweetUrl,
        dueDate: null,
        type: "BOOKMARK" as const,
        metadata,
        status: "INBOX" as const,
        statusChangedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      try {
        // 1. Write to vault FIRST (source of truth)
        await writeObjectFile(user.vaultPath, objectData);

        // 2. Index into SQLite (best-effort)
        try {
          await prisma.obj.create({ data: objectData });
        } catch (indexErr) {
          console.error("Index write failed (data safe in vault):", indexErr);
        }

        existingIds.add(tweetKey);
        synced++;
      } catch (err) {
        console.error(`Failed to save tweet ${tweet.id}:`, err);
        errors++;
      }
    }

    paginationToken = json.meta?.next_token;
  } while (paginationToken);

  return { synced, errors };
}
