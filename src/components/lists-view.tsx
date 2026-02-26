"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ObjectEditor } from "./object-editor";

import { useActiveList } from "@/lib/list-context";
import { timeAgo, truncate } from "@/lib/utils";
import type { ObjectStatus, ObjectType } from "@/types";

interface ListItemChild {
  id: string;
  objectId: string;
  position: number;
  object: {
    id: string;
    subject: string;
    senderName: string;
    senderEmail: string;
    receivedAt: Date;
    status: ObjectStatus;
    type: ObjectType;
    bodyText: string;
    dueDate: Date | null;
  };
}

interface ListViewItem {
  id: string;
  subject: string;
  bodyText: string;
  status: ObjectStatus;
  dueDate: Date | null;
  updatedAt: Date;
  listItems: ListItemChild[];
}

export function ListsView({ lists }: { lists: ListViewItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(lists[0]?.id ?? null);
  const router = useRouter();
  const listContext = useActiveList();
  const setActiveListCtx = listContext?.setActiveList;

  const activeList = lists.find((l) => l.id === activeId);

  // Sync active list to context for CommandBar
  useEffect(() => {
    if (!setActiveListCtx) return;
    if (activeList) {
      setActiveListCtx({
        id: activeList.id,
        name: activeList.subject || "Untitled",
        existingObjectIds: activeList.listItems.map((li) => li.objectId),
      });
    } else {
      setActiveListCtx(null);
    }
  }, [activeList?.id, activeList?.subject, activeList?.listItems, setActiveListCtx]);

  const removeItem = async (listItemId: string) => {
    if (!activeList) return;
    const res = await fetch(
      `/api/lists/${activeList.id}/items/${listItemId}`,
      { method: "DELETE" }
    );
    if (res.ok) router.refresh();
  };

  return (
    <div className="flex gap-10">
      {/* Sidebar */}
      <div className="w-36 shrink-0">
        <p className="text-xs text-gray-400 mb-4">lists</p>

        <div className="space-y-0.5">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => setActiveId(list.id)}
              className={`w-full text-left px-2 py-1.5 text-sm truncate transition-colors ${
                list.id === activeId
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-900"
              }`}
            >
              {list.subject || "Untitled"}
            </button>
          ))}

          {lists.length === 0 && (
            <p className="text-xs text-gray-400 px-2">
              No lists yet. Press ⌘K to create one.
            </p>
          )}
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 min-w-0">
        {activeList ? (
          <>
            <ObjectEditor
              key={activeList.id}
              objectId={activeList.id}
              initialBody={activeList.bodyText}
              initialSubject={activeList.subject}
            />

            {/* Child objects — compact list */}
            {activeList.listItems.length > 0 && (
              <div className="mt-10 border-t border-gray-100 pt-6 space-y-1">
                {activeList.listItems.map((li) => (
                  <div
                    key={li.id}
                    className="flex items-center justify-between gap-2 group"
                  >
                    <Link
                      href={`/object/${li.object.id}`}
                      className="text-sm text-gray-900 truncate hover:underline underline-offset-2"
                    >
                      {li.object.subject}
                    </Link>
                    <button
                      onClick={() => removeItem(li.id)}
                      className="text-xs text-gray-400 hover:text-gray-900 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400 pt-6">
            Press ⌘K to create a list
          </div>
        )}
      </div>
    </div>
  );
}
