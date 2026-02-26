"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { label: "all", value: "" },
  { label: "notes", value: "NOTE" },
  { label: "todos", value: "TODO" },
  { label: "lists", value: "LIST" },
  { label: "bookmarks", value: "BOOKMARK" },
  { label: "urls", value: "URL" },
  { label: "journal", value: "JOURNAL" },
];

export function ObjectTypeTabs() {
  const searchParams = useSearchParams();
  const activeType = searchParams.get("type") ?? "";

  return (
    <div className="flex items-center gap-1 mb-6">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value ? `/objects?type=${tab.value}` : "/objects"}
          className={`px-2 py-1 text-xs transition-colors ${
            activeType === tab.value
              ? "text-gray-900"
              : "text-gray-400 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
