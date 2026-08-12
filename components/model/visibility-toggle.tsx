"use client";

import { Globe2, Lock, Loader2 } from "lucide-react";
import { useState } from "react";

export function VisibilityToggle({ projectId, initialPublic }: { projectId: string; initialPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = !isPublic;
    const response = await fetch(`/api/projects/${projectId}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    if (response.ok) setIsPublic(next);
    setPending(false);
  }

  return (
    <button className={`visibility-toggle ${isPublic ? "is-public" : ""}`} type="button" onClick={toggle} disabled={pending}>
      {pending ? <Loader2 className="spin" size={16} /> : isPublic ? <Globe2 size={16} /> : <Lock size={16} />}
      <span><strong>{isPublic ? "Public AR link" : "Private AR link"}</strong><small>{isPublic ? "Anyone with the QR can view" : "Only your account can open it"}</small></span>
    </button>
  );
}

