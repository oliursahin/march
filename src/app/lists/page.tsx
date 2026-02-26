import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { ObjectType } from "@/generated/prisma/enums";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { CommandBar } from "@/components/command-bar";
import { ListsView } from "@/components/lists-view";
import { ListProvider } from "@/lib/list-context";

export default async function ListsPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const lists = await prisma.obj.findMany({
    where: { userId: auth.userId, type: ObjectType.LIST },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      subject: true,
      bodyText: true,
      status: true,
      dueDate: true,
      updatedAt: true,
      listItems: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          objectId: true,
          position: true,
          object: {
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
          },
        },
      },
    },
  });

  return (
    <ListProvider>
      <div className="min-h-screen">
        <Nav />
        <main className="flex-1 flex items-start justify-center p-6 pl-16">
          <div className="max-w-2xl w-full px-4 py-10">
            <ListsView lists={lists} />
          </div>
        </main>
        <CommandBar />
      </div>
    </ListProvider>
  );
}
