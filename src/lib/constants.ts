export const SESSION_COOKIE_NAME = "__brain_session";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export const VAULT_CONFIGURED_COOKIE = "__vault_configured";

export const PUBLIC_PATHS = ["/signin", "/auth/success", "/setup"];

export const IGNORED_PREFIXES = ["/api/auth", "/api/ingest", "/_next", "/favicon.ico"];
