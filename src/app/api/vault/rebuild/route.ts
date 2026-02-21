import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { rebuildIndex } from "@/lib/vault";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await rebuildIndex(auth.userId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Vault rebuild failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
