import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  MousePointer2,
  QrCode,
  ScanLine,
  Smartphone,
} from "lucide-react";
import { notFound } from "next/navigation";
import { ArQrCode } from "@/components/ar/qr-code";
import { ModelViewer } from "@/components/model/model-viewer";
import { getRequestOrigin } from "@/lib/urls";
import { getShowcaseModel, showcaseModels } from "@/lib/showcase-models";

type ViewModelPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return showcaseModels.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ViewModelPageProps): Promise<Metadata> {
  const model = getShowcaseModel((await params).slug);
  if (!model) return {};

  return {
    title: model.name,
    description: `${model.name} 3D загварыг бүртгэлгүйгээр 360° үзэж, QR холбоосоор утсан дээрээ нээнэ.`,
  };
}

export default async function ViewModelPage({ params }: ViewModelPageProps) {
  const { slug } = await params;
  const model = getShowcaseModel(slug);
  if (!model) notFound();

  const index = showcaseModels.findIndex((item) => item.slug === slug);
  const previous = showcaseModels[(index - 1 + showcaseModels.length) % showcaseModels.length];
  const next = showcaseModels[(index + 1) % showcaseModels.length];
  const origin = await getRequestOrigin();
  const shareUrl = `${origin}/view/${model.slug}`;

  return (
    <main className="public-model-page">
      <header className="public-model-nav">
        <Link href="/" className="showcase-brand" aria-label="Object Room нүүр хуудас">
          OBJECT ROOM
          <span>3D / DEMO</span>
        </Link>
        <Link href="/#models"><ArrowLeft size={16} /> Бүх загвар</Link>
      </header>

      <section className="public-model-layout">
        <div className="public-model-stage">
          <div className="public-stage-head">
            <span><i /> INTERACTIVE 3D</span>
            <small>{model.number} / {showcaseModels.length.toString().padStart(2, "0")}</small>
          </div>
          <ModelViewer src={model.src} autoRotate className="public-detail-viewer" />
          <div className="public-stage-help">
            <span><MousePointer2 size={15} /> Чирж эргүүлэх</span>
            <span><ScanLine size={15} /> Ойртуулж харах</span>
          </div>
        </div>

        <aside className="public-model-info">
          <div className="public-model-title">
            <span>{model.category} · {model.englishName}</span>
            <h1>{model.name}</h1>
            <p>{model.description}</p>
          </div>

          <dl className="public-model-meta">
            <div><dt><Box size={15} /> Формат</dt><dd>GLB / PBR</dd></div>
            <div><dt><Smartphone size={15} /> Төхөөрөмж</dt><dd>Утас + компьютер</dd></div>
            <div><dt><ScanLine size={15} /> Хандалт</dt><dd>Нээлттэй</dd></div>
          </dl>

          <section className="public-qr-card" id="qr">
            <div className="public-qr-copy">
              <span><QrCode size={16} /> Утсан дээр нээх</span>
              <h2>QR кодыг<br />уншуулаарай.</h2>
              <p>Утасныхаа камераар уншуулахад энэ загварын хуудас шууд нээгдэнэ.</p>
            </div>
            <ArQrCode value={shareUrl} />
          </section>
        </aside>
      </section>

      <nav className="public-model-pagination" aria-label="Загвар хооронд шилжих">
        <Link href={`/view/${previous.slug}`}>
          <ArrowLeft size={18} />
          <span><small>Өмнөх загвар</small>{previous.name}</span>
        </Link>
        <Link href={`/view/${next.slug}`}>
          <span><small>Дараагийн загвар</small>{next.name}</span>
          <ArrowRight size={18} />
        </Link>
      </nav>
    </main>
  );
}
