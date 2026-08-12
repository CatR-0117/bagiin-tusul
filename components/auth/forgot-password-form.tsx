"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!configured) {
      setMessage("Password recovery is available once Supabase is configured.");
      return;
    }
    setPending(true);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/auth/reset-password");
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callback.toString(),
    });
    if (resetError) setError(resetError.message);
    else setMessage("Check your inbox for a password reset link.");
    setPending(false);
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}
      <button className="button button-primary button-wide" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="auth-switch"><Link href="/auth/login">Back to login</Link></p>
    </form>
  );
}
