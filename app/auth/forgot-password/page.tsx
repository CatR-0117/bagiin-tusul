import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/config";

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Бүртгэл сэргээх" title="Нууц үгээ сэргээх." description="Имэйлээ оруулбал сэргээх аюулгүй холбоос илгээнэ.">
      <ForgotPasswordForm configured={isSupabaseConfigured()} />
    </AuthShell>
  );
}
