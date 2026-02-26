"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/utils";

interface TodayObject {
  id: string;
  subject: string;
  createdAt: Date;
}

export function TodayObjects({ objects }: { objects: TodayObject[] }) {
  if (objects.length === 0) return null;

  return (
    <div className="mt-10 border-t border-gray-100 pt-6 space-y-1">
      {objects.map((obj) => (
        <div key={obj.id} className="flex items-center justify-between gap-2">
          <Link
            href={`/object/${obj.id}`}
            className="text-sm text-gray-900 truncate hover:underline underline-offset-2"
          >
            {obj.subject}
          </Link>
          <span className="text-[11px] text-gray-400 shrink-0">
            {timeAgo(obj.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
