// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    obj: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/twitter", () => ({
  getValidTwitterToken: vi.fn(),
}));

vi.mock("@/lib/vault", () => ({
  writeObjectFile: vi.fn(),
}));

import { syncTwitterBookmarks } from "@/lib/twitter-bookmarks";
import { prisma } from "@/lib/prisma";
import { getValidTwitterToken } from "@/lib/twitter";
import { writeObjectFile } from "@/lib/vault";

const mockToken = { accessToken: "test-token", xUserId: "x-user-123" };
const mockUser = { vaultPath: "/tmp/vault", email: "test@example.com" };

function makeTweetResponse(
  tweets: Array<{ id: string; text: string; author_id: string }>,
  nextToken?: string
) {
  return new Response(
    JSON.stringify({
      data: tweets,
      includes: {
        users: [
          { id: "author-1", name: "Test Author", username: "testauthor" },
        ],
      },
      meta: {
        result_count: tweets.length,
        ...(nextToken ? { next_token: nextToken } : {}),
      },
    }),
    { status: 200 }
  );
}

function makeEmptyResponse() {
  return new Response(
    JSON.stringify({ meta: { result_count: 0 } }),
    { status: 200 }
  );
}

describe("syncTwitterBookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.mocked(getValidTwitterToken).mockResolvedValue(mockToken);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.obj.findMany).mockResolvedValue([]);
    vi.mocked(prisma.obj.create).mockResolvedValue({} as never);
    vi.mocked(writeObjectFile).mockResolvedValue();
  });

  it("syncs new bookmarks successfully", async () => {
    const tweets = [
      {
        id: "tweet-1",
        text: "Hello world",
        author_id: "author-1",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "tweet-2",
        text: "Another tweet",
        author_id: "author-1",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeTweetResponse(tweets as never)
    );

    const result = await syncTwitterBookmarks("user-123");

    expect(result).toEqual({ synced: 2, errors: 0 });
    expect(writeObjectFile).toHaveBeenCalledTimes(2);
    expect(prisma.obj.create).toHaveBeenCalledTimes(2);
  });

  it("deduplicates existing bookmarks", async () => {
    vi.mocked(prisma.obj.findMany).mockResolvedValue([
      { gmailId: "tweet_tweet-1" },
    ] as never);

    const tweets = [
      {
        id: "tweet-1",
        text: "Already synced",
        author_id: "author-1",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "tweet-2",
        text: "New tweet",
        author_id: "author-1",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeTweetResponse(tweets as never)
    );

    const result = await syncTwitterBookmarks("user-123");

    expect(result).toEqual({ synced: 1, errors: 0 });
    expect(writeObjectFile).toHaveBeenCalledTimes(1);
  });

  it("handles empty bookmarks response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(makeEmptyResponse());

    const result = await syncTwitterBookmarks("user-123");

    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(writeObjectFile).not.toHaveBeenCalled();
  });

  it("writes vault first, then DB (vault-first pattern)", async () => {
    const callOrder: string[] = [];
    vi.mocked(writeObjectFile).mockImplementation(async () => {
      callOrder.push("vault");
    });
    vi.mocked(prisma.obj.create).mockImplementation(async () => {
      callOrder.push("db");
      return {} as never;
    });

    const tweets = [
      {
        id: "tweet-1",
        text: "Test tweet",
        author_id: "author-1",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeTweetResponse(tweets as never)
    );

    await syncTwitterBookmarks("user-123");

    expect(callOrder).toEqual(["vault", "db"]);
  });

  it("continues when DB write fails (data safe in vault)", async () => {
    vi.mocked(prisma.obj.create).mockRejectedValue(
      new Error("DB error")
    );

    const tweets = [
      {
        id: "tweet-1",
        text: "Test tweet",
        author_id: "author-1",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeTweetResponse(tweets as never)
    );

    const result = await syncTwitterBookmarks("user-123");

    // Still counts as synced because vault write succeeded
    expect(result).toEqual({ synced: 1, errors: 0 });
    expect(writeObjectFile).toHaveBeenCalledTimes(1);
  });

  it("counts errors when vault write fails", async () => {
    vi.mocked(writeObjectFile).mockRejectedValue(new Error("Disk full"));

    const tweets = [
      {
        id: "tweet-1",
        text: "Test tweet",
        author_id: "author-1",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeTweetResponse(tweets as never)
    );

    const result = await syncTwitterBookmarks("user-123");

    expect(result).toEqual({ synced: 0, errors: 1 });
  });

  it("throws when vault is not configured", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      vaultPath: null,
      email: "test@example.com",
    } as never);

    await expect(syncTwitterBookmarks("user-123")).rejects.toThrow(
      "Vault not configured"
    );
  });

  it("throws when no Twitter tokens exist", async () => {
    vi.mocked(getValidTwitterToken).mockRejectedValue(
      new Error("No Twitter tokens found for user")
    );

    await expect(syncTwitterBookmarks("user-123")).rejects.toThrow(
      "No Twitter tokens found for user"
    );
  });

  it("handles pagination across multiple pages", async () => {
    const page1Tweets = [
      {
        id: "tweet-1",
        text: "Page 1 tweet",
        author_id: "author-1",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];
    const page2Tweets = [
      {
        id: "tweet-2",
        text: "Page 2 tweet",
        author_id: "author-1",
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        makeTweetResponse(page1Tweets as never, "next-page-token")
      )
      .mockResolvedValueOnce(makeTweetResponse(page2Tweets as never));

    const result = await syncTwitterBookmarks("user-123");

    expect(result).toEqual({ synced: 2, errors: 0 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("stores correct metadata in created objects", async () => {
    const tweets = [
      {
        id: "tweet-42",
        text: "Metadata test tweet",
        author_id: "author-1",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeTweetResponse(tweets as never)
    );

    await syncTwitterBookmarks("user-123");

    expect(writeObjectFile).toHaveBeenCalledWith(
      "/tmp/vault",
      expect.objectContaining({
        gmailId: "tweet_tweet-42",
        type: "BOOKMARK",
        status: "INBOX",
        senderName: "Test Author",
        senderEmail: "@testauthor",
        gmailUrl: "https://x.com/testauthor/status/tweet-42",
        bodyText: "Metadata test tweet",
        metadata: JSON.stringify({
          source: "twitter",
          tweetId: "tweet-42",
          authorName: "Test Author",
          authorUsername: "testauthor",
          authorId: "author-1",
        }),
      })
    );
  });

  it("throws on Twitter API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Rate limit exceeded", { status: 429 })
    );

    await expect(syncTwitterBookmarks("user-123")).rejects.toThrow(
      "Twitter bookmarks API error (429)"
    );
  });
});
