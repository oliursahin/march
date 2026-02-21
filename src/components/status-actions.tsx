"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import type { EmailStatus } from "@/types";

export function StatusActions({
  objectId,
  currentStatus,
}: {
  objectId: string;
  currentStatus: EmailStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const moveToInbox = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const res = await fetch(`/api/objects/${objectId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INBOX" }),
    });

    if (res.ok) {
      startTransition(() => router.refresh());
    }
  };

  if (currentStatus === "PLANNED") {
    return (
      <div className={cn(isPending && "opacity-50")}>
        <button
          onClick={moveToInbox}
          disabled={isPending}
          className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          Move to inbox
        </button>
      </div>
    );
  }

  return null;
}
