"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "today", href: "/" },
  { label: "inbox", href: "/inbox" },
  // { label: "lists", href: "/lists" },
  { label: "objects", href: "/objects" },
];

export function Nav() {
  const pathname = usePathname();
  const [inboxCount, setInboxCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/objects?status=INBOX&limit=1")
      .then((res) => res.json())
      .then((data) => setInboxCount(data.total ?? 0))
      .catch(() => {});
  }, [pathname]);

  return (
    <div
      className="fixed left-0 top-0 h-full z-50 flex items-center"
      style={{ left: "16px" }}
    >
      <nav className="flex flex-col items-start space-y-3 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                text-sm transition-all duration-200 ease-out flex items-center gap-1.5
                ${isActive
                  ? "text-gray-900 underline underline-offset-2"
                  : "text-gray-400 hover:text-gray-900"
                }
              `}
            >
              {item.label}
              {item.href === "/inbox" && inboxCount !== null && inboxCount > 0 && (
                <span className="text-[10px] text-gray-400 no-underline">
                  {inboxCount}
                </span>
              )}
            </Link>
          );
        })}

      </nav>
    </div>
  );
}
