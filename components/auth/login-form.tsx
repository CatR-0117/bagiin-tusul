"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { z } from "zod";
import { GoogleLogin } from "@/components/auth/google-login";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({ email: z.email(), password: z.string().min(6) });

export function LoginForm({
  configured,
  next,
  initialError,
}: {
  configured: boolean;
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);

    if (!configured) {
      const response = await fetch("/api/auth/demo", { method: "POST" });
      if (!response.ok) {
        setError("Туршилтын орчинд нэвтэрч чадсангүй.");
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      setError("Зөв имэйл болон 6-аас доошгүй тэмдэгттэй нууц үг оруулна уу.");
      setPending(false);
      return;
    }
    const { error: authError } = await createClient().auth.signInWithPassword(parsed.data);
    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="auth-form-wrap">
      <GoogleLogin configured={configured} next={next} />
      <div className="auth-divider"><span>эсвэл имэйлээр үргэлжлүүлэх</span></div>
      <form className="auth-form" onSubmit={login}>
        <label htmlFor="email">Имэйл хаяг</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required={configured} disabled={!configured} />
        <div className="label-row">
          <label htmlFor="password">Нууц үг</label>
          <Link href="/auth/forgot-password">Нууц үгээ мартсан уу?</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required={configured} disabled={!configured} />
        {error && <p className="form-error" role="alert">{error}</p>}
        {!configured && (
          <p className="demo-notice"><strong>Туршилтын горим</strong>Supabase тохируулаагүй тул жишээ ажлын хэсэг нээгдэнэ.</p>
        )}
        <button className="button button-primary button-wide" type="submit" disabled={pending}>
          {pending ? <Loader2 className="spin" size={18} /> : null}
          {configured ? (pending ? "Нэвтэрч байна…" : "Нэвтрэх") : (pending ? "Туршилт нээж байна…" : "Туршилтын орчинд орох")}
          {!pending && <ArrowRight size={17} />}
        </button>
      </form>
      <p className="auth-switch">Шинээр эхэлж байна уу? <Link href="/auth/signup">Бүртгэл үүсгэх</Link></p>
    </div>
  );
}
