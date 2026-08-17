import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?error=recovery");
  return (
    <AuthShell eyebrow="Аюулгүй сэргээх" title="Шинэ нууц үг сонгох." description="8-аас доошгүй тэмдэгттэй, давтагдаагүй нууц үг ашиглана уу.">
      <ResetPasswordForm isDemo={user.isDemo} />
    </AuthShell>
  );
}
