import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  TWITTER_SCOPES,
} from "@/lib/twitter";

const PKCE_COOKIE = "__twitter_pkce_verifier";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.redirect(new URL("/signin", appUrl));
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: process.env.TWITTER_REDIRECT_URI!,
    scope: TWITTER_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const response = NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?${params}`
  );

  response.cookies.set(PKCE_COOKIE, JSON.stringify({ codeVerifier, state }), {
    maxAge: 600,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
