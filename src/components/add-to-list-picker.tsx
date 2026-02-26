"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ListOption {
  id: string;
  subject: string;
}

interface Membership {
  id: string;
  listId: string;
}

export function AddToListPicker({
  objectId,
  allLists,
  memberships,
}: {
  objectId: string;
  allLists: ListOption[];
  memberships: Membership[];
}) {
  const [open, setOpen] = useState(false);
  const [memberListIds, setMemberListIds] = useState<Set<string>>(
    new Set(memberships.map((m) => m.listId))
  );
  const [membershipMap, setMembershipMap] = useState<Map<string, string>>(
    new Map(memberships.map((m) => [m.listId, m.id]))
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggle = async (listId: string) => {
    const isInList = memberListIds.has(listId);

    if (isInList) {
      const itemId = membershipMap.get(listId);
      if (!itemId) return;
      const res = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemberListIds((prev) => {
          const next = new Set(prev);
          next.delete(listId);
          return next;
        });
        setMembershipMap((prev) => {
          const next = new Map(prev);
          next.delete(listId);
          return next;
        });
        router.refresh();
      }
    } else {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectId }),
      });
      if (res.ok) {
        const data = await res.json();
        setMemberListIds((prev) => new Set([...prev, listId]));
        setMembershipMap((prev) => new Map([...prev, [listId, data.listItem.id]]));
        router.refresh();
      }
    }
  };

  if (allLists.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
      >
        {memberListIds.size > 0 ? `in ${memberListIds.size} list${memberListIds.size !== 1 ? "s" : ""}` : "Add to list"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 max-h-48 overflow-y-auto">
          {allLists.map((list) => (
            <button
              key={list.id}
              onClick={() => toggle(list.id)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <span className={`text-xs ${memberListIds.has(list.id) ? "text-gray-900" : "text-gray-400"}`}>
                {memberListIds.has(list.id) ? "✓" : "○"}
              </span>
              <span className="text-sm text-gray-900 truncate">
                {list.subject || "Untitled"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
