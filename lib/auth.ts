import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_SESSION_COOKIE = "snapar-demo-session";
export const DEMO_NAME_COOKIE = "snapar-demo-name";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  isDemo: boolean;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    if (!cookieStore.get(DEMO_SESSION_COOKIE)?.value) return null;
    const demoName = cookieStore.get(DEMO_NAME_COOKIE)?.value;
    return {
      id: DEMO_USER_ID,
      email: "maker@snapar.demo",
      name: demoName?.slice(0, 60) || "Demo Maker",
      isDemo: true,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const metadata =
    claims.user_metadata && typeof claims.user_metadata === "object"
      ? (claims.user_metadata as Record<string, unknown>)
      : {};
  const email = typeof claims.email === "string" ? claims.email : "";
  const displayName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : email.split("@")[0] || "Maker";

  return { id: claims.sub, email, name: displayName, isDemo: false };
}

export async function requireUser(returnTo = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}
