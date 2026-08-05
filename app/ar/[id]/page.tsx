import type { Metadata } from "next";
import { getTask, toPublicTask } from "@/lib/meshy";
// `[id]` хавтас доторх харьцангуй импортыг Vite шийдэж чаддаггүй
// (дөрвөлжин хаалт нь glob тэмдэгт) тул alias-аар импортолж байна.
import ArViewer from "@/app/components/ArViewer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "AR-аар харах — MORPH AR",
    description: "3D загвараа утсаараа бодит орчинд байрлуулаарай.",
    openGraph: {
      title: "AR-аар харах — MORPH AR",
      images: [{ url: `/api/model/${id}/preview.png` }],
    },
  };
}

export default async function ArPage({ params }: Props) {
  const { id } = await params;

  const initial = await getTask(id)
    .then(({ task, kind }) => toPublicTask(task, kind))
    .catch(() => null);

  return <ArViewer id={id} initial={initial} />;
}
