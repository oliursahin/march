import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = `march_${randomBytes(24).toString("hex")}`;

  await prisma.user.update({
    where: { id: auth.userId },
    data: { apiKey },
  });

  return NextResponse.json({ apiKey });
}
