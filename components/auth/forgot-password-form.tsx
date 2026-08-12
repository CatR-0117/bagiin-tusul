"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      setMessage("Password recovery is available once Supabase is configured.");
      return;
    }
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/login`,
    });
    if (resetError) setError(resetError.message);
    else setMessage("Check your inbox for a password reset link.");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}
      <button className="button button-primary button-wide" type="submit">Send reset link</button>
      <p className="auth-switch"><Link href="/auth/login">Back to login</Link></p>
    </form>
  );
}

