import { prisma } from "./prisma";
import { randomBytes, createHash } from "crypto";

// --- PKCE helpers ---

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

// --- Constants ---

const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

export const TWITTER_SCOPES = [
  "bookmark.read",
  "tweet.read",
  "users.read",
  "offline.access",
].join(" ");

// --- Token exchange ---

export async function exchangeTwitterCode(
  code: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const redirectUri = process.env.TWITTER_REDIRECT_URI!;

  const params = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Twitter token exchange failed: ${err}`);
  }

  return response.json();
}

// --- Fetch authenticated user profile ---

export async function fetchTwitterUser(accessToken: string): Promise<{
  id: string;
  username: string;
  name: string;
}> {
  const response = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to fetch Twitter user profile: ${err}`);
  }

  const json = await response.json();
  return json.data;
}

// --- Token refresh (X rotates refresh tokens) ---

export async function refreshTwitterToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Twitter token refresh failed: ${err}`);
  }

  return response.json();
}

// --- Get valid access token (auto-refresh if expired) ---

export async function getValidTwitterToken(userId: string): Promise<{
  accessToken: string;
  xUserId: string;
}> {
  const tokens = await prisma.twitterTokens.findUnique({
    where: { userId },
  });

  if (!tokens) {
    throw new Error("No Twitter tokens found for user");
  }

  // Token still valid
  if (tokens.expiresAt && new Date() < tokens.expiresAt) {
    return { accessToken: tokens.accessToken, xUserId: tokens.xUserId };
  }

  // Token expired — refresh
  const refreshed = await refreshTwitterToken(tokens.refreshToken);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await prisma.twitterTokens.update({
    where: { userId },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: newExpiresAt,
    },
  });

  return { accessToken: refreshed.access_token, xUserId: tokens.xUserId };
}
