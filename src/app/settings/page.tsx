import { getAuthenticatedUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { CommandBar } from "@/components/command-bar";
import { SettingsView } from "@/components/settings-view";

export default async function SettingsPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true, name: true, apiKey: true },
  });

  const gmailTokens = await prisma.gmailTokens.findUnique({
    where: { userId: auth.userId },
    select: { email: true, expiresAt: true },
  });

  // TODO: uncomment when Twitter API is configured
  // const twitterTokens = await prisma.twitterTokens.findUnique({
  //   where: { userId: auth.userId },
  //   select: { xUsername: true },
  // });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-2xl w-full mx-auto px-4 py-10">
          <h1 className="text-xs font-medium text-gray-900 uppercase tracking-widest mb-8">
            Settings
          </h1>
          <SettingsView
            user={user}
            gmailConnected={!!gmailTokens}
            gmailEmail={gmailTokens?.email ?? null}
            twitterConnected={false}
            twitterUsername={null}
            apiKey={user?.apiKey ?? null}
          />
        </div>
      </main>
      <CommandBar />
    </div>
  );
}
