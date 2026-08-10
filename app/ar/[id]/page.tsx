import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTask, toPublicTask } from "@/lib/meshy";
// `[id]` хавтас доторх харьцангуй импортыг Vite шийдэж чаддаггүй
// (дөрвөлжин хаалт нь glob тэмдэгт) тул alias-аар импортолж байна.
import ArViewer from "@/app/components/ArViewer";
import { getManualModelMeta, isManualModelId } from "@/lib/manual-models";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ar?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const manual = isManualModelId(id);
  return {
    title: "AR-аар харах — MORPH AR",
    description: "3D загвараа утсаараа бодит орчинд байрлуулаарай.",
    openGraph: manual
      ? { title: "AR-аар харах — SnapAR" }
      : {
          title: "AR-аар харах — SnapAR",
          images: [{ url: `/api/model/${id}/preview.png` }],
        },
  };
}

export default async function ArPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ar } = await searchParams;
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const pageUrl = `${protocol}://${host}/ar/${encodeURIComponent(id)}?ar=1`;
  const autoLaunch = ar === "1";

  const manual = await getManualModelMeta(id).catch(() => null);
  if (manual) {
    return (
      <ArViewer
        id={id}
        initial={null}
        manual={manual}
        pageUrl={pageUrl}
        autoLaunch={autoLaunch}
      />
    );
  }

  const initial = await getTask(id)
    .then(({ task, kind }) => toPublicTask(task, kind))
    .catch(() => null);

  return (
    <ArViewer
      id={id}
      initial={initial}
      manual={null}
      pageUrl={pageUrl}
      autoLaunch={autoLaunch}
    />
  );
}
