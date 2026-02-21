import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { VAULT_CONFIGURED_COOKIE } from "@/lib/constants";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vaultName, vaultPath } = await request.json();

  if (!vaultName || typeof vaultName !== "string" || !vaultName.trim()) {
    return NextResponse.json({ error: "Vault name is required" }, { status: 400 });
  }

  if (!vaultPath || typeof vaultPath !== "string" || !vaultPath.trim()) {
    return NextResponse.json({ error: "Vault path is required" }, { status: 400 });
  }

  const trimmedPath = vaultPath.trim();

  // Create the vault directory if it doesn't exist
  if (!existsSync(trimmedPath)) {
    try {
      await mkdir(trimmedPath, { recursive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Cannot create directory: ${message}` }, { status: 400 });
    }
  }

  // Update user record
  try {
    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        vaultName: vaultName.trim(),
        vaultPath: trimmedPath,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to update user vault config:", message, err);
    return NextResponse.json({ error: `Database error: ${message}` }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(VAULT_CONFIGURED_COOKIE, "1", {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
