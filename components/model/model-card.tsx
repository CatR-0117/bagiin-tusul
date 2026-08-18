import Link from "next/link";
import { Box } from "lucide-react";
import { DeleteProjectButton } from "@/components/model/delete-project-button";
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
    <article className="model-card">
      <Link className="model-card-link" href={`/models/${project.id}`}>
        <div className="model-card-preview">
          {thumbnailUrl ? (
            // Signed R2 hosts vary per deployment, so a native image is intentional.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" />
          ) : (
            <div className="model-placeholder"><Box size={34} /><span>Урьдчилсан зураг алга</span></div>
          )}
          <ProjectStatusBadge status={project.status} />
        </div>
        <div className="model-card-meta">
          <div><h3>{project.title || "Нэргүй загвар"}</h3><p>{new Date(project.created_at).toLocaleDateString("mn-MN", { month: "short", day: "numeric", year: "numeric" })}</p></div>
          <span>{project.web_glb_key ?? project.glb_key ? "GLB + USDZ" : "—"}</span>
        </div>
      </Link>
      <DeleteProjectButton projectId={project.id} variant="card" />
    </article>
  );
}
