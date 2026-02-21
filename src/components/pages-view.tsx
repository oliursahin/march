"use client";

import { useState } from "react";
import { ObjectEditor } from "./object-editor";
import { DateInput } from "./date-input";
import { StatusActions } from "./status-actions";
import type { EmailStatus } from "@/types";

interface PageItem {
  id: string;
  subject: string;
  bodyText: string;
  status: EmailStatus;
  dueDate: Date | null;
  updatedAt: Date;
}

export function PagesView({ pages }: { pages: PageItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(pages[0]?.id ?? null);

  const activePage = pages.find((p) => p.id === activeId);

  return (
    <>
      {/* Sidebar */}
      <div className="w-48 shrink-0">
        <p className="text-xs text-gray-400 mb-4">pages</p>

        <div className="space-y-0.5">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActiveId(page.id)}
              className={`w-full text-left px-2 py-1.5 text-sm truncate transition-colors ${
                page.id === activeId
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {page.subject || "Untitled"}
            </button>
          ))}

          {pages.length === 0 && (
            <p className="text-xs text-gray-400 px-2">
              No pages yet. Press ⌘K to create one.
            </p>
          )}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 min-w-0">
        {activePage ? (
          <>
            <div className="flex items-center justify-end gap-4 mb-8">
              <DateInput objectId={activePage.id} initialDate={activePage.dueDate} />
              <StatusActions objectId={activePage.id} currentStatus={activePage.status} />
            </div>
            <ObjectEditor
              key={activePage.id}
              objectId={activePage.id}
              initialBody={activePage.bodyText}
              initialSubject={activePage.subject}
            />
          </>
        ) : (
          <div className="text-sm text-gray-400 pt-6">
            Press ⌘K to create a page
          </div>
        )}
      </div>
    </>
  );
}
