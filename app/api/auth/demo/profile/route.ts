import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_NAME_COOKIE, DEMO_SESSION_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

const schema = z.object({ name: z.string().trim().min(2).max(60) });

export async function PATCH(request: Request) {
  if (isSupabaseConfigured()) return new Response(null, { status: 404 });
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.split(";").some((item) => item.trim().startsWith(`${DEMO_SESSION_COOKIE}=`))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid display name." }, { status: 400 });
  const response = NextResponse.json({ ok: true, name: parsed.data.name });
  response.cookies.set(DEMO_NAME_COOKIE, parsed.data.name, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

