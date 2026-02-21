import { NextResponse } from "next/server";
import { claimPendingSession } from "@/lib/pending-auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/constants";

/**
 * Called by the Tauri webview to claim a pending session token
 * that was created during the browser-based OAuth flow.
 */
export async function POST() {
  const token = claimPendingSession();

  if (!token) {
    return NextResponse.json({ ready: false }, { status: 202 });
  }

  const response = NextResponse.json({ ready: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
