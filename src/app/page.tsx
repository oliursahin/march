import { getAuthenticatedUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ObjectType } from "@/generated/prisma/enums";
import { Nav } from "@/components/nav";
import { NoteEditor } from "@/components/note-editor";
import { RefreshButton } from "@/components/refresh-button";
import { CommandBar } from "@/components/command-bar";
import { TodayObjects } from "@/components/today-objects";

export default async function TodayPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Fetch today's journal entries
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayObjects = await prisma.obj.findMany({
    where: {
      userId: auth.userId,
      type: ObjectType.JOURNAL,
      createdAt: { gte: startOfDay },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-2xl w-full mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-8">
            <p className="text-xs text-gray-400">{today}</p>
            <RefreshButton />
          </div>
          <NoteEditor />
          <TodayObjects objects={todayObjects} />
        </div>
      </main>
      <CommandBar />
    </div>
  );
}
