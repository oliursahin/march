import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { ObjectType } from "@/generated/prisma/enums";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { ObjectList } from "@/components/object-list";
import { ObjectTypeTabs } from "@/components/object-type-tabs";
import { CommandBar } from "@/components/command-bar";

const VALID_TYPES = new Set(Object.values(ObjectType));

export default async function ObjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const { type } = await searchParams;
  const filterType = type && VALID_TYPES.has(type as ObjectType) ? (type as ObjectType) : undefined;

  const objects = await prisma.obj.findMany({
    where: {
      userId: auth.userId,
      ...(filterType && { type: filterType }),
    },
    orderBy: { receivedAt: "desc" },
    select: {
      id: true,
      subject: true,
      senderName: true,
      senderEmail: true,
      receivedAt: true,
      status: true,
      type: true,
      bodyText: true,
      dueDate: true,
    },
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-2xl w-full mx-auto px-4 py-10">
          <ObjectTypeTabs />
          <ObjectList objects={objects} status="ALL" />
        </div>
      </main>
      <CommandBar />
    </div>
  );
}
