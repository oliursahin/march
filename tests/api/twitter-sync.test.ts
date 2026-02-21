import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/twitter-bookmarks", () => ({
  syncTwitterBookmarks: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/session";
import { syncTwitterBookmarks } from "@/lib/twitter-bookmarks";
import { POST } from "@/app/api/twitter/sync/route";

const mockUser = { userId: "user-123", email: "test@example.com" };

describe("POST /api/twitter/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns synced count on success", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(syncTwitterBookmarks).mockResolvedValue({
      synced: 3,
      errors: 0,
    });

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.synced).toBe(3);
    expect(data.errors).toBe(0);
  });

  it("returns 500 on API error", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(syncTwitterBookmarks).mockRejectedValue(
      new Error("Rate limited")
    );

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Rate limited");
  });

  it("handles non-Error thrown values", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(syncTwitterBookmarks).mockRejectedValue("unknown error");

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to sync bookmarks");
  });
});
