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
        <Link className="back-link" href="/dashboard"><ArrowLeft size={16} /> Back to models</Link>
        <header className="model-detail-header">
          <div><div className="title-status"><ProjectStatusBadge status={project.status} /><span>{project.id.slice(0, 8).toUpperCase()}</span></div><h1>{project.title || "Untitled model"}</h1><p><CalendarDays size={15} /> Created {new Date(project.created_at).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</p></div>
          <div className="detail-actions">
            {urls.glbUrl && <a className="button button-secondary" href={`/api/projects/${project.id}/download?format=glb`}><Download size={16} /> Download GLB</a>}
            {project.status === "ready" && <Link className="button button-primary" href={`/ar/${project.id}`}><ScanLine size={16} /> View in AR</Link>}
          </div>
        </header>

        {project.status === "ready" && urls.glbUrl ? (
          <div className="detail-grid">
            <section className="model-stage">
              <div className="stage-top"><span><i /> INTERACTIVE PREVIEW</span><small>Drag to orbit · Scroll to zoom</small></div>
              <ModelViewer src={urls.glbUrl} iosSrc={urls.usdzUrl} poster={urls.thumbnailUrl} />
              <div className="stage-format"><Box size={15} /> GLB / PBR <span>AR READY</span></div>
            </section>
            <aside className="detail-aside">
              <section className="ar-share-card">
                <span className="eyebrow">Mobile AR</span><h2>Place it in your space</h2><p>Scan with your phone to view this model in AR.</p>
                <ArQrCode value={arUrl} />
                <Link href={`/ar/${project.id}`}>Open AR page <ExternalLink size={14} /></Link>
              </section>
              <VisibilityToggle projectId={project.id} initialPublic={project.is_public} />
            </aside>
          </div>
        ) : (
          <div className="detail-grid generating-grid">
            <section className="generation-stage-placeholder">
              {urls.sourceImageUrl ? <Image src={urls.sourceImageUrl} alt="Source image" fill sizes="(max-width: 760px) 100vw, 58vw" unoptimized /> : <ImageIcon size={42} />}
              <div className="scan-line" />
              <span>Analyzing source geometry</span>
            </section>
            <GenerationStatus projectId={project.id} status={project.status} errorMessage={project.error_message} />
          </div>
        )}

        <section className="project-details-card">
          <div><ImageIcon size={17} /><span><small>Source</small>{project.source_image_key?.split("/").pop() ?? "Unavailable"}</span></div>
          <div><Box size={17} /><span><small>3D file</small>{project.glb_key?.split("/").pop() ?? "Generating…"}</span></div>
          <DeleteProjectButton projectId={project.id} />
        </section>
      </div>
    </AppShell>
  );
}
