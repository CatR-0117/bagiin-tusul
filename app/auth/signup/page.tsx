import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell eyebrow="Create your workspace" title="Make your first model." description="Start with one product image. SnapAR handles the path from pixels to presence.">
      <SignupForm configured={isSupabaseConfigured()} />
    </AuthShell>
  );
}

