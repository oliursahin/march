"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GOOGLE_SCOPES } from "@/lib/constants";

export default function SignInPage() {
  const [waiting, setWaiting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const isTauri =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const getOAuthUrl = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri =
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
      `${window.location.origin}/api/auth/google`;

    const params = new URLSearchParams({
      client_id: clientId || "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      ...(isTauri && { state: "tauri" }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, [isTauri]);

  // Poll for pending session when waiting for browser auth
  useEffect(() => {
    if (!waiting) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/claim", { method: "POST" });
        const data = await res.json();
        if (data.ready) {
          setWaiting(false);
          router.push("/");
        }
      } catch {
        // ignore, keep polling
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [waiting, router]);

  const handleGoogleLogin = async () => {
    const url = getOAuthUrl();

    if (isTauri) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      setWaiting(true);
    } else {
      window.location.href = url;
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loggingIn) return;

    setLoggingIn(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Request failed");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="text-center">
        <h1 className="text-lg font-medium text-gray-900 mb-1">March</h1>
        <p className="text-xs text-gray-400">Your second brain</p>
      </div>

      {waiting ? (
        <p className="text-sm text-gray-400 animate-pulse">
          Waiting for sign in...
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-xs">
          <form onSubmit={handleDevLogin} className="flex flex-col gap-3 w-full">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-transparent text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-transparent text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="px-5 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loggingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-300">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="px-5 py-2 text-sm text-gray-400 hover:text-gray-900 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      )}
    </div>
  );
}
