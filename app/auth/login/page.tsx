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
    ? "Google нэвтрэлт амжилтгүй боллоо. Дахин оролдоно уу."
    : query.error === "confirmation"
      ? "Баталгаажуулах холбоос буруу эсвэл хугацаа нь дууссан байна."
      : query.error === "recovery"
        ? "Шинэ нууц үг сонгохоос өмнө имэйл дэх сэргээх холбоосоо нээнэ үү."
      : undefined;

  return (
    <AuthShell eyebrow="Тавтай морил" title="Санаагаа орон зайд оруул." description="Орон зайн загваруудаа үүсгэж, шалгаж, хуваалцахын тулд нэвтэрнэ үү.">
      <LoginForm configured={isSupabaseConfigured()} next={next} initialError={initialError} />
    </AuthShell>
  );
}
