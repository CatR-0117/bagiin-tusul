"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (response.ok) {
      router.replace("/dashboard");
      router.refresh();
    } else {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Төслийг устгаж чадсангүй.");
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <div className="delete-confirm">
        <span>Энэ төсөл болон бүх файлыг устгах уу?</span>
        <button type="button" onClick={remove} disabled={pending}>{pending ? <Loader2 className="spin" size={15} /> : null} Тийм, устгах</button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending}>Болих</button>
        {error && <small role="alert">{error}</small>}
      </div>
    );
  }
  return <button className="danger-button" type="button" onClick={() => setConfirming(true)}><Trash2 size={16} /> Төсөл устгах</button>;
}
