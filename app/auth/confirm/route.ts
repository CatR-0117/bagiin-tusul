import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = "/auth/login";
  redirectTo.searchParams.set("error", "confirmation");
  return NextResponse.redirect(redirectTo);
}

