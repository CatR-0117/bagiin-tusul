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
  return {
    title: project ? `${project.title || "3D model"} in AR — SnapAR` : "AR model — SnapAR",
    description: "Place this AI-generated 3D model in your space.",
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
      title={project.title || "Untitled model"}
      initialAssets={{
        webGlb: urls.webGlbUrl,
        androidGlb: urls.androidGlbUrl,
        iosUsdz: urls.iosUsdzUrl,
      }}
      posterUrl={urls.thumbnailUrl}
    />
  );
}
