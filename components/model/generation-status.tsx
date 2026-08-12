"use client";

import { Check, Circle, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ProjectStatus } from "@/types/project";

const STAGES = [
  { key: "uploaded", label: "Upload complete" },
  { key: "preparing", label: "Preparing image" },
  { key: "geometry", label: "Generating geometry" },
  { key: "processing", label: "Processing model" },
  { key: "finalizing", label: "Finalizing assets" },
] as const;

type Stage = (typeof STAGES)[number]["key"];

function stageIndex(stage: Stage) {
  return STAGES.findIndex((item) => item.key === stage);
}

export function GenerationStatus({
  projectId,
  status,
  errorMessage,
  compact = false,
}: {
  projectId: string;
  status: ProjectStatus;
  errorMessage?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(status === "uploaded" ? "uploaded" : "preparing");
  const [error, setError] = useState<string | null>(errorMessage ?? null);

  useEffect(() => {
    if (status !== "generating") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(`/api/generation-status/${projectId}`, { cache: "no-store" });
        const payload = (await response.json()) as { status?: string; stage?: Stage | "complete"; error?: string };
        if (cancelled) return;
        if (!response.ok || payload.status === "failed") {
          setError(payload.error ?? "Model generation failed.");
          router.refresh();
          return;
        }
        if (payload.status === "completed") {
          router.refresh();
          return;
        }
        if (payload.stage && payload.stage !== "complete") setStage(payload.stage);
        timer = setTimeout(poll, 1_500);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 2_500);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [projectId, router, status]);

  if (status === "failed" || error) {
    return (
      <div className="generation-failed" role="alert">
        <TriangleAlert size={20} />
        <div><strong>Generation stopped</strong><span>{error ?? "The model could not be generated."}</span></div>
      </div>
    );
  }

  if (status === "ready") {
    return <div className="generation-ready"><Check size={17} /> Model ready</div>;
  }

  if (compact) {
    return <div className="generating-compact"><Loader2 className="spin" size={16} /> {STAGES[stageIndex(stage)]?.label ?? "Preparing image"}</div>;
  }

  const activeIndex = stageIndex(stage);
  return (
    <div className="generation-panel">
      <div className="generation-panel-head">
        <div><span className="eyebrow">AI generation in progress</span><h3>Building your spatial asset</h3></div>
        <Loader2 className="spin" size={24} />
      </div>
      <ol className="generation-stages">
        {STAGES.map((item, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={item.key} className={done ? "done" : active ? "active" : ""}>
              {done ? <Check size={15} /> : active ? <Loader2 className="spin" size={15} /> : <Circle size={12} />}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
      <p>This usually takes under two minutes. You can leave this page and come back.</p>
    </div>
  );
}

