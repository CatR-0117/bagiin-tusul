import Link from "next/link";
import { ArrowRight, Box, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ModelGrid } from "@/components/model/model-grid";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { getObjectUrl } from "@/lib/r2/download";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const projects = await listProjects(user.id);
  const items = await Promise.all(projects.map(async (project) => ({
    project,
    thumbnailUrl: await getObjectUrl(project.thumbnail_key ?? project.source_image_key),
  })));
  const readyCount = projects.filter((project) => project.status === "ready").length;
  const activeCount = projects.filter((project) =>
    ["generating", "optimizing", "converting"].includes(project.status),
  ).length;

  return (
    <AppShell user={user}>
      <div className="dashboard-page page-enter">
        <header className="dashboard-header">
          <div><span className="eyebrow">Spatial workspace</span><h1>Welcome back, {user.name.split(" ")[0]}.</h1><p>Your models, generation jobs, and AR links live here.</p></div>
          <Link className="button button-primary" href="/create"><Plus size={18} /> Create 3D model</Link>
        </header>
        <section className="dashboard-summary" aria-label="Workspace summary">
          <div><span><Box size={18} /> Total models</span><strong>{projects.length.toString().padStart(2, "0")}</strong><small>Across this workspace</small></div>
          <div><span><Sparkles size={18} /> Ready to view</span><strong>{readyCount.toString().padStart(2, "0")}</strong><small>Interactive 3D assets</small></div>
          <div><span><i className={activeCount ? "pulse-dot" : ""} /> In progress</span><strong>{activeCount.toString().padStart(2, "0")}</strong><small>{activeCount ? "AI is working now" : "No active jobs"}</small></div>
          <Link href="/create"><span>New project</span><strong>+</strong><small>Image → 3D → AR <ArrowRight size={13} /></small></Link>
        </section>
        <section className="models-section">
          <div className="models-section-head"><div><span className="eyebrow">My models</span><h2>Recent creations</h2></div>{projects.length > 3 && <Link href="/models">View all <ArrowRight size={15} /></Link>}</div>
          <ModelGrid items={items} />
        </section>
      </div>
    </AppShell>
  );
}
