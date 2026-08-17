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
          <div><span className="eyebrow">Орон зайн ажлын хэсэг</span><h1>Тавтай морил, {user.name.split(" ")[0]}.</h1><p>Таны 3D загвар, үүсгэлтийн явц болон AR холбоосууд энд байна.</p></div>
          <Link className="button button-primary" href="/create"><Plus size={18} /> 3D загвар үүсгэх</Link>
        </header>
        <section className="dashboard-summary" aria-label="Workspace summary">
          <div><span><Box size={18} /> Нийт загвар</span><strong>{projects.length.toString().padStart(2, "0")}</strong><small>Энэ ажлын хэсэгт</small></div>
          <div><span><Sparkles size={18} /> Үзэхэд бэлэн</span><strong>{readyCount.toString().padStart(2, "0")}</strong><small>Интерактив 3D загвар</small></div>
          <div><span><i className={activeCount ? "pulse-dot" : ""} /> Боловсруулж байна</span><strong>{activeCount.toString().padStart(2, "0")}</strong><small>{activeCount ? "AI ажиллаж байна" : "Идэвхтэй ажил алга"}</small></div>
          <Link href="/create"><span>Шинэ төсөл</span><strong>+</strong><small>Зураг → 3D → AR <ArrowRight size={13} /></small></Link>
        </section>
        <section className="models-section">
          <div className="models-section-head"><div><span className="eyebrow">Миний загварууд</span><h2>Сүүлд үүсгэсэн</h2></div>{projects.length > 3 && <Link href="/models">Бүгдийг үзэх <ArrowRight size={15} /></Link>}</div>
          <ModelGrid items={items} />
        </section>
      </div>
    </AppShell>
  );
}
