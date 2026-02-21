"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GOOGLE_SCOPES } from "@/lib/constants";

export default function SignInPage() {
  const [waiting, setWaiting] = useState(false);
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
      // Open in system browser, poll for session
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      setWaiting(true);
    } else {
      // Normal web flow — navigate in current tab
      window.location.href = url;
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
        <button
          onClick={handleGoogleLogin}
          className="px-5 py-2 text-sm text-gray-400 hover:text-gray-900 transition-colors"
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
}
