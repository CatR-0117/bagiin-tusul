"use client";

import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Download,
  Expand,
  Grid2X2,
  Layers3,
  Link2,
  Menu,
  MoreHorizontal,
  Move3D,
  Orbit,
  Plus,
  RotateCcw,
  ScanLine,
  Share2,
  Smartphone,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import VaseScene from "./VaseScene";

type Screen =
  | "landing"
  | "upload"
  | "generate"
  | "studio"
  | "ar"
  | "models"
  | "detail"
  | "pricing"
  | "auth";

type StudioTab = "look" | "form" | "environment";
type Material = "ceramic" | "metal" | "wood" | "plastic";
type Modal = "share" | "send" | null;

type Toast = { id: number; text: string };

const planData = [
  {
    name: "Эхлэл",
    monthly: "₮0",
    yearly: "₮0",
    description: "3D-г анх удаа туршиж буй хүнд.",
    features: ["Сард 3 загвар", "Стандарт чанар", "GLB татах", "7 хоног хадгална"],
    cta: "Үнэгүй эхлэх",
  },
  {
    name: "Бүтээгч",
    monthly: "₮39,000",
    yearly: "₮31,000",
    description: "Тогтмол контент бүтээдэг хүмүүст.",
    features: ["Сард 30 загвар", "Өндөр чанар", "GLB + USDZ", "AR холбоос", "1 жил хадгална"],
    cta: "Бүтээгч сонгох",
    recommended: true,
  },
  {
    name: "Баг",
    monthly: "₮149,000",
    yearly: "₮119,000",
    description: "Бүтээгдэхүүний баг, студид.",
    features: ["Сард 150 загвар", "5 гишүүн", "Брэнд AR хуудас", "Priority боловсруулалт", "API хандалт"],
    cta: "Холбогдох",
  },
];

const qrCells = Array.from({ length: 29 * 29 }, (_, index) => {
  const row = Math.floor(index / 29);
  const col = index % 29;
  const finder = (r: number, c: number) =>
    r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
    (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
  const inFinder = finder(row, col) || finder(row, col - 22) || finder(row - 22, col);
  const noise = ((row * 17 + col * 31 + row * col * 7) % 11) < 5;
  return inFinder || noise;
});

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span>MORPH AR</span>
    </span>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "lime" | "ghost";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}

function Rail({
  active,
  go,
}: {
  active: "new" | "models";
  go: (screen: Screen) => void;
}) {
  return (
    <aside className="dashboard-rail">
      <div>
        <button className="rail-brand" onClick={() => go("landing")}>
          <Brand compact />
        </button>
        <nav className="rail-nav" aria-label="Загварын хэсэг">
          <button className={active === "new" ? "active" : ""} onClick={() => go("upload")}>
            <Plus size={15} /> Шинэ загвар
          </button>
          <button className={active === "models" ? "active" : ""} onClick={() => go("models")}>
            <Box size={14} /> Миний загварууд
          </button>
          <button onClick={() => go("detail")}>
            <RotateCcw size={14} /> Сүүлд ашигласан
          </button>
          <button onClick={() => go("pricing")}>
            <Grid2X2 size={14} /> Тохиргоо
          </button>
        </nav>
      </div>
      <div className="rail-bottom">
        <div className="usage-card">
          <div className="usage-head"><span>ҮҮСГЭЛТ</span><b>7 / 10</b></div>
          <div className="usage-track"><span /></div>
          <button onClick={() => go("pricing")}>Багц шинэчлэх →</button>
        </div>
        <div className="profile-chip">
          <span className="avatar" />
          <span><b>Ануужин Б.</b><small>ЭХЛЭЛ БАГЦ</small></span>
        </div>
      </div>
    </aside>
  );
}

function ProgressHeader({ step = 1 }: { step?: 1 | 2 | 3 }) {
  const items = ["ЗУРАГ ОРУУЛАХ", "ҮҮСГЭХ", "AR"];
  return (
    <div className="progress-header">
      <div className="progress-steps">
        {items.map((item, index) => (
          <span key={item} className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""}>
            <b>0{index + 1}</b>{item}
            {index < items.length - 1 && <i />}
          </span>
        ))}
      </div>
      <CircleHelp size={17} aria-label="Тусламж" />
    </div>
  );
}

function CornerFrame() {
  return <span className="corner-frame" aria-hidden="true"><i /><i /><i /><i /></span>;
}

