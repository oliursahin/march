"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [vaultName, setVaultName] = useState("");
  const [vaultPath, setVaultPath] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsTauri("__TAURI_INTERNALS__" in window);
  }, []);

  const handlePickFolder = async () => {
    if (!isTauri) return;

    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      setVaultPath(selected as string);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName.trim() || !vaultPath.trim() || saving) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/auth/setup-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultName: vaultName.trim(), vaultPath: vaultPath.trim() }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        try {
          const data = await res.json();
          setError(data.error || "Setup failed");
        } catch {
          setError(`Server error (${res.status})`);
        }
      }
    } catch {
      setError("Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="text-center">
        <h1 className="text-lg font-medium text-gray-900 mb-1">Set up your vault</h1>
        <p className="text-xs text-gray-400">
          Choose a name and location for your vault
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Vault name</label>
          <input
            type="text"
            placeholder="My Brain"
            value={vaultName}
            onChange={(e) => setVaultName(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-transparent text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Vault location</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="/Users/you/Documents/march-vault"
              value={vaultPath}
              onChange={(e) => setVaultPath(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-transparent text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
            />
            {isTauri && (
              <button
                type="button"
                onClick={handlePickFolder}
                className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
              >
                Browse
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving || !vaultName.trim() || !vaultPath.trim()}
          className="px-5 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Creating vault..." : "Create vault"}
        </button>
      </form>
    </div>
  );
}
