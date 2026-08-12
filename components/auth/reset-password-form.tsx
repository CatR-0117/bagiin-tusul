"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({ password: z.string().min(8), confirmPassword: z.string().min(8) })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export function ResetPasswordForm({ isDemo }: { isDemo: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Use at least 8 characters.");
      return;
    }
    if (isDemo) {
      setError("Demo access has no password. Configure Supabase to test password recovery.");
      return;
    }
    setPending(true);
    const { error: updateError } = await createClient().auth.updateUser({ password: parsed.data.password });
    setPending(false);
    if (updateError) setError(updateError.message);
    else setComplete(true);
  }

  if (complete) {
    return (
      <div className="reset-complete">
        <span><Check size={21} /></span>
        <h2>Password updated</h2>
        <p>You can continue to your workspace with the new password.</p>
        <Link className="button button-primary button-wide" href="/dashboard">Continue to dashboard</Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="password">New password</label>
      <input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required />
      <label htmlFor="confirmPassword">Confirm new password</label>
      <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat the new password" required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide" type="submit" disabled={pending}>
        {pending ? <Loader2 className="spin" size={17} /> : null}
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}

