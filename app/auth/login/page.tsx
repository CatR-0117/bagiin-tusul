import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const query = await searchParams;
  const next = query.next?.startsWith("/") && !query.next.startsWith("//")
    ? query.next
    : "/dashboard";
  const initialError = query.error === "oauth"
    ? "Google sign-in could not be completed. Please try again."
    : query.error === "confirmation"
      ? "That confirmation link is invalid or expired."
      : undefined;

  return (
    <AuthShell eyebrow="Welcome back" title="Bring ideas into the room." description="Sign in to keep creating, reviewing, and sharing your spatial models.">
      <LoginForm configured={isSupabaseConfigured()} next={next} initialError={initialError} />
    </AuthShell>
  );
}

