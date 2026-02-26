import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { ObjectType } from "@/generated/prisma/enums";
import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { ObjectEditor } from "@/components/object-editor";

import { DateInput } from "@/components/date-input";
import { AddToListPicker } from "@/components/add-to-list-picker";
import { CommandBar } from "@/components/command-bar";
import Link from "next/link";

export default async function ObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const { id } = await params;

  const [object, allLists] = await Promise.all([
    prisma.obj.findUnique({
      where: { id, userId: auth.userId },
      include: {
        memberOfLists: {
          select: { id: true, listId: true },
        },
      },
    }),
    prisma.obj.findMany({
      where: { userId: auth.userId, type: ObjectType.LIST },
      select: { id: true, subject: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!object) notFound();

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-2xl w-full mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-8">
            <Link
              href={object.type === "LIST" ? "/lists" : "/objects"}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
            >
              &larr; Back
            </Link>
            <div className="flex items-center gap-4">
              {object.type !== "LIST" && (
                <AddToListPicker
                  objectId={object.id}
                  allLists={allLists}
                  memberships={object.memberOfLists}
                />
              )}
              <DateInput objectId={object.id} initialDate={object.dueDate} />
            </div>
          </div>
          <ObjectEditor
            objectId={object.id}
            initialBody={object.bodyText}
            initialSubject={object.subject}
          />
        </div>
      </main>
      <CommandBar />
    </div>
  );
}
