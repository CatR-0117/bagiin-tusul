import type { ProjectStatus } from "@/types/project";

const labels: Record<ProjectStatus, string> = {
  uploading: "Uploading",
  uploaded: "Uploaded",
  generating: "Generating",
  ready: "Ready",
  failed: "Failed",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`status-badge status-${status}`}><i />{labels[status]}</span>;
}

