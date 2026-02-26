"use client";

import Link from "next/link";
import { timeAgo, truncate } from "@/lib/utils";
import { formatNice } from "@/lib/parse-date";
import type { ObjListItem } from "@/types";

export function ObjectRow({ object }: { object: ObjListItem }) {
  return (
    <Link
      href={`/object/${object.id}`}
      className="group flex items-start justify-between gap-4 py-3 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 truncate">
            {object.subject}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {timeAgo(object.receivedAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {truncate(object.bodyText, 120)}
        </p>
      </div>

      {object.dueDate && (
        <span className="text-xs text-gray-400 flex-shrink-0 pt-1">
          {formatNice(new Date(object.dueDate))}
        </span>
      )}
    </Link>
  );
}
