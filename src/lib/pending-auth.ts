/**
 * In-memory store for pending auth sessions.
 *
 * When auth happens in the system browser (Tauri flow),
 * the session token is stored here so the webview can claim it.
 * Single-user local app, so we only store one pending token at a time.
 */

let pendingToken: { token: string; expiresAt: number } | null = null;

const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function setPendingSession(token: string): void {
  pendingToken = { token, expiresAt: Date.now() + TTL_MS };
}

export function claimPendingSession(): string | null {
  if (!pendingToken) return null;
  if (Date.now() > pendingToken.expiresAt) {
    pendingToken = null;
    return null;
  }
  const token = pendingToken.token;
  pendingToken = null;
  return token;
}
