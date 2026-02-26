"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  subject: string;
  type: string;
}

export function AddObjectToList({
  listId,
  existingObjectIds,
}: {
  listId: string;
  existingObjectIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Search objects
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/objects?search=${encodeURIComponent(query)}&limit=10`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          // Filter out objects already in this list
          const filtered = (data.objects as SearchResult[]).filter(
            (o) => !existingObjectIds.includes(o.id)
          );
          setResults(filtered);
        }
      } catch {
        // Ignore abort errors
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, existingObjectIds]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const addObject = useCallback(
    async (objectId: string) => {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectId }),
      });
      if (res.ok) {
        setQuery("");
        setResults([]);
        setOpen(false);
        router.refresh();
      }
    },
    [listId, router]
  );

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
      >
        + add
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search objects..."
        className="text-xs text-gray-900 bg-gray-50 rounded px-2 py-1 w-56 outline-none placeholder:text-gray-400"
      />
      {(results.length > 0 || loading) && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 max-h-48 overflow-y-auto">
          {loading && results.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-2">Searching...</p>
          )}
          {results.map((obj) => (
            <button
              key={obj.id}
              onClick={() => addObject(obj.id)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-900 truncate block">
                {obj.subject}
              </span>
            </button>
          ))}
          {!loading && query.trim() && results.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-2">No results</p>
          )}
        </div>
      )}
    </div>
  );
}
