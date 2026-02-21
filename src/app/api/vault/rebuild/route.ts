import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rebuildIndex } from "@/lib/vault";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { vaultPath: true },
  });

  if (!user?.vaultPath) {
    return NextResponse.json({ error: "Vault not configured" }, { status: 400 });
  }

  try {
    const result = await rebuildIndex(user.vaultPath, auth.userId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Vault rebuild failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
