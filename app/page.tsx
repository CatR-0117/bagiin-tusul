import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Box,
  ImagePlus,
  MousePointer2,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { ModelViewer } from "@/components/model/model-viewer";
import { showcaseModels } from "@/lib/showcase-models";

export default function HomePage() {
  const featured = showcaseModels.at(-1)!;

  return (
    <main className="showcase-site">
      <header className="showcase-nav">
        <Link className="showcase-brand" href="/" aria-label="Object Room нүүр хуудас">
          OBJECT ROOM
          <span>3D / DEMO</span>
        </Link>
        <nav aria-label="Үндсэн цэс">
          <a href="#models">Загварууд</a>
          <Link href="/create">Зураг → 3D</Link>
          <span><i /> 3D үзэхэд бүртгэлгүй</span>
        </nav>
      </header>

      <section className="showcase-hero">
        <div className="showcase-hero-copy">
          <span className="showcase-kicker"><Box size={14} /> Нээлттэй 3D үзүүлэн</span>
          <h1>Загварыг<br /><em>ойроос хар.</em></h1>
          <p>
            Зургаан бодит 3D загварыг эргүүлж, ойртуулж үзээрэй. Нэвтрэх,
            бүртгүүлэх шаардлагагүй — QR-ийг уншуулаад утсан дээрээ шууд нээнэ.
          </p>
          <div className="showcase-hero-actions">
            <Link className="showcase-primary-button" href="/create">
              Зургаа 3D болгох <ImagePlus size={17} />
            </Link>
            <a className="showcase-secondary-button" href="#models">
              Загваруудыг үзэх <ArrowDown size={16} />
            </a>
          </div>
          <dl className="showcase-stats">
            <div><dt>Загвар</dt><dd>{showcaseModels.length.toString().padStart(2, "0")}</dd></div>
            <div><dt>Формат</dt><dd>GLB</dd></div>
            <div><dt>Хандалт</dt><dd>OPEN</dd></div>
          </dl>
        </div>

        <div className="showcase-hero-object">
          <div className="showcase-object-label">
            <span><i /> LIVE MODEL</span>
            <small>{featured.number} / {showcaseModels.length.toString().padStart(2, "0")}</small>
          </div>
          <ModelViewer
            src={featured.src}
            poster={featured.poster}
            ar={false}
            autoRotate
            className="showcase-hero-viewer"
          />
          <div className="showcase-object-caption">
            <div>
              <small>{featured.englishName}</small>
              <strong>{featured.name}</strong>
            </div>
            <Link href={`/view/${featured.slug}`} aria-label={`${featured.name} дэлгэрэнгүй үзэх`}>
              <ArrowUpRight size={21} />
            </Link>
          </div>
        </div>
      </section>

      <section className="showcase-create" id="create">
        <div className="showcase-create-copy">
          <span>01 — ЗУРАГ → 3D → AR</span>
          <h2>Өөрийн зургаа<br /><em>орон зайд оруул.</em></h2>
          <p>
            JPG, PNG эсвэл WebP зургаа website дээрээс сонгоно. AI нь textured
            3D загвар үүсгээд Android болон iPhone AR хувилбарыг бэлтгэнэ.
          </p>
          <div className="showcase-create-trust">
            <span><ShieldCheck size={15} /> Нэвтэрсэн хэрэглэгч</span>
            <span><Sparkles size={15} /> AI боловсруулалт</span>
            <span><Smartphone size={15} /> GLB + USDZ</span>
          </div>
        </div>
        <Link className="showcase-upload-card" href="/create" aria-label="Зураг оруулж 3D загвар үүсгэх">
          <div className="showcase-upload-drop">
            <span><ImagePlus size={30} /></span>
            <strong>Зургаа энд оруулна уу</strong>
            <small>JPG, PNG, WEBP · 10 MB ХҮРТЭЛ</small>
          </div>
          <ol>
            <li><b>01</b><span>Зураг сонгох</span></li>
            <li><b>02</b><span>3D үүсгэх</span></li>
            <li><b>03</b><span>AR-д харах</span></li>
          </ol>
          <span className="showcase-upload-action">Эхлэх <ArrowUpRight size={17} /></span>
        </Link>
      </section>

      <section className="showcase-collection" id="models">
        <header className="showcase-section-heading">
          <div>
            <span>02 — НИЙТИЙН САН</span>
            <h2>Зургаан загвар.<br />Хязгааргүй өнцөг.</h2>
          </div>
          <p>
            Загвар дээр дарж тусдаа үзэх хуудас руу орно. Тэндээс QR кодыг
            уншуулж хүссэн төхөөрөмж дээрээ ижил загварыг нээж болно.
          </p>
        </header>

        <div className="showcase-grid">
          {showcaseModels.map((model) => (
            <article
              className="showcase-card"
              key={model.slug}
              style={{
                "--model-surface": model.surface,
                "--model-accent": model.accent,
              } as CSSProperties}
            >
              <div className="showcase-card-visual">
                <span className="showcase-card-number">{model.number}</span>
                <span className="showcase-card-format">GLB · {model.fileSize}</span>
                <ModelViewer
                  src={model.src}
                  poster={model.poster}
                  ar={false}
                  autoRotate
                  loading="lazy"
                  className="showcase-card-viewer"
                />
              </div>
              <div className="showcase-card-copy">
                <div>
                  <span>{model.category}</span>
                  <h3>{model.name}</h3>
                  <small>{model.englishName}</small>
                </div>
                <Link href={`/view/${model.slug}`} aria-label={`${model.name} загвар нээх`}>
                  Нээх <ArrowUpRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase-how">
        <div>
          <span><ScanLine size={20} /></span>
          <h3>1. Загвараа сонго</h3>
          <p>Галерейгаас хүссэн загвараа нээж 360° орчноос үзнэ.</p>
        </div>
        <div>
          <span><QrCode size={20} /></span>
          <h3>2. QR-ийг уншуул</h3>
          <p>Камерын апп-аар QR кодыг уншуулаад утсан дээрээ нээнэ.</p>
        </div>
        <div>
          <span><MousePointer2 size={20} /></span>
          <h3>3. Шууд үз</h3>
          <p>Нэвтрэх дэлгэц, бүртгэлийн алхамгүйгээр загварт шууд орно.</p>
        </div>
      </section>

      <footer className="showcase-footer">
        <strong>OBJECT ROOM</strong>
        <span>PUBLIC 3D SHOWCASE · 2026</span>
        <span>NO SIGN-UP / NO LOGIN</span>
      </footer>
    </main>
  );
}
