"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "today", href: "/" },
  { label: "inbox", href: "/inbox" },
  { label: "lists", href: "/lists" },
  { label: "objects", href: "/objects" },
];

export function Nav() {
  const pathname = usePathname();

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
                text-sm transition-all duration-200 ease-out
                ${isActive
                  ? "text-gray-900 underline underline-offset-2"
                  : "text-gray-400 hover:text-gray-900"
                }
              `}
            >
              {item.label}
            </Link>
          );
        })}

      </nav>
    </div>
  );
}
