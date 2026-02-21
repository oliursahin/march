import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/constants";

const DEV_PASSWORD = process.env.DEV_PASSWORD || "dev";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: email.split("@")[0] },
    update: {},
  });

  const sessionToken = await createSessionToken(user.id, user.email);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
