import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Box, CalendarDays, Download, ExternalLink, Image as ImageIcon, ScanLine } from "lucide-react";
import { notFound } from "next/navigation";
import { ArQrCode } from "@/components/ar/qr-code";
import { AppShell } from "@/components/layout/app-shell";
import { DeleteProjectButton } from "@/components/model/delete-project-button";
import { GenerationStatus } from "@/components/model/generation-status";
import { ModelViewer } from "@/components/model/model-viewer";
import { ProjectStatusBadge } from "@/components/model/project-status-badge";
import { VisibilityToggle } from "@/components/model/visibility-toggle";
import { requireUser } from "@/lib/auth";
import { getProjectForUser } from "@/lib/projects";
import { getProjectAssetUrls } from "@/lib/r2/download";
import { getRequestOrigin } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/models/${id}`);
  const project = await getProjectForUser(user.id, id);
  if (!project) notFound();
  const urls = await getProjectAssetUrls(project);
  const origin = await getRequestOrigin();
  const arUrl = `${origin}/ar/${project.id}`;

  return (
    <AppShell user={user}>
      <div className="model-detail-page page-enter">
        <Link className="back-link" href="/dashboard"><ArrowLeft size={16} /> Загварууд руу буцах</Link>
        <header className="model-detail-header">
          <div><div className="title-status"><ProjectStatusBadge status={project.status} /><span>{project.id.slice(0, 8).toUpperCase()}</span></div><h1>{project.title || "Нэргүй загвар"}</h1><p><CalendarDays size={15} /> {new Date(project.created_at).toLocaleDateString("mn-MN", { month: "long", day: "numeric", year: "numeric" })} үүсгэсэн</p></div>
          <div className="detail-actions">
            {urls.originalGlbUrl && <a className="button button-secondary" href={`/api/projects/${project.id}/download?format=glb`}><Download size={16} /> Эх GLB татах</a>}
            {project.status === "ready" ? (
              <Link className="button button-primary" href={`/ar/${project.id}`}><ScanLine size={16} /> AR-д харах</Link>
            ) : (
              <button className="button button-primary" type="button" disabled><ScanLine size={16} /> AR бэлтгэж байна…</button>
            )}
          </div>
        </header>

        {project.status === "ready" && urls.webGlbUrl ? (
          <div className="detail-grid">
            <section className="model-stage">
              <div className="stage-top"><span><i /> ИНТЕРАКТИВ ҮЗҮҮЛЭН</span><small>Чирж эргүүлэх · Гүйлгэж ойртуулах</small></div>
              <ModelViewer src={urls.webGlbUrl} iosSrc={urls.iosUsdzUrl} poster={urls.thumbnailUrl} />
              <div className="stage-format"><Box size={15} /> GLB / PBR <span>AR БЭЛЭН</span></div>
            </section>
            <aside className="detail-aside">
              <section className="ar-share-card">
                <span className="eyebrow">Гар утасны AR</span><h2>Өөрийн орчинд байрлуулах</h2><p>QR кодыг утсаараа уншуулж загвараа AR-аар үзээрэй.</p>
                <ArQrCode value={arUrl} />
                <Link href={`/ar/${project.id}`}>AR хуудас нээх <ExternalLink size={14} /></Link>
              </section>
              <VisibilityToggle projectId={project.id} initialPublic={project.is_public} />
            </aside>
          </div>
        ) : (
          <div className="detail-grid generating-grid">
            <section className="generation-stage-placeholder">
              {urls.sourceImageUrl ? <Image src={urls.sourceImageUrl} alt="Эх зураг" fill sizes="(max-width: 760px) 100vw, 58vw" unoptimized /> : <ImageIcon size={42} />}
              <div className="scan-line" />
              <span>Эх зургийн геометрийг шинжилж байна</span>
            </section>
            <GenerationStatus projectId={project.id} status={project.status} errorMessage={project.processing_error ?? project.error_message} canRetry={Boolean(project.original_glb_key)} />
          </div>
        )}

        <section className="project-details-card">
          <div><ImageIcon size={17} /><span><small>Эх файл</small>{project.source_image_key?.split("/").pop() ?? "Байхгүй"}</span></div>
          <div><Box size={17} /><span><small>3D файл</small>{project.web_glb_key?.split("/").pop() ?? "Бэлтгэж байна…"}</span></div>
          <DeleteProjectButton projectId={project.id} />
        </section>
      </div>
    </AppShell>
  );
}
