"use client";

import { Check, Circle, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ProjectStatus } from "@/types/project";

const STAGES = [
  { key: "generating", label: "3D загвар үүсгэж байна…" },
  { key: "optimizing", label: "Загварыг сайжруулж байна…" },
  { key: "converting", label: "iPhone AR хувилбар бэлтгэж байна…" },
  { key: "ready", label: "Бэлэн" },
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
  const [progress, setProgress] = useState<number | null>(null);
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
          progress?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || payload.status === "failed") {
          setError(payload.error ?? "Загвар боловсруулахад алдаа гарлаа.");
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
          if (typeof payload.progress === "number") {
            setProgress(Math.min(100, Math.max(0, Math.round(payload.progress))));
          }
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
      if (!response.ok) throw new Error(payload.error ?? "Дахин боловсруулж эхэлж чадсангүй.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Дахин боловсруулж эхэлж чадсангүй.");
      setRetrying(false);
    }
  }

  if (status === "failed" || error) {
    return (
      <div className="generation-failed" role="alert">
        <TriangleAlert size={20} />
        <div>
          <strong>Боловсруулалт зогслоо</strong>
          <span>{error ?? "Загварыг бэлтгэж чадсангүй."}</span>
          {canRetry && (
            <button
              className="button button-secondary"
              type="button"
              onClick={retry}
              disabled={retrying}
            >
              {retrying ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
              {retrying ? "Дахин эхлүүлж байна…" : "Дахин боловсруулах"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === "ready") {
    return <div className="generation-ready"><Check size={17} /> Загвар бэлэн</div>;
  }

  if (compact) {
    return <div className="generating-compact"><Loader2 className="spin" size={16} /> {STAGES[stageIndex(stage)]?.label}{stage === "generating" && progress !== null ? ` ${progress}%` : ""}</div>;
  }

  const activeIndex = stageIndex(stage);
  return (
    <div className="generation-panel">
      <div className="generation-panel-head">
        <div><span className="eyebrow">Загвар боловсруулж байна</span><h3>Таны орон зайн загварыг бүтээж байна</h3></div>
        <Loader2 className="spin" size={24} />
      </div>
      <ol className="generation-stages">
        {STAGES.map((item, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={item.key} className={done ? "done" : active ? "active" : ""}>
              {done ? <Check size={15} /> : active ? <Loader2 className="spin" size={15} /> : <Circle size={12} />}
              <span>{item.label}{active && item.key === "generating" && progress !== null ? ` ${progress}%` : ""}</span>
            </li>
          );
        })}
      </ol>
      <p>Android GLB болон iPhone USDZ файлууд бэлэн болмогц AR товч идэвхжинэ.</p>
    </div>
  );
}
