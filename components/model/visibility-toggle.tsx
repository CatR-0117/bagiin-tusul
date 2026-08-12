"use client";

import { Globe2, Lock, Loader2 } from "lucide-react";
import { useState } from "react";

export function VisibilityToggle({ projectId, initialPublic }: { projectId: string; initialPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setMessage(null);
    setError(null);
    const next = !isPublic;
    const response = await fetch(`/api/projects/${projectId}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    if (response.ok) {
      setIsPublic(next);
      setMessage(next ? "QR access is now enabled." : "QR access is now private.");
    } else {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Visibility could not be changed.");
    }
    setPending(false);
  }

  return (
    <div className="visibility-control">
      <button className={`visibility-toggle ${isPublic ? "is-public" : ""}`} type="button" onClick={toggle} disabled={pending} aria-pressed={isPublic}>
        {pending ? <Loader2 className="spin" size={16} /> : isPublic ? <Globe2 size={16} /> : <Lock size={16} />}
        <span><strong>{isPublic ? "Public AR link" : "Private AR link"}</strong><small>{isPublic ? "Anyone with the QR can view" : "Only your account can open it"}</small></span>
      </button>
      {(message || error) && <p className={error ? "visibility-error" : "visibility-message"} role={error ? "alert" : "status"}>{error ?? message}</p>}
    </div>
  );
}
