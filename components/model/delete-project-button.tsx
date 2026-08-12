"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setPending(true);
    const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (response.ok) {
      router.replace("/dashboard");
      router.refresh();
    } else setPending(false);
  }

  if (confirming) {
    return (
      <div className="delete-confirm">
        <span>Delete this project and all files?</span>
        <button type="button" onClick={remove} disabled={pending}>{pending ? <Loader2 className="spin" size={15} /> : null} Yes, delete</button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending}>Cancel</button>
      </div>
    );
  }
  return <button className="danger-button" type="button" onClick={() => setConfirming(true)}><Trash2 size={16} /> Delete project</button>;
}

