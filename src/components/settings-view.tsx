"use client";

import { useRouter } from "next/navigation";
import { GOOGLE_SCOPES } from "@/lib/constants";

export function SettingsView({
  user,
  gmailConnected,
  gmailEmail,
}: {
  user: { email: string; name: string | null } | null;
  gmailConnected: boolean;
  gmailEmail: string | null;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/signin");
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
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm text-gray-900">{user?.email}</span>
          </div>
          {user?.name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Name</span>
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

          {/* Calendar — placeholder */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Google Calendar</p>
              <p className="text-xs text-gray-400">Show agenda on today page</p>
            </div>
            <span className="text-xs text-gray-300">coming soon</span>
          </div>
        </div>
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
