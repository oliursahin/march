// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    twitterTokens: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  generateCodeVerifier,
  generateCodeChallenge,
  exchangeTwitterCode,
  fetchTwitterUser,
  refreshTwitterToken,
  getValidTwitterToken,
} from "@/lib/twitter";
import { prisma } from "@/lib/prisma";

// Mock env vars
process.env.TWITTER_CLIENT_ID = "test-client-id";
process.env.TWITTER_CLIENT_SECRET = "test-client-secret";
process.env.TWITTER_REDIRECT_URI = "http://localhost:3000/api/auth/twitter/callback";

describe("PKCE helpers", () => {
  it("generates a code verifier of correct length", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toBeDefined();
    expect(typeof verifier).toBe("string");
    expect(verifier.length).toBeGreaterThan(0);
  });

  it("generates different verifiers each time", () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
  });

  it("generates a valid code challenge from verifier", () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    expect(challenge).toBeDefined();
    expect(typeof challenge).toBe("string");
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("produces consistent challenge for same verifier", () => {
    const verifier = "test-verifier-string";
    const c1 = generateCodeChallenge(verifier);
    const c2 = generateCodeChallenge(verifier);
    expect(c1).toBe(c2);
  });

  it("produces different challenges for different verifiers", () => {
    const c1 = generateCodeChallenge("verifier-1");
    const c2 = generateCodeChallenge("verifier-2");
    expect(c1).not.toBe(c2);
  });
});

describe("exchangeTwitterCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exchanges code for tokens successfully", async () => {
    const mockTokens = {
      access_token: "access-123",
      refresh_token: "refresh-456",
      expires_in: 7200,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockTokens), { status: 200 })
    );

    const result = await exchangeTwitterCode("auth-code", "code-verifier");
    expect(result).toEqual(mockTokens);
  });

  it("throws on failed token exchange", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("invalid_grant", { status: 400 })
    );

    await expect(
      exchangeTwitterCode("bad-code", "code-verifier")
    ).rejects.toThrow("Twitter token exchange failed");
  });
});

describe("fetchTwitterUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches user profile successfully", async () => {
    const mockUser = { id: "12345", username: "testuser", name: "Test User" };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: mockUser }), { status: 200 })
    );

    const result = await fetchTwitterUser("access-token");
    expect(result).toEqual(mockUser);
  });

  it("throws on failed profile fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    );

    await expect(fetchTwitterUser("bad-token")).rejects.toThrow(
      "Failed to fetch Twitter user profile"
    );
  });
});

describe("refreshTwitterToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes token successfully", async () => {
    const mockTokens = {
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 7200,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockTokens), { status: 200 })
    );

    const result = await refreshTwitterToken("old-refresh");
    expect(result).toEqual(mockTokens);
  });

  it("throws on failed refresh", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("invalid_grant", { status: 400 })
    );

    await expect(refreshTwitterToken("expired-refresh")).rejects.toThrow(
      "Twitter token refresh failed"
    );
  });
});

describe("getValidTwitterToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns token when not expired", async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000);
    vi.mocked(prisma.twitterTokens.findUnique).mockResolvedValue({
      id: "tok-1",
      userId: "user-1",
      accessToken: "valid-access",
      refreshToken: "refresh-tok",
      expiresAt: futureDate,
      xUserId: "x-123",
      xUsername: "testuser",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getValidTwitterToken("user-1");
    expect(result).toEqual({
      accessToken: "valid-access",
      xUserId: "x-123",
    });
    expect(prisma.twitterTokens.update).not.toHaveBeenCalled();
  });

  it("refreshes and returns token when expired", async () => {
    const pastDate = new Date(Date.now() - 3600 * 1000);
    vi.mocked(prisma.twitterTokens.findUnique).mockResolvedValue({
      id: "tok-1",
      userId: "user-1",
      accessToken: "expired-access",
      refreshToken: "refresh-tok",
      expiresAt: pastDate,
      xUserId: "x-123",
      xUsername: "testuser",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 7200,
        }),
        { status: 200 }
      )
    );

    vi.mocked(prisma.twitterTokens.update).mockResolvedValue({} as never);

    const result = await getValidTwitterToken("user-1");
    expect(result).toEqual({
      accessToken: "new-access",
      xUserId: "x-123",
    });
    expect(prisma.twitterTokens.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        data: expect.objectContaining({
          accessToken: "new-access",
          refreshToken: "new-refresh",
        }),
      })
    );
  });

  it("throws when no tokens found", async () => {
    vi.mocked(prisma.twitterTokens.findUnique).mockResolvedValue(null);

    await expect(getValidTwitterToken("user-1")).rejects.toThrow(
      "No Twitter tokens found for user"
    );
  });
});
