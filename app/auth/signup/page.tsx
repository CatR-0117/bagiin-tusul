import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell eyebrow="Ажлын хэсгээ үүсгэх" title="Анхны загвараа бүтээгээрэй." description="Бүтээгдэхүүний нэг зургаас эхэлж 3D болон AR загвар болгоно.">
      <SignupForm configured={isSupabaseConfigured()} />
    </AuthShell>
  );
}
