import { getAuthenticatedUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { NoteEditor } from "@/components/note-editor";
import { CommandBar } from "@/components/command-bar";
import { TodayAgenda } from "@/components/today-agenda";

export default async function TodayPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-5xl w-full mx-auto flex gap-16 px-4 py-10">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-8">{today}</p>
            <NoteEditor />
          </div>
          <div className="w-48 shrink-0 pt-6">
            <p className="text-xs text-gray-400 mb-4">agenda</p>
            <TodayAgenda />
          </div>
        </div>
      </main>
      <CommandBar />
    </div>
  );
}
