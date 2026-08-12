import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/config";

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Account recovery" title="Reset your password." description="Enter your email and we’ll send a secure reset link.">
      <ForgotPasswordForm configured={isSupabaseConfigured()} />
    </AuthShell>
  );
}

