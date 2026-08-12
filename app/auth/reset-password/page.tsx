import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?error=recovery");
  return (
    <AuthShell eyebrow="Secure recovery" title="Choose a new password." description="Use at least 8 characters and keep it unique to SnapAR.">
      <ResetPasswordForm isDemo={user.isDemo} />
    </AuthShell>
  );
}

