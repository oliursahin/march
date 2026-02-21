import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { exchangeTwitterCode, fetchTwitterUser } from "@/lib/twitter";

const PKCE_COOKIE = "__twitter_pkce_verifier";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, appUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code", appUrl));
  }

  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.redirect(new URL("/signin", appUrl));
  }

  // Retrieve and validate PKCE state
  const pkceCookie = request.cookies.get(PKCE_COOKIE)?.value;
  if (!pkceCookie) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_pkce_state", appUrl)
    );
  }

  const { codeVerifier, state: savedState } = JSON.parse(pkceCookie);

  if (state !== savedState) {
    return NextResponse.redirect(
      new URL("/settings?error=state_mismatch", appUrl)
    );
  }

  try {
    const tokens = await exchangeTwitterCode(code, codeVerifier);
    const xUser = await fetchTwitterUser(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.twitterTokens.upsert({
      where: { userId: auth.userId },
      create: {
        userId: auth.userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        xUserId: xUser.id,
        xUsername: xUser.username,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        xUserId: xUser.id,
        xUsername: xUser.username,
      },
    });

    const response = NextResponse.redirect(new URL("/settings", appUrl));
    response.cookies.delete(PKCE_COOKIE);
    return response;
  } catch (err) {
    console.error("Twitter OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=twitter_auth_failed", appUrl)
    );
  }
}
