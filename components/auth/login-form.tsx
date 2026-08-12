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
        setError("Demo access could not be started.");
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      setError("Enter a valid email and a password of at least 6 characters.");
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
      <div className="auth-divider"><span>or continue with email</span></div>
      <form className="auth-form" onSubmit={login}>
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required={configured} disabled={!configured} />
        <div className="label-row">
          <label htmlFor="password">Password</label>
          <Link href="/auth/forgot-password">Forgot password?</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required={configured} disabled={!configured} />
        {error && <p className="form-error" role="alert">{error}</p>}
        {!configured && (
          <p className="demo-notice"><strong>Local demo mode</strong>Supabase is not configured, so this opens a safe sample workspace.</p>
        )}
        <button className="button button-primary button-wide" type="submit" disabled={pending}>
          {pending ? <Loader2 className="spin" size={18} /> : null}
          {configured ? (pending ? "Signing in…" : "Log in") : (pending ? "Opening demo…" : "Enter demo workspace")}
          {!pending && <ArrowRight size={17} />}
        </button>
      </form>
      <p className="auth-switch">New to SnapAR? <Link href="/auth/signup">Create an account</Link></p>
    </div>
  );
}

