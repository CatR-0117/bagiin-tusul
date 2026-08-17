import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArViewer } from "@/components/ar/ar-viewer";
import { getCurrentUser } from "@/lib/auth";
import { getProjectForAr } from "@/lib/projects";
import { getProjectAssetUrls } from "@/lib/r2/download";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const project = await getProjectForAr(user?.id ?? null, id);
  const title = project ? `${project.title || "3D загвар"} · AR` : "AR загвар";
  const description = "3D загварыг бодит орчиндоо AR-аар байрлуулж үзээрэй.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [] },
    twitter: { card: "summary", title, description, images: [] },
  };
}

export default async function ArPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const project = await getProjectForAr(user?.id ?? null, id);
  if (!project || project.status !== "ready") notFound();
  const urls = await getProjectAssetUrls(project);
  if (!urls.webGlbUrl || !urls.androidGlbUrl || !urls.iosUsdzUrl) notFound();
  return (
    <ArViewer
      projectId={project.id}
      title={project.title || "Нэргүй загвар"}
      initialAssets={{
        webGlb: urls.webGlbUrl,
        androidGlb: urls.androidGlbUrl,
        iosUsdz: urls.iosUsdzUrl,
      }}
      posterUrl={urls.thumbnailUrl}
    />
  );
}
