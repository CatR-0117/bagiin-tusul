"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProjectButton({
  projectId,
  variant = "detail",
}: {
  projectId: string;
  variant?: "detail" | "card";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Загварыг устгаж чадсангүй.");
      }

      if (variant === "detail") router.replace("/models");
      router.refresh();
      setConfirming(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Загварыг устгаж чадсангүй.");
    } finally {
      setPending(false);
    }
  }

  if (variant === "card") {
    if (confirming) {
      return (
        <div className="model-delete-confirm" role="alertdialog" aria-label="Загвар устгах баталгаажуулалт">
          <strong>Энэ загварыг устгах уу?</strong>
          <span>3D болон AR файлууд хамт устна.</span>
          <div>
            <button type="button" onClick={remove} disabled={pending}>
              {pending ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
              Устгах
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={pending}>Болих</button>
          </div>
          {error && <small role="alert">{error}</small>}
        </div>
      );
    }

    return (
      <button
        className="model-delete-button"
        type="button"
        aria-label="Загвар устгах"
        title="Загвар устгах"
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={15} />
      </button>
    );
  }

  if (confirming) {
    return (
      <div className="delete-confirm">
        <span>Энэ загвар болон бүх файлыг устгах уу?</span>
        <button type="button" onClick={remove} disabled={pending}>{pending ? <Loader2 className="spin" size={15} /> : null} Тийм, устгах</button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending}>Болих</button>
        {error && <small role="alert">{error}</small>}
      </div>
    );
  }
  return <button className="danger-button" type="button" onClick={() => setConfirming(true)}><Trash2 size={16} /> Загвар устгах</button>;
}
