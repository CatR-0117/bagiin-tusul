"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleLogin({
  configured,
  next = "/dashboard",
}: {
  configured: boolean;
  next?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueWithGoogle() {
    setPending(true);
    setError(null);
    if (!configured) {
      setError("Supabase тохируулсны дараа Google нэвтрэлт ажиллана. Одоогоор туршилтын горим ашиглана уу.");
      setPending(false);
      return;
    }
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (oauthError) {
      setError(oauthError.message);
      setPending(false);
    }
  }

  return (
    <>
      <button className="google-button" type="button" onClick={continueWithGoogle} disabled={pending}>
        <span className="google-g" aria-hidden="true">G</span>
        {pending ? "Google нээж байна…" : "Google-ээр үргэлжлүүлэх"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  );
}
