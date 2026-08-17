import type { ProjectStatus } from "@/types/project";

const labels: Record<ProjectStatus, string> = {
  uploading: "Оруулж байна",
  uploaded: "Оруулсан",
  generating: "Үүсгэж байна",
  optimizing: "Сайжруулж байна",
  converting: "AR бэлтгэж байна",
  ready: "Бэлэн",
  failed: "Амжилтгүй",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`status-badge status-${status}`}><i />{labels[status]}</span>;
}
