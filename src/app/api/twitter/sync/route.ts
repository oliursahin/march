import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { syncTwitterBookmarks } from "@/lib/twitter-bookmarks";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncTwitterBookmarks(auth.userId);
    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync bookmarks";
    console.error("Twitter bookmark sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
