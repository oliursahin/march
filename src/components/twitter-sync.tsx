"use client";

import { useEffect, useRef } from "react";

export function TwitterSync({ enabled }: { enabled: boolean }) {
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!enabled || hasSynced.current) return;
    hasSynced.current = true;

    fetch("/api/twitter/sync", { method: "POST" }).catch((err) =>
      console.error("Twitter sync failed:", err)
    );
  }, [enabled]);

  return null;
}
