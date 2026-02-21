import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { CommandBar } from "@/components/command-bar";
import { PagesView } from "@/components/pages-view";

export default async function PagesPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const pages = await prisma.emailObject.findMany({
    where: { userId: auth.userId, type: "PAGE" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      subject: true,
      bodyText: true,
      status: true,
      dueDate: true,
      updatedAt: true,
    },
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-5xl w-full mx-auto flex gap-8 px-4 py-10">
          <PagesView pages={pages} />
        </div>
      </main>
      <CommandBar />
    </div>
  );
}
