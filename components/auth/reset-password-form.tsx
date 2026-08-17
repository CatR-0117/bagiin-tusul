"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({ password: z.string().min(8), confirmPassword: z.string().min(8) })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Нууц үгүүд таарахгүй байна.",
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
      setError(parsed.error.issues[0]?.message ?? "8-аас доошгүй тэмдэгт ашиглана уу.");
      return;
    }
    if (isDemo) {
      setError("Туршилтын орчин нууц үггүй. Нууц үг сэргээхийг шалгахын тулд Supabase тохируулна уу.");
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
        <h2>Нууц үг шинэчлэгдлээ</h2>
        <p>Шинэ нууц үгээрээ ажлын хэсэг рүү үргэлжлүүлж болно.</p>
        <Link className="button button-primary button-wide" href="/dashboard">Ажлын хэсэг рүү орох</Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="password">Шинэ нууц үг</label>
      <input id="password" name="password" type="password" autoComplete="new-password" placeholder="8-аас доошгүй тэмдэгт" required />
      <label htmlFor="confirmPassword">Шинэ нууц үгээ давтах</label>
      <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Шинэ нууц үгээ дахин оруулна уу" required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide" type="submit" disabled={pending}>
        {pending ? <Loader2 className="spin" size={17} /> : null}
        {pending ? "Шинэчилж байна…" : "Шинэ нууц үг хадгалах"}
      </button>
    </form>
  );
}
