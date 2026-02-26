"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GOOGLE_SCOPES } from "@/lib/constants";

export function SettingsView({
  user,
  gmailConnected,
  gmailEmail,
  twitterConnected,
  twitterUsername,
  apiKey: initialApiKey,
}: {
  user: { email: string; name: string | null } | null;
  gmailConnected: boolean;
  gmailEmail: string | null;
  twitterConnected: boolean;
  twitterUsername: string | null;
  apiKey: string | null;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [generating, setGenerating] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/signin");
  };

  const generateApiKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/auth/api-key", { method: "POST" });
      const data = await res.json();
      if (data.apiKey) setApiKey(data.apiKey);
    } finally {
      setGenerating(false);
    }
  };

  const connectTwitter = () => {
    window.location.href = "/api/auth/twitter";
  };

  const connectGmail = () => {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google`,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  return (
    <div className="space-y-10">
      {/* Account */}
      <section>
        <h2 className="text-sm font-medium text-gray-900 mb-4">Account</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Email</span>
            <span className="text-sm text-gray-900">{user?.email}</span>
          </div>
          {user?.name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Name</span>
              <span className="text-sm text-gray-900">{user.name}</span>
            </div>
          )}
        </div>
      </section>

      {/* Integrations */}
      <section>
        <h2 className="text-sm font-medium text-gray-900 mb-4">Integrations</h2>
        <div className="space-y-4">
          {/* Gmail */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Gmail</p>
              <p className="text-xs text-gray-400">
                {gmailConnected
                  ? `Connected as ${gmailEmail}`
                  : "Sync objects to Gmail"}
              </p>
            </div>
            <button
              onClick={connectGmail}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
            >
              {gmailConnected ? "Reconnect" : "Connect"}
            </button>
          </div>

          {/* Twitter/X */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Twitter/X</p>
              <p className="text-xs text-gray-400">
                {twitterConnected
                  ? `Connected as @${twitterUsername}`
                  : "Sync your bookmarks"}
              </p>
            </div>
            <button
              onClick={connectTwitter}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
            >
              {twitterConnected ? "Reconnect" : "Connect"}
            </button>
          </div>

          {/* Calendar — placeholder */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Google Calendar</p>
              <p className="text-xs text-gray-400">Show agenda on today page</p>
            </div>
            <span className="text-xs text-gray-400">coming soon</span>
          </div>
        </div>
      </section>

      {/* API Key */}
      <section>
        <h2 className="text-sm font-medium text-gray-900 mb-4">API Key</h2>
        <p className="text-xs text-gray-400 mb-3">
          Use this key with iOS Shortcuts to save URLs to March
        </p>
        {apiKey ? (
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono break-all">
              {apiKey}
            </code>
            <button
              onClick={generateApiKey}
              disabled={generating}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors shrink-0"
            >
              Regenerate
            </button>
          </div>
        ) : (
          <button
            onClick={generateApiKey}
            disabled={generating}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
          >
            {generating ? "Generating..." : "Generate API Key"}
          </button>
        )}
      </section>

      {/* Danger zone */}
      <section>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
