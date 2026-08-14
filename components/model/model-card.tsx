import Link from "next/link";
import { ArrowUpRight, Box } from "lucide-react";
import { ProjectStatusBadge } from "@/components/model/project-status-badge";
import type { Project } from "@/types/project";

export function ModelCard({
  project,
  thumbnailUrl,
}: {
  project: Project;
  thumbnailUrl: string | null;
}) {
  return (
    <Link className="model-card" href={`/models/${project.id}`}>
      <div className="model-card-preview">
        {thumbnailUrl ? (
          // Signed R2 hosts vary per deployment, so a native image is intentional.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" />
        ) : (
          <div className="model-placeholder"><Box size={34} /><span>No preview yet</span></div>
        )}
        <ProjectStatusBadge status={project.status} />
        <span className="model-open"><ArrowUpRight size={16} /></span>
      </div>
      <div className="model-card-meta">
        <div><h3>{project.title || "Untitled model"}</h3><p>{new Date(project.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</p></div>
        <span>{project.web_glb_key ?? project.glb_key ? "GLB + USDZ" : "—"}</span>
      </div>
    </Link>
  );
}
