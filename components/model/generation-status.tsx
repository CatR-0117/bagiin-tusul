"use client";

import { Check, Circle, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ProjectStatus } from "@/types/project";

const STAGES = [
  { key: "generating", label: "Generating 3D model…" },
  { key: "optimizing", label: "Optimizing model…" },
  { key: "converting", label: "Preparing iPhone AR version…" },
  { key: "ready", label: "Ready" },
] as const;

type Stage = (typeof STAGES)[number]["key"];
const ACTIVE_STATUSES: ProjectStatus[] = ["generating", "optimizing", "converting"];

function stageForStatus(status: ProjectStatus): Stage {
  return ACTIVE_STATUSES.includes(status) ? (status as Stage) : "generating";
}

function stageIndex(stage: Stage) {
  return STAGES.findIndex((item) => item.key === stage);
}

export function GenerationStatus({
  projectId,
  status,
  errorMessage,
  canRetry = false,
  compact = false,
}: {
  projectId: string;
  status: ProjectStatus;
  errorMessage?: string | null;
  canRetry?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(stageForStatus(status));
  const [error, setError] = useState<string | null>(errorMessage ?? null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!ACTIVE_STATUSES.includes(status)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(`/api/generation-status/${projectId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          status?: string;
          stage?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || payload.status === "failed") {
          setError(payload.error ?? "Model processing failed.");
          router.refresh();
          return;
        }
        if (payload.status === "completed") {
          router.refresh();
          return;
        }
        if (payload.stage === "optimizing" || payload.stage === "converting") {
          setStage(payload.stage);
        } else {
          setStage("generating");
        }
        timer = setTimeout(poll, 2_000);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 3_500);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [projectId, router, status]);

  async function retry() {
    setRetrying(true);
    setError(null);
    try {
      const response = await fetch(`/api/models/${projectId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Retry could not be started.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Retry could not be started.");
      setRetrying(false);
    }
  }

  if (status === "failed" || error) {
    return (
      <div className="generation-failed" role="alert">
        <TriangleAlert size={20} />
        <div>
          <strong>Processing stopped</strong>
          <span>{error ?? "The model could not be prepared."}</span>
          {canRetry && (
            <button
              className="button button-secondary"
              type="button"
              onClick={retry}
              disabled={retrying}
            >
              {retrying ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
              {retrying ? "Restarting…" : "Retry processing"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === "ready") {
    return <div className="generation-ready"><Check size={17} /> Model ready</div>;
  }

  if (compact) {
    return <div className="generating-compact"><Loader2 className="spin" size={16} /> {STAGES[stageIndex(stage)]?.label}</div>;
  }

  const activeIndex = stageIndex(stage);
  return (
    <div className="generation-panel">
      <div className="generation-panel-head">
        <div><span className="eyebrow">Model processing</span><h3>Building your spatial asset</h3></div>
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
      <p>The AR button becomes available only after both Android GLB and iPhone USDZ assets are ready.</p>
    </div>
  );
}
