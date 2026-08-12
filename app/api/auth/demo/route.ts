import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export async function POST() {
  if (isSupabaseConfigured()) {
    return Response.json({ error: "Demo sign-in is disabled." }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_SESSION_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

