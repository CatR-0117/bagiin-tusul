"use client";

import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { z } from "zod";
import { GoogleLogin } from "@/components/auth/google-login";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export function SignupForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    if (!configured) {
      const response = await fetch("/api/auth/demo", { method: "POST" });
      if (!response.ok) {
        setError("Demo access could not be started.");
        setPending(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your account details.");
      setPending(false);
      return;
    }
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/dashboard");
    const { data, error: authError } = await createClient().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: callback.toString() },
    });
    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }
    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    setMessage("Check your inbox to confirm your email, then return to log in.");
    setPending(false);
  }

  return (
    <div className="auth-form-wrap">
      <GoogleLogin configured={configured} />
      <div className="auth-divider"><span>or create with email</span></div>
      <form className="auth-form" onSubmit={signup}>
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required={configured} disabled={!configured} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required={configured} disabled={!configured} />
        <label htmlFor="confirmPassword">Confirm password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat your password" required={configured} disabled={!configured} />
        <p className="password-hint"><Check size={14} /> Use 8 or more characters</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        {!configured && <p className="demo-notice"><strong>Local demo mode</strong>Create a sample session without external services.</p>}
        <button className="button button-primary button-wide" type="submit" disabled={pending}>
          {pending ? <Loader2 className="spin" size={18} /> : null}
          {configured ? (pending ? "Creating account…" : "Create account") : (pending ? "Preparing demo…" : "Try the demo")}
          {!pending && <ArrowRight size={17} />}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <Link href="/auth/login">Log in</Link></p>
    </div>
  );
}

