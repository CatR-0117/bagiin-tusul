import { loadEnvConfig } from "@next/env";
import type { Project } from "@/types/project";

loadEnvConfig(process.cwd());

const {
  claimModelProcessingJob,
  failModelProcessing,
  processModelProject,
  renewModelProcessingClaim,
} = await import("@/lib/3d/process-model");

const once = process.argv.includes("--once");
const pollMs = Math.max(1_000, Number(process.env.MODEL_PROCESSOR_POLL_MS) || 5_000);
const workerId =
  process.env.MODEL_PROCESSOR_ID ??
  `${process.env.HOSTNAME ?? "model-worker"}-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;

let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

console.info(`[model-processor] started as ${workerId}`);

do {
  let project: Project | null = null;
  try {
    project = await claimModelProcessingJob(workerId);
    if (project) {
      const claimedProject = project;
      console.info(
        `[model-processor:${claimedProject.id}] claimed attempt ${claimedProject.processing_attempts}`,
      );
      const heartbeat = setInterval(() => {
        void renewModelProcessingClaim(claimedProject.id, workerId).catch((error) => {
          console.error(`[model-processor:${claimedProject.id}] heartbeat failed`, error);
        });
      }, 60_000);
      try {
        await processModelProject(claimedProject, workerId);
        console.info(`[model-processor:${claimedProject.id}] ready`);
      } catch (error) {
        console.error(`[model-processor:${claimedProject.id}] failed`, error);
        await failModelProcessing(claimedProject.id, workerId, error);
      } finally {
        clearInterval(heartbeat);
      }
    }
  } catch (error) {
    console.error("[model-processor] queue error", error);
  }

  if (!once && !stopping && !project) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
} while (!once && !stopping);

console.info("[model-processor] stopped");
