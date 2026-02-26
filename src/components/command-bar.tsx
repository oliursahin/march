"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { timeAgo } from "@/lib/utils";
import { useActiveList } from "@/lib/list-context";

interface SearchResult {
  id: string;
  subject: string;
  type: string;
  receivedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  NOTE: "note",
  TODO: "todo",
  LIST: "list",
  BOOKMARK: "bookmark",
  URL: "url",
  JOURNAL: "journal",
};

const PAGES = [
  { label: "Today", href: "/" },
  { label: "Inbox", href: "/inbox" },
  { label: "Lists", href: "/lists" },
  { label: "Objects", href: "/objects" },
  { label: "Settings", href: "/settings" },
];

interface ListAction {
  label: string;
  key: string;
}

export function CommandBar() {
  const pathname = usePathname();
  const router = useRouter();
  const listContext = useActiveList();
  const activeList = listContext?.activeList ?? null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  // List-specific actions when a list is active
  const listActions = useMemo<ListAction[]>(() => {
    if (!activeList) return [];
    return [
      { label: "Add objects...", key: "add" },
      { label: "Plan", key: "plan" },
      { label: "Move to inbox", key: "inbox" },
    ];
  }, [activeList]);

  // Filter list actions by query
  const matchingListActions = useMemo(() => {
    if (!activeList) return [];
    if (!hasQuery) return listActions;
    const lower = trimmed.toLowerCase();
    return listActions.filter((a) => a.label.toLowerCase().includes(lower));
  }, [activeList, listActions, hasQuery, trimmed]);

  // Filter pages by query (show all when empty)
  const matchingPages = useMemo(() => {
    if (!hasQuery) return PAGES;
    const lower = trimmed.toLowerCase();
    return PAGES.filter((p) => p.label.toLowerCase().includes(lower));
  }, [trimmed, hasQuery]);

  // Filter results for "add to list" (exclude already-added objects)
  const addableResults = useMemo(() => {
    if (!activeList) return [];
    return results.filter(
      (r) => !activeList.existingObjectIds.includes(r.id)
    );
  }, [results, activeList]);

  // Row indices: list actions, then pages, then results, then create
  const showAddToList = activeList !== null && hasQuery;
  const displayedResults = showAddToList ? addableResults : results;

  const actionsCount = matchingListActions.length;
  const pagesStartIndex = actionsCount;
  const resultsStartIndex = actionsCount + matchingPages.length;
  const createIndex = actionsCount + matchingPages.length + displayedResults.length;
  const totalRows = createIndex + (hasQuery ? 1 : 0);

  // Reset selection when content changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [results, matchingPages.length, matchingListActions.length]);

  // Cmd+K to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
          return !prev;
        });
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!hasQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/objects?search=${encodeURIComponent(trimmed)}&limit=6`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.objects || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, hasQuery, open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!hasQuery || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/objects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          ...(pathname === "/lists" && { type: "LIST" }),
        }),
      });

      if (res.ok) {
        close();
        router.refresh();
      }
    } catch (e) {
      console.error("Create failed:", e);
    } finally {
      setSubmitting(false);
    }
  }, [trimmed, hasQuery, submitting, pathname, router, close]);

  const handleAddToList = useCallback(
    async (objectId: string) => {
      if (!activeList || submitting) return;

      setSubmitting(true);
      try {
        const res = await fetch(`/api/lists/${activeList.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectId }),
        });

        if (res.ok) {
          close();
          router.refresh();
        }
      } catch (e) {
        console.error("Add to list failed:", e);
      } finally {
        setSubmitting(false);
      }
    },
    [activeList, submitting, close, router]
  );

  const handleListAction = useCallback(
    async (key: string) => {
      if (!activeList || submitting) return;

      if (key === "add") {
        // Focus input and set placeholder hint
        setQuery("");
        inputRef.current?.focus();
        return;
      }

      const statusMap: Record<string, string> = {
        plan: "PLANNED",
        inbox: "INBOX",
      };

      const status = statusMap[key];
      if (!status) return;

      setSubmitting(true);
      try {
        const res = await fetch(`/api/objects/${activeList.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        if (res.ok) {
          close();
          router.refresh();
        }
      } catch (e) {
        console.error("Status change failed:", e);
      } finally {
        setSubmitting(false);
      }
    },
    [activeList, submitting, close, router]
  );

  const handleSelect = useCallback(
    (index: number) => {
      if (index < actionsCount) {
        // List action
        handleListAction(matchingListActions[index].key);
      } else if (index < resultsStartIndex) {
        // Navigate to page
        const page = matchingPages[index - pagesStartIndex];
        close();
        router.push(page.href);
      } else if (index < createIndex) {
        // Object result
        const obj = displayedResults[index - resultsStartIndex];
        if (showAddToList) {
          handleAddToList(obj.id);
        } else {
          close();
          router.push(`/object/${obj.id}`);
        }
      } else if (index === createIndex && hasQuery) {
        handleCreate();
      }
    },
    [
      actionsCount,
      matchingListActions,
      matchingPages,
      pagesStartIndex,
      displayedResults,
      resultsStartIndex,
      createIndex,
      hasQuery,
      showAddToList,
      handleListAction,
      handleAddToList,
      handleCreate,
      close,
      router,
    ]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (totalRows > 0 ? (i + 1) % totalRows : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) =>
        totalRows > 0 ? (i - 1 + totalRows) % totalRows : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (totalRows > 0) {
        handleSelect(selectedIndex);
      }
    }
  };

  if (!open) return null;

  const createLabel = pathname === "/lists" ? "Create list" : "Create";
  const resultsLabel =
    showAddToList
      ? `Add to "${activeList?.name}"`
      : "Objects";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/20" onClick={close} />
      <div
        ref={modalRef}
        className="relative w-full max-w-[480px] mx-4 bg-gray-50 rounded-lg shadow-lg border border-gray-200 overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            disabled={submitting}
          />
        </div>

        {/* Content */}
        {(matchingListActions.length > 0 || matchingPages.length > 0 || displayedResults.length > 0 || hasQuery) && (
          <div className="border-t border-gray-100 max-h-[50vh] overflow-y-auto">
            {/* List actions */}
            {matchingListActions.length > 0 && (
              <div>
                <p className="px-4 pt-2.5 pb-0.5 text-[11px] text-gray-400">
                  {activeList?.name}
                </p>
                {matchingListActions.map((action, i) => (
                  <button
                    key={action.key}
                    onClick={() => handleSelect(i)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                      selectedIndex === i ? "bg-gray-100" : ""
                    }`}
                  >
                    <span className="text-xs text-gray-900">{action.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Go to pages */}
            {matchingPages.length > 0 && (
              <div>
                <p className="px-4 pt-2.5 pb-0.5 text-[11px] text-gray-400">
                  Go to
                </p>
                {matchingPages.map((page, i) => {
                  const rowIndex = pagesStartIndex + i;
                  return (
                    <button
                      key={page.href}
                      onClick={() => handleSelect(rowIndex)}
                      onMouseEnter={() => setSelectedIndex(rowIndex)}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition-colors ${
                        selectedIndex === rowIndex ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="text-xs text-gray-900">{page.label}</span>
                      <span className="text-[11px] text-gray-400">
                        {page.href}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search results / Add to list */}
            {displayedResults.length > 0 && (
              <div>
                <p className="px-4 pt-2.5 pb-0.5 text-[11px] text-gray-400">
                  {resultsLabel}
                </p>
                {displayedResults.map((obj, i) => {
                  const rowIndex = resultsStartIndex + i;
                  return (
                    <button
                      key={obj.id}
                      onClick={() => handleSelect(rowIndex)}
                      onMouseEnter={() => setSelectedIndex(rowIndex)}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition-colors ${
                        selectedIndex === rowIndex ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="text-xs text-gray-900 truncate">
                        {obj.subject}
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] text-gray-400">
                          {timeAgo(obj.receivedAt)}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {TYPE_LABELS[obj.type] || obj.type}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Create action */}
            {hasQuery && (
              <>
                {(matchingListActions.length > 0 || matchingPages.length > 0 || displayedResults.length > 0) && (
                  <div className="border-t border-gray-100" />
                )}
                <button
                  onClick={() => handleSelect(createIndex)}
                  onMouseEnter={() => setSelectedIndex(createIndex)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                    selectedIndex === createIndex ? "bg-gray-100" : ""
                  }`}
                  disabled={submitting}
                >
                  <span className="text-xs text-gray-400">+</span>
                  <span className="text-xs text-gray-900">
                    {createLabel} &ldquo;{trimmed}&rdquo;
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