function RangeControl({
  label,
  value,
  onChange,
  suffix = "%",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="range-control">
      <span><b>{label}</b><em>{value}{suffix}</em></span>
      <input type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function MiniVase({ color = "#e8e2d6" }: { color?: string }) {
  return <span className="mini-vase" style={{ "--vase-color": color } as React.CSSProperties} />;
}

export default function MorphApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [navOpen, setNavOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("vaar-sample.jpg");
  const [dragging, setDragging] = useState(false);
  const [rotated, setRotated] = useState(0);
  const [cropped, setCropped] = useState(false);
  const [noBackground, setNoBackground] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [quality, setQuality] = useState<"fast" | "high">("high");
  const [generation, setGeneration] = useState(0);
  const [studioTab, setStudioTab] = useState<StudioTab>("look");
  const [material, setMaterial] = useState<Material>("ceramic");
  const [vaseColor, setVaseColor] = useState("#e8e2d6");
  const [roughness, setRoughness] = useState(42);
  const [light, setLight] = useState(62);
  const [size, setSize] = useState(60);
  const [smoothness, setSmoothness] = useState(70);
  const [detail, setDetail] = useState(60);
  const [autoRotate, setAutoRotate] = useState(true);
  const [grid, setGrid] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState("Бүгд");
  const [yearly, setYearly] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [mobileAr, setMobileAr] = useState(false);
  const [arPlaced, setArPlaced] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const addToast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2800);
  }, []);

  const go = useCallback((next: Screen) => {
    if (next === "generate") setGeneration(0);
    setScreen(next);
    setNavOpen(false);
    setDownloadOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (screen !== "generate") return;
    const interval = window.setInterval(() => {
      setGeneration((value) => Math.min(100, value + 2));
    }, 85);
    const finish = window.setTimeout(() => {
      window.clearInterval(interval);
      setGeneration(100);
      window.setTimeout(() => {
        setScreen("studio");
        addToast("3D загвар бэлэн болсон");
      }, 650);
    }, 4400);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(finish);
    };
  }, [addToast, screen]);

  const loadFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      addToast("Зургийн файл сонгоно уу");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      addToast("Файлын хэмжээ 20 MB-аас бага байх ёстой");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(String(reader.result));
      setUploadName(file.name);
      addToast("Зураг амжилттай орлоо");
    };
    reader.readAsDataURL(file);
  };

  const applySample = () => {
    setUploadPreview("sample");
    setUploadName("vaar-sample.jpg");
    addToast("Жишээ зураг сонгогдлоо");
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => loadFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    loadFile(event.dataTransfer.files?.[0]);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href + "#ar");
      addToast("AR холбоос хууллаа");
    } catch {
      addToast("Холбоос хуулах боломжгүй байна");
    }
  };

  const renderLanding = () => (
    <div className="landing page-enter">
      <header className="site-header">
        <button className="header-brand" onClick={() => go("landing")}><Brand /></button>
        <nav className="desktop-nav" aria-label="Үндсэн цэс">
          <button className="active" onClick={() => go("upload")}>Үүсгэх</button>
          <button onClick={() => go("models")}>Миний загварууд</button>
          <button onClick={() => go("detail")}>Жишээ загварууд</button>
          <button onClick={() => go("pricing")}>Үнийн багц</button>
          <span className="nav-divider" />
          <button onClick={() => go("auth")}>Нэвтрэх</button>
          <Button onClick={() => go("upload")}>Одоо эхлэх</Button>
        </nav>
        <div className="mobile-nav-actions">
          <Button onClick={() => go("upload")}>Эхлэх</Button>
          <button className="icon-button" aria-label="Цэс нээх" onClick={() => setNavOpen(true)}><Menu size={19} /></button>
        </div>
      </header>

      {navOpen && (
        <div className="mobile-menu page-enter">
          <button className="mobile-close" aria-label="Цэс хаах" onClick={() => setNavOpen(false)}><X /></button>
          {[{ n: "Үүсгэх", s: "upload" }, { n: "Миний загварууд", s: "models" }, { n: "Жишээ загварууд", s: "detail" }, { n: "Үнийн багц", s: "pricing" }, { n: "Нэвтрэх", s: "auth" }].map((item) => (
            <button key={item.n} onClick={() => go(item.s as Screen)}>{item.n}<ArrowRight /></button>
          ))}
        </div>
      )}

      <main>
        <section className="hero-section">
          <div className="hero-grid" />
          <div className="hero-copy">
            <SectionLabel><span className="live-dot" /> AI · 2D → 3D · AR</SectionLabel>
            <h1>Нэг зургаас<br />шинэ хэмжээс<br /><em>рүү.</em></h1>
            <p>Зургаа оруулж интерактив 3D загвар үүсгээд, бодит орчиндоо AR-аар байрлуулаарай.</p>
            <div className="hero-actions">
              <Button onClick={() => go("upload")}>3D загвар үүсгэх <ArrowRight size={17} /></Button>
              <Button variant="secondary" onClick={() => go("detail")}>Жишээ үзэх</Button>
            </div>
            <div className="hero-meta"><span>GLB · USDZ</span><span>≈ 40 СЕК</span><span>AR-Д БЭЛЭН</span></div>
          </div>
          <div className="hero-visual">
            <div className="vertical-steps">
              <span><i />01 ЗУРАГ</span>
              <span><i />02 MESH</span>
              <span className="active"><i />03 3D</span>
            </div>
            <div className="hero-stage">
              <CornerFrame />
              <span className="scan-line" />
              <VaseScene className="vase-canvas" color="#e8e2d6" />
              <span className="stage-label">3D ЗАГВАР БЭЛЭН</span>
              <span className="stage-coordinates">X 0.42<br />Y 1.76<br />Z 0.42</span>
              <span className="height-scale"><i />176 MM</span>
              <div className="source-card">
                <div>ЭХ ЗУРАГ<br />ВААР · JPG</div>
                <span>1024×1024 <b>✓</b></span>
              </div>
            </div>
          </div>
        </section>

        <section className="process-section">
          {["Зургаа оруулах", "3D загвар үүсгэх", "AR-аар харах"].map((item, index) => (
            <button key={item} onClick={() => go(index === 0 ? "upload" : index === 1 ? "studio" : "ar")}>
              <span>0{index + 1}</span><b>{item}</b><ArrowRight size={20} />
            </button>
          ))}
        </section>

        <section className="use-cases-section">
          <div>
            <SectionLabel>НЭГ ЗУРАГ · ОЛОН БОЛОМЖ</SectionLabel>
            <h2>Дижитал объектыг<br />бодит мэт мэдэр.</h2>
          </div>
          <div className="use-case-grid">
            <article><Layers3 /><b>Цахим худалдаа</b><p>Бүтээгдэхүүнээ хэрэглэгчийн орчинд үзүүл.</p></article>
            <article><Sparkles /><b>Контент бүтээл</b><p>Хөдөлгөөнт 3D контентоо хялбар үүсгэ.</p></article>
            <article><Smartphone /><b>AR туршлага</b><p>Апп суулгахгүйгээр камераар байрлуул.</p></article>
          </div>
        </section>

        <section className="landing-cta">
          <h2>Өөрийн 3D загварыг<br />одоо үүсгээрэй.</h2>
          <Button variant="lime" onClick={() => go("upload")}>Үүсгэж эхлэх <ArrowRight size={18} /></Button>
        </section>
      </main>
      <footer className="site-footer"><span>MORPH AR · 2026</span><span>НӨХЦӨЛ · НУУЦЛАЛ · ХОЛБОО БАРИХ</span></footer>
    </div>
  );

  const renderUpload = () => (
    <div className="dashboard-layout page-enter">
      <Rail active="new" go={go} />
      <main className="dashboard-main">
        <ProgressHeader step={1} />
        <div className="upload-content">
          {!uploadPreview ? (
            <>
              <h1>Зургаа энд оруулна уу</h1>
              <p>Нэг объект тод харагдсан, цэвэр дэвсгэртэй зураг ашиглавал илүү сайн үр дүн гарна.</p>
              <div
                className={`drop-zone ${dragging ? "dragging" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInput.current?.click()}
              >
                <CornerFrame />
                <span className="scan-line" />
                <span className="drop-label">DROP ZONE</span>
                <div className="drop-center">
                  <span className="upload-glyph"><Upload /></span>
                  <div className="drop-actions">
                    <Button onClick={(event) => { event.stopPropagation(); fileInput.current?.click(); }}>Зураг сонгох</Button>
                    <Button variant="secondary" onClick={(event) => { event.stopPropagation(); applySample(); }}>Жишээ зураг ашиглах</Button>
                  </div>
                  <span className="file-note">JPG, PNG, WEBP · 20 MB ХҮРТЭЛ</span>
                </div>
              </div>
            </>
          ) : (
            <div className="upload-ready page-enter">
              <div className="image-editor">
                <h1>Зураг бэлэн боллоо</h1>
                <p>Объектын хүрээг шалгаад 3D загвараа үүсгээрэй.</p>
                <div className={`image-preview ${noBackground ? "transparent" : ""}`}>
                  <CornerFrame />
                  {uploadPreview === "sample" ? (
                    <div className={`sample-object ${cropped ? "cropped" : ""}`} style={{ transform: `rotate(${rotated}deg)` }}>
                      <MiniVase />
                    </div>
                  ) : (
                    <div className={`uploaded-image ${cropped ? "cropped" : ""}`} role="img" aria-label="Оруулсан зураг" style={{ backgroundImage: `url(${uploadPreview})`, transform: `rotate(${rotated}deg)` }} />
                  )}
                  <span className="preview-meta">{uploadName} · 1024×1024</span>
                </div>
                <div className="editor-tools">
                  <button className={cropped ? "active" : ""} onClick={() => setCropped(!cropped)}>Тайрах</button>
                  <button onClick={() => setRotated((value) => (value + 90) % 360)}>Эргүүлэх</button>
                  <button className={noBackground ? "active" : ""} onClick={() => setNoBackground(!noBackground)}>Дэвсгэр арилгах</button>
                  <button onClick={() => fileInput.current?.click()}>Зураг солих</button>
                </div>
              </div>
              <aside className="upload-options">
                <div className="check-card">
                  <SectionLabel>ЗУРГИЙН ШАЛГАЛТ</SectionLabel>
                  <span><b>Объект тодорхой</b><em>Сайн</em></span>
                  <span><b>Дэвсгэр цэвэр</b><em>Сайн</em></span>
                  <span><b>Гэрэлтүүлэг</b><strong>Дунд</strong></span>
                </div>
                <div className="advanced-card">
                  <button onClick={() => setAdvanced(!advanced)}>Нэмэлт тохиргоо <ChevronDown className={advanced ? "rotated" : ""} size={17} /></button>
                  {advanced && (
                    <div className="advanced-body page-enter">
                      <span className="option-title">ЧАНАР</span>
                      <div className="segmented"><button className={quality === "fast" ? "active" : ""} onClick={() => setQuality("fast")}>Хурдан</button><button className={quality === "high" ? "active" : ""} onClick={() => setQuality("high")}>Өндөр</button></div>
                      <label className="toggle-row">AR-д тохируулах <input type="checkbox" defaultChecked /><i /></label>
                    </div>
                  )}
                </div>
                <Button className="create-model" onClick={() => go("generate")}><WandSparkles size={17} /> 3D загвар үүсгэх</Button>
                <span className="generation-note">1 ҮҮСГЭЛТ АШИГЛАНА · ≈ 40 СЕК</span>
              </aside>
            </div>
          )}
        </div>
      </main>
      <input ref={fileInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
    </div>
  );

  const renderGenerate = () => {
    const stages = [
      ["Зургийг шинжилж байна", 0, 26],
      ["3D хэлбэр байгуулж байна", 26, 58],
      ["Материал үүсгэж байна", 58, 84],
      ["AR-д тохируулж байна", 84, 100],
    ] as const;
    return (
      <div className="generation-screen page-enter">
        <header><Brand compact /><span>AI PROCESS · MORPH ENGINE 2.4</span></header>
        <main>
          <div className="generation-preview">
            <CornerFrame />
            <span className="scan-line" />
            <VaseScene className="vase-canvas" progress={Math.min(1, generation / 92)} color="#e8e2d6" />
            <span className="generation-percent">{Math.round(generation)}<small>%</small></span>
          </div>
          <div className="generation-info">
            <SectionLabel>ТҮР ХҮЛЭЭНЭ ҮҮ</SectionLabel>
            <h1>3D загвар<br />үүсгэж байна.</h1>
            <p>Зургийн хэлбэр, материал, гүнийг AI-аар тооцоолж байна.</p>
            <div className="generation-stages">
              {stages.map(([name, from, to], index) => {
                const done = generation >= to;
                const active = generation >= from && generation < to;
                return (
                  <div key={name} className={done ? "done" : active ? "active" : ""}>
                    <span>{done ? <Check size={14} /> : `0${index + 1}`}</span>
                    <b>{name}</b>
                    <em>{done ? "БЭЛЭН" : active ? `${Math.round(((generation - from) / (to - from)) * 100)}%` : "—"}</em>
                  </div>
                );
              })}
            </div>
            <button className="cancel-generation" onClick={() => go("upload")}>Үүсгэлтийг цуцлах</button>
          </div>
        </main>
      </div>
    );
  };

  const renderStudio = () => (
    <div className="studio-screen page-enter">
      <aside className="studio-rail">
        <button aria-label="Нүүр" onClick={() => go("landing")}><span className="solo-mark"><i /></span></button>
        {[Orbit, Move3D, Expand, Grid2X2].map((Icon, index) => <button key={index} className={index === 0 ? "active" : ""} aria-label="Студийн хэрэгсэл"><Icon size={17} /></button>)}
        <span />
        <button aria-label="Хэрэглэгч" onClick={() => go("auth")}><i className="avatar" /></button>
      </aside>
      <main className="studio-main">
        <header className="studio-header">
          <div><button className="back-mobile" onClick={() => go("upload")}><ArrowLeft size={16} /></button><span><b>Шаазан ваар</b><small>БҮХ ӨӨРЧЛӨЛТ ХАДГАЛАГДСАН</small></span></div>
          <div>
            <button onClick={() => setModal("share")}><Share2 size={15} /> Хуваалцах</button>
            <span className="download-wrap">
              <button onClick={() => setDownloadOpen(!downloadOpen)}><Download size={15} /> Татах <ChevronDown size={13} /></button>
              {downloadOpen && <span className="download-menu page-enter"><button onClick={() => { addToast("GLB файл бэлтгэгдэж байна"); setDownloadOpen(false); }}>GLB · WEB / ANDROID</button><button onClick={() => { addToast("USDZ файл бэлтгэгдэж байна"); setDownloadOpen(false); }}>USDZ · iOS / AR</button></span>}
            </span>
            <Button onClick={() => go("ar")}><Smartphone size={15} /> AR-аар харах</Button>
          </div>
        </header>
        <div className="studio-workspace">
          <div className="studio-viewport">
            <CornerFrame />
            <VaseScene className="vase-canvas" color={vaseColor} material={material} roughness={roughness} autoRotate={autoRotate} showGrid={grid} />
            <span className="viewport-label">PERSPECTIVE · 3D</span>
            <span className="viewport-dimensions">0.42 M × 1.76 M × 0.42 M<br />46,280 POLYGON</span>
            <div className="viewport-tools">
              <button className="active" aria-label="Эргүүлэх"><Orbit size={17} /></button>
              <button aria-label="Шилжүүлэх"><Move3D size={17} /></button>
              <button aria-label="Харагдацыг сэргээх" onClick={() => addToast("Харагдацыг сэргээлээ")}><RotateCcw size={17} /></button>
              <button className={autoRotate ? "active" : ""} aria-label="Автоматаар эргүүлэх" onClick={() => setAutoRotate(!autoRotate)}><ScanLine size={17} /></button>
            </div>
          </div>
          <aside className="studio-panel">
            <div className="studio-tabs">
              <button className={studioTab === "look" ? "active" : ""} onClick={() => setStudioTab("look")}>Харагдац</button>
              <button className={studioTab === "form" ? "active" : ""} onClick={() => setStudioTab("form")}>Хэлбэр</button>
              <button className={studioTab === "environment" ? "active" : ""} onClick={() => setStudioTab("environment")}>Орчин</button>
            </div>
            <div className="panel-body">
              {studioTab === "look" && (
                <>
                  <SectionLabel>МАТЕРИАЛ</SectionLabel>
                  <div className="material-grid">
                    {([['ceramic', 'Шаазан', '#eee7dc'], ['metal', 'Метал', '#a9adb5'], ['wood', 'Мод', '#a5754f'], ['plastic', 'Хуванцар', '#8068ff']] as const).map(([id, name, dot]) => (
                      <button key={id} className={material === id ? "active" : ""} onClick={() => setMaterial(id)}><i style={{ background: dot }} />{name}</button>
                    ))}
                  </div>
                  <SectionLabel>ӨНГӨ</SectionLabel>
                  <div className="color-list">{["#e8e2d6", "#d9714f", "#8068ff", "#c9ff63", "#17181e"].map((color) => <button key={color} aria-label={`Өнгө ${color}`} className={vaseColor === color ? "active" : ""} style={{ background: color }} onClick={() => setVaseColor(color)} />)}</div>
                  <RangeControl label="Барзгар байдал" value={roughness} onChange={setRoughness} />
                  <RangeControl label="Гэрэлтүүлэг" value={light} onChange={setLight} />
                </>
              )}
              {studioTab === "form" && (
                <>
                  <RangeControl label="Хэмжээ" value={size} onChange={setSize} />
                  <RangeControl label="Гөлгөр байдал" value={smoothness} onChange={setSmoothness} />
                  <RangeControl label="Нарийвчлал" value={detail} onChange={setDetail} />
                  <div className="dimension-card"><span>ӨНДӨР <b>1.76 M</b></span><span>ӨРГӨН <b>0.42 M</b></span><span>ПОЛИГОН <b>46,280</b></span></div>
                </>
              )}
              {studioTab === "environment" && (
                <>
                  <SectionLabel>ДЭВСГЭР</SectionLabel>
                  <div className="environment-list">
                    <button className={!grid ? "active" : ""} onClick={() => setGrid(false)}><i className="env-studio" />Студи</button>
                    <button className={grid ? "active" : ""} onClick={() => setGrid(true)}><i className="env-grid" />Торон шугам</button>
                    <button onClick={() => { setGrid(false); addToast("Тунгалаг дэвсгэр сонголоо"); }}><i className="env-clear" />Тунгалаг</button>
                  </div>
                  <RangeControl label="Гэрлийн байрлал" value={light} onChange={setLight} suffix="°" />
                  <label className="toggle-row">Шалны сүүдэр <input type="checkbox" defaultChecked /><i /></label>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );

  const renderAr = () => mobileAr ? (
    <div className="mobile-ar page-enter">
      <div className="ar-room-grid" />
      {arPlaced && <VaseScene className="mobile-ar-vase" color={vaseColor} material={material} />}
      {!arPlaced && <div className="surface-scanner"><i /><span>ГАДАРГУУ ИЛРҮҮЛЖ БАЙНА</span></div>}
      <header><button onClick={() => { setMobileAr(false); setArPlaced(false); }}><X size={15} /> AR горимоос гарах</button><span><i />{arPlaced ? "БАЙРЛУУЛСАН" : "ХАЙЖ БАЙНА"}</span></header>
      <div className="mobile-ar-bottom">
        {!arPlaced ? <Button onClick={() => { setArPlaced(true); addToast("Загварыг байрлууллаа"); }}>Загвар байрлуулах</Button> : (
          <div><button onClick={() => setArPlaced(false)}>Байрлалыг сэргээх</button><button className="shutter" aria-label="Зураг авах" onClick={() => addToast("Зураг хадгалагдлаа")}><i /></button><span>ЗУРАГ АВАХ</span></div>
        )}
      </div>
    </div>
  ) : (
    <div className="ar-screen page-enter">
      <header><button onClick={() => go("studio")}><ArrowLeft size={16} /> Студи руу буцах</button><span>AR · USDZ / GLB</span></header>
      <main>
        <div className="ar-preview"><CornerFrame /><VaseScene className="vase-canvas" color={vaseColor} material={material} /><span>1 : 1 · БОДИТ ХЭМЖЭЭ · 176 MM</span></div>
        <div className="ar-content">
          <div><h1>Загвараа бодит орчинд байрлуулаарай.</h1><p>QR кодыг утсаараа уншуулж, 3D загвараа өөрийн орчинд AR-аар хараарай.</p></div>
          <div className="qr-row"><div className="qr-code" aria-label="AR холбоосын QR код">{qrCells.map((on, index) => <i key={index} className={on ? "on" : ""} />)}<span><Brand compact /></span></div><div className="qr-steps"><span><b>01</b>QR кодыг уншуулна</span><span><b>02</b>Камер ашиглах зөвшөөрөл өгнө</span><span><b>03</b>Загвар байрлуулах гадаргуугаа сонгоно</span></div></div>
          <div className="ar-actions"><Button variant="secondary" onClick={copyLink}><Copy size={15} /> AR холбоос хуулах</Button><Button variant="secondary" onClick={() => setModal("send")}><Smartphone size={15} /> Утас руу илгээх</Button></div>
          <button className="mobile-mode-link" onClick={() => setMobileAr(true)}>→ УТАСНЫ AR ГОРИМ ҮЗЭХ</button>
        </div>
      </main>
    </div>
  );

  const renderModels = () => {
    const cards = [
      ["Шаазан ваар", "ӨНӨӨДӨР · 18.2 MB", "#e8e2d6", "БЭЛЭН"],
      ["Улбар шар сандал", "ӨЧИГДӨР · 24.6 MB", "#d9714f", "БЭЛЭН"],
      ["Тавцангийн гэрэл", "08.03 · 15.1 MB", "#8068ff", "БОЛОВСРУУЛЖ БАЙНА"],
      ["Спорт пүүз", "07.28 · 10.5 MB", "#c9ff63", "НООРОГ"],
    ];
    return (
      <div className="dashboard-layout page-enter">
        <Rail active="models" go={go} />
        <main className="models-main">
          <header><div><SectionLabel>ТАНЫ САН</SectionLabel><h1>Миний загварууд</h1><small>4 ЗАГВАР · 68.4 MB</small></div><Button onClick={() => go("upload")}><Plus size={16} /> Шинэ загвар үүсгэх</Button></header>
          <div className="filter-row">{["Бүгд", "Бэлэн", "Боловсруулж буй", "Ноорог"].map((filter) => <button key={filter} className={galleryFilter === filter ? "active" : ""} onClick={() => setGalleryFilter(filter)}>{filter}</button>)}</div>
          <div className="model-grid">
            {cards.filter((card) => galleryFilter === "Бүгд" || (galleryFilter === "Бэлэн" && card[3] === "БЭЛЭН") || (galleryFilter === "Боловсруулж буй" && card[3].startsWith("БОЛОВС")) || (galleryFilter === "Ноорог" && card[3] === "НООРОГ")).map((card) => (
              <article key={card[0]}>
                <button className="model-thumb" onClick={() => go("detail")}><span className="model-grid-bg" /><MiniVase color={card[2]} /><em className={card[3] === "БЭЛЭН" ? "ready" : ""}>{card[3]}</em><small>GLB · USDZ</small></button>
                <div className="model-card-copy"><span><b>{card[0]}</b><small>{card[1]}</small></span><button aria-label="Нэмэлт цэс" onClick={() => addToast("Загварын цэс нээгдлээ")}><MoreHorizontal /></button></div>
              </article>
            ))}
          </div>
        </main>
      </div>
    );
  };

  const renderDetail = () => (
    <div className="detail-screen page-enter">
      <header><button onClick={() => go("models")}><ArrowLeft size={16} /> Миний загварууд</button><span>ID 4821 · GLB / USDZ</span></header>
      <main>
        <div className="detail-visual"><CornerFrame /><VaseScene className="vase-canvas" color="#e8e2d6" /><span>INTERACTIVE 3D · DRAG TO ROTATE</span></div>
        <div className="detail-copy">
          <SectionLabel>БЭЛЭН · 3D ЗАГВАР</SectionLabel>
          <h1>Шаазан ваар</h1>
          <p>Нэг зургаас үүсгэсэн, AR-д бэлэн өндөр чанартай 3D загвар.</p>
          <div className="detail-actions"><Button onClick={() => go("studio")}><WandSparkles size={16} /> Студид нээх</Button><Button variant="secondary" onClick={() => go("ar")}><Smartphone size={16} /> AR-аар харах</Button></div>
          <div className="detail-specs"><span><b>ФОРМАТ</b>GLB · USDZ</span><span><b>ХЭМЖЭЭ</b>18.2 MB</span><span><b>ПОЛИГОН</b>46,280</span><span><b>ҮҮССЭН</b>2026.08.05</span></div>
          <div className="detail-links"><button onClick={() => setModal("share")}><Share2 size={15} /> Хуваалцах</button><button onClick={copyLink}><Link2 size={15} /> Холбоос хуулах</button><button onClick={() => addToast("GLB файл бэлтгэгдэж байна")}><Download size={15} /> Татах</button></div>
        </div>
      </main>
    </div>
  );

  const renderPricing = () => (
    <div className="pricing-screen page-enter">
      <header><button onClick={() => go("landing")}><Brand /></button><button onClick={() => go("auth")}>Нэвтрэх</button></header>
      <main>
        <SectionLabel>ЭНГИЙН · ИЛ ТОД</SectionLabel>
        <h1>Өөрт тохирох<br />багцаа сонго.</h1>
        <p>Хэзээ ч цуцалж болно. Нууц төлбөр байхгүй.</p>
        <div className="billing-toggle"><button className={!yearly ? "active" : ""} onClick={() => setYearly(false)}>Сараар</button><button className={yearly ? "active" : ""} onClick={() => setYearly(true)}>Жилээр <span>−20%</span></button></div>
        <div className="pricing-grid">{planData.map((plan) => <article key={plan.name} className={plan.recommended ? "recommended" : ""}>{plan.recommended && <em>ХАМГИЙН ИХ СОНГОДОГ</em>}<SectionLabel>{plan.name.toUpperCase()}</SectionLabel><div className="plan-price">{yearly ? plan.yearly : plan.monthly}<small>/ САР{yearly ? " · ЖИЛЭЭР" : ""}</small></div><p>{plan.description}</p><Button variant={plan.recommended ? "primary" : "secondary"} onClick={() => plan.name === "Баг" ? setModal("send") : go("upload")}>{plan.cta}</Button><ul>{plan.features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul></article>)}</div>
      </main>
    </div>
  );

  const renderAuth = () => (
    <div className="auth-screen page-enter">
      <div className="auth-art"><button onClick={() => go("landing")}><Brand /></button><div className="auth-object"><VaseScene className="vase-canvas" color="#8068ff" /></div><div><SectionLabel>2D → 3D → AR</SectionLabel><h2>Санаагаа шинэ<br />хэмжээст оруул.</h2></div></div>
      <main className="auth-panel">
        <button className="auth-back" onClick={() => go("landing")}><ArrowLeft size={16} /> Нүүр рүү буцах</button>
        <div className="auth-form">
          <SectionLabel>{authMode === "login" ? "ТАВТАЙ МОРИЛ" : "ШИНЭ БҮРТГЭЛ"}</SectionLabel>
          <h1>{authMode === "login" ? "Нэвтрэх" : "Бүртгэл үүсгэх"}</h1>
          <p>{authMode === "login" ? "Үргэлжлүүлэн загваруудаа бүтээхийн тулд нэвтэрнэ үү." : "Нэг минутын дотор MORPH AR-аа ашиглаж эхлээрэй."}</p>
          <button className="google-button" onClick={() => addToast("Google нэвтрэлтийн демо")}><span>G</span> Google-ээр үргэлжлүүлэх</button>
          <div className="auth-or"><i />ЭСВЭЛ<i /></div>
          {authMode === "signup" && <label>НЭР<input type="text" placeholder="Таны нэр" /></label>}
          <label>И-МЭЙЛ<input type="email" placeholder="name@example.com" /></label>
          <label>НУУЦ ҮГ<input type="password" placeholder="••••••••" /></label>
          <Button onClick={() => { addToast(authMode === "login" ? "Амжилттай нэвтэрлээ" : "Бүртгэл үүслээ"); go("models"); }}>{authMode === "login" ? "Нэвтрэх" : "Бүртгэл үүсгэх"}<ArrowRight size={16} /></Button>
          <span className="auth-switch">{authMode === "login" ? "Бүртгэлгүй юу?" : "Бүртгэлтэй юу?"}<button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Бүртгүүлэх" : "Нэвтрэх"}</button></span>
        </div>
      </main>
    </div>
  );

  const screenContent: Record<Screen, () => ReactNode> = {
    landing: renderLanding,
    upload: renderUpload,
    generate: renderGenerate,
    studio: renderStudio,
    ar: renderAr,
    models: renderModels,
    detail: renderDetail,
    pricing: renderPricing,
    auth: renderAuth,
  };

  return (
    <div className="morph-app">
      {screenContent[screen]()}
      <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.id}><Check size={14} />{toast.text}</div>)}</div>
      {modal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={modal === "share" ? "Хуваалцах" : "Утас руу илгээх"}>
          <div className="modal-card page-enter">
            <button className="modal-close" aria-label="Хаах" onClick={() => setModal(null)}><X size={18} /></button>
            {modal === "share" ? <><span className="modal-icon"><Share2 /></span><h2>Загвар хуваалцах</h2><p>Энэ холбоостой хүн 3D загварыг үзэх боломжтой.</p><div className="share-link"><span>morph.ar/m/4821</span><button onClick={copyLink}><Copy size={15} /></button></div><label className="toggle-row">Файл татах боломжтой <input type="checkbox" defaultChecked /><i /></label><Button onClick={() => { setModal(null); addToast("Хуваалцах тохиргоо хадгалагдлаа"); }}>Хадгалах</Button></> : <><span className="modal-icon"><Smartphone /></span><h2>Утас руу илгээх</h2><p>AR холбоос хүлээн авах утасны дугаараа оруулна уу.</p><label className="phone-field">+976<input inputMode="tel" placeholder="9911 2233" /></label><Button onClick={() => { setModal(null); addToast("AR холбоос илгээлээ"); }}>Илгээх <ArrowRight size={16} /></Button></>}
          </div>
        </div>
      )}
    </div>
  );
}
