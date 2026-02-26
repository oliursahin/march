import { ObjectRow } from "./object-row";
import { EmptyState } from "./empty-state";
import type { ObjListItem } from "@/types";

const EMPTY_MESSAGES: Record<string, string> = {
  ALL: "No objects yet. Press ⌘K to create one.",
  INBOX: "Inbox is empty.",
};

export function ObjectList({
  objects,
  status,
}: {
  objects: ObjListItem[];
  status: string;
}) {
  if (objects.length === 0) {
    return <EmptyState message={EMPTY_MESSAGES[status] || "No emails."} />;
  }

  return (
    <div className="divide-y divide-gray-100">
      {objects.map((object) => (
        <ObjectRow key={object.id} object={object} />
      ))}
    </div>
  );
}
