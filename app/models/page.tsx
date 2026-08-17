import { AppShell } from "@/components/layout/app-shell";
import { ModelGrid } from "@/components/model/model-grid";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { getObjectUrl } from "@/lib/r2/download";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const user = await requireUser("/models");
  const projects = await listProjects(user.id);
  const items = await Promise.all(projects.map(async (project) => ({
    project,
    thumbnailUrl: await getObjectUrl(project.thumbnail_key ?? project.source_image_key),
  })));
  return (
    <AppShell user={user}>
      <div className="library-page page-enter">
        <header><span className="eyebrow">Орон зайн сан</span><h1>Миний загварууд</h1><p>Энэ ажлын хэсэгт {projects.length} төсөл байна.</p></header>
        <ModelGrid items={items} />
      </div>
    </AppShell>
  );
}
