"use client";

import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  Copy,
  Download,
  Grid2X2,
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
  Loader2,
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
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import ModelViewer, { type ModelViewerHandle } from "./ModelViewer";
import QrCode from "./QrCode";
import SnapLanding from "./SnapLanding";
import { motionTokens } from "./motion-tokens";

const VaseScene = dynamic(() => import("./VaseScene"), {
  ssr: false,
  loading: () => <div className="vase-canvas canvas-loading" aria-hidden="true" />,
});
import type { PublicTask } from "@/lib/meshy";
import {
  absoluteUrl,
  analyzeImage,
  listModels,
  loadSourceImage,
  modelUrls,
  refreshPreview,
  removeModel,
  renderForUpload,
  saveModel,
  updateModel,
  useModels,
  usePlatform,
  type ImageAnalysis,
  type Rotation,
  type SourceImage,
  type StoredModel,
} from "@/lib/models";

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

type ManualUploadMeta = {
  id: string;
  name: string;
  hasUsdz: boolean;
  createdAt: number;
};

type UploadedPart = { partNumber: number; etag: string };

async function readUploadResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: { error?: string } & Partial<T> = {};
  try {
    payload = JSON.parse(text) as { error?: string } & Partial<T>;
  } catch {
    /* proxy/server plain text error */
  }
  if (!response.ok) {
    throw new Error(
      payload.error ??
        (response.status === 413
          ? "Файл серверийн зөвшөөрөх хэмжээнээс том байна."
          : "Upload амжилтгүй боллоо. Дахин оролдоно уу."),
    );
  }
  return payload as T;
}

/** Том файлыг 5 MB хэсгүүдээр дамжуулж R2 дээр нэг объект болгон нийлүүлнэ. */
async function uploadManualFile(
  file: File,
  format: "glb" | "usdz",
  id: string | undefined,
  onProgress: (percent: number) => void,
): Promise<ManualUploadMeta> {
  const startResponse = await fetch("/api/manual-model/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      format,
      id,
    }),
  });
  const start = await readUploadResponse<{
    id: string;
    uploadId: string;
    partSize: number;
  }>(startResponse);

  const partCount = Math.ceil(file.size / start.partSize);
  const parts: UploadedPart[] = [];
  for (let index = 0; index < partCount; index++) {
    const partNumber = index + 1;
    const chunk = file.slice(
      index * start.partSize,
      Math.min(file.size, (index + 1) * start.partSize),
    );
    const partResponse = await fetch(
      `/api/manual-model/multipart/${start.id}/${format}/${partNumber}?uploadId=${encodeURIComponent(start.uploadId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: chunk,
      },
    );
    parts.push(await readUploadResponse<UploadedPart>(partResponse));
    onProgress(Math.round((partNumber / (partCount + 1)) * 100));
  }

  const completeResponse = await fetch(
    `/api/manual-model/multipart/${start.id}/${format}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: start.uploadId,
        fileName: file.name,
        parts,
      }),
    },
  );
  const meta = await readUploadResponse<ManualUploadMeta>(completeResponse);
  onProgress(100);
  return meta;
}

const planData = [
  {
    name: "Эхлэл",
    monthly: "₮0",
    yearly: "₮0",
    description: "3D-г анх удаа туршиж буй хүнд.",
    features: [
      "Сард 3 загвар",
      "Стандарт чанар",
      "GLB татах",
      "7 хоног хадгална",
    ],
    cta: "Үнэгүй эхлэх",
  },
  {
    name: "Бүтээгч",
    monthly: "₮39,000",
    yearly: "₮31,000",
    description: "Тогтмол контент бүтээдэг хүмүүст.",
    features: [
      "Сард 30 загвар",
      "Өндөр чанар",
      "GLB + USDZ",
      "AR холбоос",
      "1 жил хадгална",
    ],
    cta: "Бүтээгч сонгох",
    recommended: true,
  },
  {
    name: "Баг",
    monthly: "₮149,000",
    yearly: "₮119,000",
    description: "Бүтээгдэхүүний баг, студид.",
    features: [
      "Сард 150 загвар",
      "5 гишүүн",
      "Брэнд AR хуудас",
      "Priority боловсруулалт",
      "API хандалт",
    ],
    cta: "Холбогдох",
  },
];

const STATUS_LABEL: Record<StoredModel["status"], string> = {
  PENDING: "ДАРААЛАЛД",
  IN_PROGRESS: "БОЛОВСРУУЛЖ БАЙНА",
  SUCCEEDED: "БЭЛЭН",
  FAILED: "АМЖИЛТГҮЙ",
  CANCELED: "ЦУЦАЛСАН",
};

const BASE_TITLE = "SnapAR — From one image to 3D, then AR";

/**
 * Таб ар талд байхад системийн мэдэгдэл харуулах.
 * Зөвшөөрөл асуухгүй — хэрэглэгч өөрөө идэвхжүүлээгүй бол зүгээр өнгөрнө.
 */
function notifyDone(body: string, title: string) {
  if (typeof Notification === "undefined") return;
  if (document.visibilityState === "visible") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    /* зарим хөтөч service worker шаарддаг */
  }
}

type Check = { label: string; value: string; level: "ok" | "warn" };

/** Canvas-аас гарсан бодит хэмжигдэхүүнийг хүнд ойлгомжтой болгох. */
function describeAnalysis(analysis: ImageAnalysis): Check[] {
  const { brightness, contrast, subjectCoverage, backgroundUniformity } =
    analysis;

  const light: Check =
    brightness < 0.22
      ? { label: "Гэрэлтүүлэг", value: "Бүдэг", level: "warn" }
      : brightness > 0.82
        ? { label: "Гэрэлтүүлэг", value: "Хэт цайвар", level: "warn" }
        : { label: "Гэрэлтүүлэг", value: "Сайн", level: "ok" };

  const detail: Check =
    contrast < 0.35
      ? { label: "Ялгарал", value: "Сул", level: "warn" }
      : { label: "Ялгарал", value: "Сайн", level: "ok" };

  const frame: Check =
    subjectCoverage < 0.12
      ? { label: "Объектын хэмжээ", value: "Хэт жижиг", level: "warn" }
      : subjectCoverage > 0.86
        ? { label: "Объектын хэмжээ", value: "Кадраас халих", level: "warn" }
        : { label: "Объектын хэмжээ", value: "Сайн", level: "ok" };

  const background: Check =
    backgroundUniformity < 0.45
      ? { label: "Дэвсгэр", value: "Замбараагүй", level: "warn" }
      : { label: "Дэвсгэр", value: "Цэвэр", level: "ok" };

  return [frame, background, light, detail];
}

/** Секундыг «2 мин 10 сек» болгох. */
function formatEta(seconds: number) {
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} мин ${rest} сек` : `${minutes} мин`;
}

function relativeDate(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "ӨНӨӨДӨР";
  if (days === 1) return "ӨЧИГДӨР";
  return new Date(timestamp)
    .toLocaleDateString("mn-MN", { month: "2-digit", day: "2-digit" })
    .replace(/\//g, ".");
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span>SnapAR</span>
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

/**
 * Навигацын ЦОРЫН ГАНЦ эх сурвалж.
 *
 * Толгой хэсгийн цэс, утасны цэс, хажуугийн rail гурвуулаа энэ жагсаалтаас
 * үүснэ. Ингэснээр нэг хэсэг рүү хоёр өөр нэрээр орох давхардал үүсэхгүй.
 */
const NAV_ITEMS = [
  { key: "upload", label: "Үүсгэх", icon: Plus },
  { key: "models", label: "Миний загварууд", icon: Box },
  { key: "pricing", label: "Үнийн багц", icon: Grid2X2 },
] as const;

/** Аль цэсний зүйл идэвхтэй болохыг тодорхойлно. */
function navKeyFor(screen: Screen): (typeof NAV_ITEMS)[number]["key"] | null {
  if (screen === "upload" || screen === "generate") return "upload";
  if (screen === "models" || screen === "detail" || screen === "studio")
    return "models";
  if (screen === "pricing") return "pricing";
  return null;
}

/**
 * Аппын ЦОРЫН ГАНЦ навигац.
 *
 * Өмнө нь нүүр хуудас навбар, аппын дэлгэцүүд хажуугийн rail гэсэн хоёр
 * өөр систем ашигладаг байсан. Одоо бүх дэлгэц энэ нэг толгойг хуваалцана:
 *   компьютер → хэвтээ цэс,  утас → гамбургер + доод таб.
 */
function SiteHeader({
  screen,
  go,
  balance,
  onOpenMenu,
  variant = "app",
  steps,
  hasTabs = false,
}: {
  screen: Screen;
  go: (screen: Screen) => void;
  /** Meshy дансны бодит кредит. null = ачаалж байна / боломжгүй. */
  balance: number | null;
  onOpenMenu: () => void;
  /** "landing" дээр CTA товч, "app" дээр кредит харагдана */
  variant?: "landing" | "app";
  /**
   * Ажлын урсгалын алхам. Өгвөл 01–02–03 индикатор ЭНЭ толгойн дотор
   * гарна — өмнөх шиг тусдаа хоёр дахь бар үүсэхгүй.
   */
  steps?: 1 | 2 | 3;
  /** Утсан дээр доод таб байгаа эсэх — байвал толгойн ☰ хэрэггүй. */
  hasTabs?: boolean;
}) {
  const activeKey = navKeyFor(screen);
  const runs = balance === null ? null : Math.floor(balance / 30);

  return (
    <header className="site-header">
      <div className="header-left">
        <button className="header-brand" onClick={() => go("landing")}>
          <Brand />
        </button>
        {/* Хуучин .progress-header бар энд шингэсэн: 72 + 66px → 72px */}
        {steps && <ProgressSteps step={steps} />}
      </div>

      {/*
        Цэс нь БҮХ дэлгэц дээр яг ижил гурван зүйлтэй. Өмнө нь нүүр дээр
        "Үүсгэх" байхгүй байсан тул апп руу ороход бусад зүйл нь хажуу тийш
        үсэрдэг байв.
      */}
      <nav className="desktop-nav" aria-label="Үндсэн цэс">
        {NAV_ITEMS.map((item) => {
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={() => go(item.key as Screen)}
            >
              {item.label}
            </button>
          );
        })}

        <span className="nav-divider" />

        {/* Тогтмол өргөнтэй слот — CTA ↔ кредит солигдоход толгой хөдлөхгүй */}
        <span className="header-end">
          {variant === "app" ? (
            <button
              className="credit-chip"
              onClick={() => go("pricing")}
              title={
                runs === null
                  ? "Кредит шалгаж байна"
                  : `≈ ${runs} загвар үүсгэх боломжтой`
              }
            >
              <Sparkles size={13} />
              {balance === null ? "—" : balance.toLocaleString()}
              <small>КРЕДИТ</small>
            </button>
          ) : (
            <Button onClick={() => go("upload")}>Одоо эхлэх</Button>
          )}
          <button onClick={() => go("auth")}>Нэвтрэх</button>
        </span>
      </nav>

      {/*
        Доод таб байгаа дэлгэц дээр энэ блок бүхэлдээ хэрэггүй:
        "Үүсгэх" болон "Цэс" хоёул доод табанд, эрхий хурууны зайд байна.
      */}
      {!hasTabs && (
        <div className="mobile-nav-actions">
          {variant === "landing" && (
            <Button onClick={() => go("upload")}>Эхлэх</Button>
          )}
          <button
            className="icon-button"
            aria-label="Цэс нээх"
            onClick={onOpenMenu}
          >
            <Menu size={19} />
          </button>
        </div>
      )}
    </header>
  );
}

/**
 * Утасны доод навигац.
 *
 * Desktop дээрх зүүн rail нь жижиг дэлгэц дээр далдардаг байсан тул
 * хэрэглэгч дэлгэц хооронд шилжих аргагүй болдог байсан. Доод таб нь эрхий
 * хуруунд хүрэх зайд байрлана.
 */
function MobileTabs({
  screen,
  go,
  hasModel,
  onOpenMenu,
}: {
  screen: Screen;
  go: (screen: Screen) => void;
  hasModel: boolean;
  onOpenMenu: () => void;
}) {
  // Эхний хоёр нь толгойн цэстэй тохирно, дараагийн хоёр нь ажлын урсгалын алхам.
  const tabs = [
    { key: "upload", label: "Үүсгэх", icon: Plus, enabled: true },
    { key: "models", label: "Загварууд", icon: Box, enabled: true },
    { key: "studio", label: "Студи", icon: Orbit, enabled: hasModel },
    { key: "ar", label: "AR", icon: Smartphone, enabled: hasModel },
  ] as const;

  return (
    <nav className="mobile-tabs" aria-label="Үндсэн навигац">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active =
          screen === tab.key ||
          (tab.key === "upload" && screen === "generate") ||
          (tab.key === "models" && screen === "detail");
        return (
          <button
            key={tab.key}
            className={active ? "active" : ""}
            disabled={!tab.enabled}
            aria-current={active ? "page" : undefined}
            onClick={() => go(tab.key as Screen)}
          >
            <Icon size={19} />
            <span>{tab.label}</span>
          </button>
        );
      })}
      {/* Нүүр, үнийн багц, нэвтрэх рүү гарах цорын ганц зам */}
      <button onClick={onOpenMenu} aria-label="Цэс нээх">
        <Menu size={19} />
        <span>Цэс</span>
      </button>
    </nav>
  );
}

/**
 * Ажлын урсгалын алхмууд — толгойн дотор багтана.
 *
 * Өмнө нь `.progress-header` гэсэн бүтэн өргөнтэй тусдаа бар байсан бөгөөд
 * site-header-ийн шууд доор наалддаг тул утсан дээр контент эхлэхээс өмнө
 * 138px чимэглэл эзэлдэг байв. Утсан дээр зөвхөн ИДЭВХТЭЙ алхам харагдана.
 */
function ProgressSteps({ step = 1 }: { step?: 1 | 2 | 3 }) {
  const items = ["ЗУРАГ ОРУУЛАХ", "ҮҮСГЭХ", "AR"];
  return (
    <ol className="progress-steps" aria-label="Ажлын урсгал">
      {items.map((item, index) => {
        const state =
          step === index + 1 ? "active" : step > index + 1 ? "done" : "";
        return (
          <li
            key={item}
            className={state}
            aria-current={state === "active" ? "step" : undefined}
          >
            <b>0{index + 1}</b>
            {item}
            {index < items.length - 1 && <i />}
          </li>
        );
      })}
    </ol>
  );
}

function CornerFrame() {
  return (
    <span className="corner-frame" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
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
      <span>
        <b>{label}</b>
        <em>
          {value}
          {suffix}
        </em>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function MiniVase({ color = "#e8e2d6" }: { color?: string }) {
  return (
    <span
      className="mini-vase"
      style={{ "--vase-color": color } as React.CSSProperties}
    />
  );
}

export default function MorphApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [navOpen, setNavOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
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
  // Утсан дээр студийн панель доод хуудас (bottom sheet) болж нээгддэг
  const [sheetOpen, setSheetOpen] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState("Бүгд");
  const [yearly, setYearly] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const manualModelInput = useRef<HTMLInputElement>(null);
  const [manualUploading, setManualUploading] = useState(false);
  const [manualUploadProgress, setManualUploadProgress] = useState(0);

  /* ---------------------------- Meshy төлөв ---------------------------- */
  // 1–4 эх зураг. Эргүүлэлт/тайралт нь эдгээрт бодитоор хэрэглэгдэнэ.
  const [sources, setSources] = useState<SourceImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageEnhancement, setImageEnhancement] = useState(true);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskKind, setTaskKind] = useState<string | null>(null);
  const [task, setTask] = useState<PublicTask | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const models = useModels();
  const platform = usePlatform();
  const viewerRef = useRef<ModelViewerHandle>(null);

  const currentModel = models.find((model) => model.id === taskId);
  const isManualModel = currentModel?.kind === "manual";
  const modelReady = task?.status === "SUCCEEDED" || isManualModel;
  const urls = taskId ? modelUrls(taskId) : null;

  const addToast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2800);
  }, []);

  // Тандалтын callback дотроос одоогийн дэлгэцийг унших (deps-д оруулахгүйгээр)
  const screenRef = useRef<Screen>(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  const go = useCallback((next: Screen) => {
    setScreen(next);
    setNavOpen(false);
    setDownloadOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /**
   * Meshy дансны бодит кредитийг татах.
   * Хуудас нээгдэхэд болон даалгавар илгээсний дараа дуудагдана.
   */
  const refreshBalance = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/balance", { signal });
      if (!response.ok) return null;
      const data = (await response.json()) as { balance?: number };
      return typeof data.balance === "number" ? data.balance : null;
    } catch {
      return null; // кредит харуулах нь заавал биш
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshBalance(controller.signal).then((value) => {
      if (!controller.signal.aborted && value !== null) setBalance(value);
    });
    return () => controller.abort();
  }, [refreshBalance]);

  /**
   * URL-аас даалгаврыг сэргээх.
   *
   * Өмнө нь taskId зөвхөн React state-д байсан тул хуудсаа refresh хийхэд
   * ажиллаж буй үүсгэлт алга болдог байсан. Одоо ?task=<id> хаягт үлдэнэ.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("task");
    if (fromUrl) {
      // Энэ утгыг эхний render-т уншиж болохгүй: сервер дээр `window` байхгүй
      // тул hydration зөрөх болно. Тиймээс hydration дууссаны дараа энд
      // тавьж байгаа нь зориудын шийдэл.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTaskId(fromUrl);
      setTaskKind(params.get("kind"));
      setScreen(params.get("screen") === "generate" ? "generate" : "studio");
      return;
    }
    // URL-д байхгүй бол сангаас дуусаагүй даалгавар байвал сэргээнэ.
    const pending = listModels().find(
      (model) => model.status === "PENDING" || model.status === "IN_PROGRESS",
    );
    if (pending) {
      setTaskId(pending.id);
      setTaskKind(pending.kind ?? null);
    }
  }, []);

  /** Даалгавар солигдоход хаягийг шинэчлэх (буцах товч ажиллана). */
  useEffect(() => {
    if (!taskId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("task", taskId);
    if (taskKind) url.searchParams.set("kind", taskKind);
    url.searchParams.delete("screen");
    window.history.replaceState(null, "", url);
  }, [taskId, taskKind]);

  /**
   * Meshy даалгаврыг тандах. Хүсэлт нь /api/task/<id> рүү явж, тэндээс
   * серверийн түлхүүрээр Meshy-тэй ярилцана — API key браузерт гарахгүй.
   */
  useEffect(() => {
    if (!taskId) return;
    if (taskKind === "manual" || taskId.startsWith("upload_")) return;
    // Дууссан даалгаврыг дахин тандахгүй.
    if (
      task?.status === "SUCCEEDED" ||
      task?.status === "FAILED" ||
      task?.status === "CANCELED"
    ) {
      return;
    }

    let alive = true;

    const poll = async () => {
      try {
        const query = taskKind ? `?kind=${encodeURIComponent(taskKind)}` : "";
        const response = await fetch(`/api/task/${taskId}${query}`, {
          cache: "no-store",
        });
        if (!alive) return;

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Төлөв шалгаж чадсангүй.");
        }

        const next = (await response.json()) as PublicTask;
        if (!alive) return;

        setTask(next);
        setGeneration(next.progress);
        if (next.kind) setTaskKind(next.kind);
        updateModel(next.id, { status: next.status });

        // Зөвхөн үүсгэлтийн дэлгэц дээр байхад мэдэгдэж, дэлгэц солино —
        // сангаас өмнө дуусгасан загвар нээхэд дэмий toast гарахгүй.
        const onGenerateScreen = screenRef.current === "generate";

        if (next.status === "SUCCEEDED") {
          if (onGenerateScreen) {
            addToast("3D загвар бэлэн болсон");
            notifyDone("3D загвар бэлэн боллоо", "SnapAR");
            setScreen("studio");
          }
        } else if (next.status === "FAILED" || next.status === "CANCELED") {
          setGenError(next.error ?? "Үүсгэлт амжилтгүй боллоо.");
          if (onGenerateScreen) {
            addToast("Үүсгэлт амжилтгүй боллоо");
            notifyDone("Үүсгэлт амжилтгүй боллоо", "SnapAR");
            setScreen("upload");
          }
        }
      } catch (error) {
        if (!alive) return;
        setGenError(
          error instanceof Error ? error.message : "Сүлжээний алдаа гарлаа.",
        );
      }
    };

    void poll();
    // Дараалалд байхад олон дуудах шаардлагагүй.
    const interval = window.setInterval(
      poll,
      task?.status === "PENDING" ? 5000 : 2500,
    );

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [addToast, taskId, taskKind, task?.status]);

  /** Таб ар талд байхад гарчигт явцыг харуулах. */
  useEffect(() => {
    if (!task || task.status === "SUCCEEDED" || task.status === "FAILED") {
      document.title = BASE_TITLE;
      return;
    }
    document.title = `${Math.round(task.progress)}% · ${BASE_TITLE}`;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [task]);

  /* --------------------------- эх зурагтай ажиллах -------------------------- */

  const addFiles = async (files: FileList | File[] | null | undefined) => {
    if (!files) return;

    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
        addToast(`${file.name}: зөвхөн JPG, PNG, WEBP`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        addToast(`${file.name}: 20 MB-аас том байна`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;

    setLoadingImage(true);
    try {
      const room = 4 - sources.length;
      if (room <= 0) {
        addToast("Хамгийн ихдээ 4 зураг");
        return;
      }
      if (accepted.length > room) {
        addToast(`Зөвхөн эхний ${room} зургийг авлаа`);
      }

      const loaded = await Promise.all(
        accepted.slice(0, room).map((file) => loadSourceImage(file)),
      );

      setSources((current) => {
        const next = [...current, ...loaded].slice(0, 4);
        setActiveIndex(next.length - 1);
        return next;
      });
      setGenError(null);
      addToast(
        loaded.length > 1
          ? `${loaded.length} зураг орлоо`
          : "Зураг амжилттай орлоо",
      );
    } catch {
      addToast("Зураг уншиж чадсангүй");
    } finally {
      setLoadingImage(false);
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    void addFiles(event.target.files);
    event.target.value = "";
  };

  /** Бэлэн GLB (+ сонголтоор USDZ)-г шууд AR холбоостой болгох. */
  const handleManualModel = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || manualUploading) return;

    const glb = files.find((file) => file.name.toLowerCase().endsWith(".glb"));
    const usdz = files.find((file) => file.name.toLowerCase().endsWith(".usdz"));
    if (!glb) {
      addToast("GLB файл сонгоно уу");
      return;
    }
    if (
      glb.size > 250 * 1024 * 1024 ||
      (usdz?.size ?? 0) > 250 * 1024 * 1024
    ) {
      addToast("GLB болон USDZ файл тус бүр 250 MB-аас бага байх ёстой");
      return;
    }

    setManualUploading(true);
    setManualUploadProgress(0);
    setGenError(null);
    try {
      const glbMeta = await uploadManualFile(glb, "glb", undefined, (value) =>
        setManualUploadProgress(usdz ? Math.round(value * 0.7) : value),
      );

      let hasUsdz = false;
      if (usdz) {
        try {
          await uploadManualFile(usdz, "usdz", glbMeta.id, (value) =>
            setManualUploadProgress(70 + Math.round(value * 0.3)),
          );
          hasUsdz = true;
        } catch {
          addToast("GLB орлоо, харин USDZ хадгалагдсангүй");
        }
      }

      saveModel({
        id: glbMeta.id,
        name: glbMeta.name ?? glb.name.replace(/\.glb$/i, ""),
        status: "SUCCEEDED",
        createdAt: glbMeta.createdAt ?? Date.now(),
        quality: "high",
        kind: "manual",
        hasUsdz,
      });
      setTask(null);
      setTaskKind("manual");
      setTaskId(glbMeta.id);
      addToast("3D загвар AR-д бэлэн боллоо");
      go("ar");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "3D загварыг оруулж чадсангүй.";
      setGenError(message);
      addToast(message);
    } finally {
      setManualUploading(false);
      setManualUploadProgress(0);
    }
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  /** Эргүүлэлт/тайралтыг өөрчлөөд урьдчилсан харагдацыг дахин зурна. */
  const editSource = async (id: string, patch: Partial<SourceImage>) => {
    const current = sources.find((source) => source.id === id);
    if (!current) return;

    const updated = await refreshPreview({ ...current, ...patch });
    const analysis = await analyzeImage(updated.preview).catch(
      () => current.analysis,
    );

    setSources((list) =>
      list.map((source) =>
        source.id === id ? { ...updated, analysis } : source,
      ),
    );
  };

  const removeSource = (id: string) => {
    setSources((list) => {
      const next = list.filter((source) => source.id !== id);
      setActiveIndex((index) => Math.max(0, Math.min(index, next.length - 1)));
      return next;
    });
  };

  /** Meshy рүү даалгавар илгээнэ (1 зураг → image-to-3d, 2+ → multi). */
  const startGeneration = async () => {
    if (sources.length === 0 || submitting) return;

    setSubmitting(true);
    setGenError(null);
    setGeneration(0);
    setTask(null);
    setTaskId(null);
    setTaskKind(null);

    try {
      // Эргүүлэлт, тайралтыг ЭНД бодитоор хэрэглэж байж илгээнэ.
      const images = await Promise.all(sources.map(renderForUpload));

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, quality, imageEnhancement }),
      });

      const payload = (await response.json()) as {
        id?: string;
        kind?: string;
        task?: PublicTask | null;
        error?: string;
      };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Үүсгэх хүсэлт амжилтгүй боллоо.");
      }

      setTaskId(payload.id);
      setTaskKind(payload.kind ?? null);
      setTask(payload.task ?? null);

      saveModel({
        id: payload.id,
        name: sources[0].name.replace(/\.[^.]+$/, "") || "Нэргүй загвар",
        status: payload.task?.status ?? "PENDING",
        createdAt: Date.now(),
        quality,
        kind: payload.kind as StoredModel["kind"],
        sourceCount: sources.length,
        thumbnail: sources[0].preview,
      });
      go("generate");
      void refreshBalance().then((value) => {
        if (value !== null) setBalance(value);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Тодорхойгүй алдаа гарлаа.";
      setGenError(message);
      addToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  /** Сангаас загвар нээх */
  const openModel = useCallback(
    (model: StoredModel, screenName: Screen = "detail") => {
      setTaskId(model.id);
      setTaskKind(model.kind ?? null);
      setTask(null);
      setGenError(null);
      go(screenName);
    },
    [go],
  );

  const arLink = taskId ? absoluteUrl(modelUrls(taskId).arPage) : "";

  const copyLink = async () => {
    if (!arLink) {
      addToast("Эхлээд загвар үүсгэнэ үү");
      return;
    }
    try {
      await navigator.clipboard.writeText(arLink);
      addToast("AR холбоос хууллаа");
    } catch {
      addToast("Холбоос хуулах боломжгүй байна");
    }
  };

  /**
   * Төхөөрөмжийн жинхэнэ хуваалцах цэсийг нээх (Web Share API).
   * Утсан дээр Messenger, Message, WhatsApp зэрэг бүх апп гарч ирнэ.
   * Дэмждэггүй хөтөч дээр холбоосыг хуулна.
   */
  const shareLink = async () => {
    if (!arLink) {
      addToast("Эхлээд загвар үүсгэнэ үү");
      return;
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: currentModel?.name ?? "SnapAR model",
          text: "Энэ 3D загварыг утсаараа AR-аар хараарай:",
          url: arLink,
        });
        return;
      } catch (error) {
        // Хэрэглэгч цуцалсан бол дуугарахгүй.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  /** Утсан дээр шууд AR нээх, компьютер дээр зөвлөмж харуулах */
  const openAr = () => {
    if (viewerRef.current?.canActivateAR()) {
      viewerRef.current.activateAR();
      return;
    }
    if (!urls) return;
    if (platform === "ios") {
      window.location.href = urls.usdz;
    } else if (platform === "android") {
      const file = absoluteUrl(urls.glb);
      window.location.href =
        `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(file)}` +
        `&mode=ar_preferred&resizable=false#Intent;scheme=https;` +
        `package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
    } else {
      addToast("QR кодыг утсаараа уншуулна уу");
    }
  };

  const renderLanding = () => (
    <SnapLanding onCreate={() => go("upload")} onModels={() => go("models")} />
  );

  const renderUpload = () => {
    const active = sources[activeIndex] ?? sources[0] ?? null;
    const checks = active?.analysis ? describeAnalysis(active.analysis) : null;

    return (
      <div className="dashboard-layout page-enter">
        <SiteHeader
          screen={screen}
          go={go}
          balance={balance}
          onOpenMenu={() => setNavOpen(true)}
          steps={1}
          hasTabs
        />
        <main className="dashboard-main">
          <div className="upload-content">
            {sources.length === 0 ? (
              <>
                <div className="manual-model-card">
                  <span className="manual-model-icon" aria-hidden="true">
                    <Box />
                  </span>
                  <div>
                    <SectionLabel>ШУУД AR ТУРШИЛТ</SectionLabel>
                    <h2>Бэлэн 3D загвар байна уу?</h2>
                    <p>
                      GLB файлаа оруулаад шууд 3D-аар үзэж, QR кодоор утсандаа
                      нээгээд AR-аар байрлуулаарай. iPhone-д USDZ файлыг хамт
                      сонговол хамгийн найдвартай. <strong>Файл тус бүр 250 MB хүртэл.</strong>
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => manualModelInput.current?.click()}
                    disabled={manualUploading}
                  >
                    {manualUploading ? (
                      <Loader2 size={17} className="spin" />
                    ) : (
                      <Upload size={17} />
                    )}
                    {manualUploading
                      ? `Оруулж байна… ${manualUploadProgress}%`
                      : "3D файл оруулах"}
                  </Button>
                </div>
                <div className="upload-method-divider">
                  <span>ЭСВЭЛ ЗУРГААС 3D ҮҮСГЭХ</span>
                </div>
                <h1>Зургаа энд оруулна уу</h1>
                <p>
                  Нэг объект тод харагдсан, цэвэр дэвсгэртэй зураг ашиглавал
                  илүү сайн үр дүн гарна. <b>Олон өнцгөөс авсан 2–4 зураг</b>{" "}
                  оруулбал геометр мэдэгдэхүйц сайжирна.
                </p>
                <div
                  className={`drop-zone ${dragging ? "dragging" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInput.current?.click()}
                >
                  <CornerFrame />
                  <span className="scan-line" />
                  <span className="drop-label">DROP ZONE</span>
                  <div className="drop-center">
                    <span className="upload-glyph">
                      {loadingImage ? <Loader2 className="spin" /> : <Upload />}
                    </span>
                    <div className="drop-actions">
                      <Button
                        onClick={(event) => {
                          event.stopPropagation();
                          fileInput.current?.click();
                        }}
                        disabled={loadingImage}
                      >
                        {loadingImage ? "Уншиж байна…" : "Зураг сонгох"}
                      </Button>
                    </div>
                    <span className="file-note">
                      JPG, PNG, WEBP · 4 ХҮРТЭЛ ЗУРАГ
                    </span>
                  </div>
                </div>
                {genError && <p className="form-error">{genError}</p>}
              </>
            ) : (
              <div className="upload-ready page-enter">
                <div className="image-editor">
                  <h1>
                    {sources.length > 1
                      ? `${sources.length} зураг бэлэн`
                      : "Зураг бэлэн боллоо"}
                  </h1>
                  <p>
                    {sources.length > 1
                      ? "Бүх зураг нэг объектын өөр өнцөг байх ёстой."
                      : "Өөр өнцгөөс нэмж зураг оруулбал үр дүн сайжирна."}
                  </p>

                  <div className="image-preview">
                    <CornerFrame />
                    {active && (
                      <motion.div
                        layoutId="snapar-subject"
                        className="uploaded-image"
                        role="img"
                        aria-label={`Оруулсан зураг: ${active.name}`}
                        style={{ backgroundImage: `url(${active.preview})` }}
                        transition={motionTokens.spring.gentle}
                      />
                    )}
                    <span className="preview-meta">{active?.name}</span>
                  </div>

                  {/* Олон зургийн жагсаалт */}
                  <div className="source-strip">
                    {sources.map((source, index) => (
                      <button
                        key={source.id}
                        className={`source-chip ${index === activeIndex ? "active" : ""}`}
                        onClick={() => setActiveIndex(index)}
                        title={source.name}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={source.preview} alt="" />
                        <em>{index === 0 ? "ГОЛ" : `${index + 1}`}</em>
                        <span
                          className="source-remove"
                          role="button"
                          tabIndex={-1}
                          aria-label="Хасах"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeSource(source.id);
                          }}
                        >
                          <X size={11} />
                        </span>
                      </button>
                    ))}
                    {sources.length < 4 && (
                      <button
                        className="source-chip source-add"
                        onClick={() => fileInput.current?.click()}
                        disabled={loadingImage}
                        aria-label="Зураг нэмэх"
                      >
                        {loadingImage ? (
                          <Loader2 size={18} className="spin" />
                        ) : (
                          <Plus size={18} />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="editor-tools">
                    <button
                      className={active?.cropped ? "active" : ""}
                      onClick={() =>
                        active &&
                        void editSource(active.id, {
                          cropped: !active.cropped,
                        })
                      }
                    >
                      Квадрат тайрах
                    </button>
                    <button
                      onClick={() =>
                        active &&
                        void editSource(active.id, {
                          rotation: (((active.rotation + 90) % 360) as Rotation),
                        })
                      }
                    >
                      Эргүүлэх ({active?.rotation ?? 0}°)
                    </button>
                    <button onClick={() => fileInput.current?.click()}>
                      Зураг нэмэх
                    </button>
                  </div>
                  <p className="editor-hint">
                    Эргүүлэлт, тайралт нь Meshy рүү илгээх өгөгдөлд бодитоор
                    хэрэглэгдэнэ.
                  </p>
                </div>

                <aside className="upload-options">
                  <div className="check-card">
                    <SectionLabel>ЗУРГИЙН ШАЛГАЛТ</SectionLabel>
                    {checks ? (
                      checks.map((check) => (
                        <span key={check.label}>
                          <b>{check.label}</b>
                          {check.level === "warn" ? (
                            <strong>{check.value}</strong>
                          ) : (
                            <em>{check.value}</em>
                          )}
                        </span>
                      ))
                    ) : (
                      <span>
                        <b>Шинжилж байна…</b>
                      </span>
                    )}
                  </div>

                  <div className="advanced-card">
                    <button onClick={() => setAdvanced(!advanced)}>
                      Нэмэлт тохиргоо{" "}
                      <ChevronDown
                        className={advanced ? "rotated" : ""}
                        size={17}
                      />
                    </button>
                    {advanced && (
                      <div className="advanced-body page-enter">
                        <span className="option-title">ЧАНАР</span>
                        <div className="segmented">
                          <button
                            className={quality === "fast" ? "active" : ""}
                            onClick={() => setQuality("fast")}
                          >
                            Хурдан
                          </button>
                          <button
                            className={quality === "high" ? "active" : ""}
                            onClick={() => setQuality("high")}
                          >
                            Өндөр
                          </button>
                        </div>
                        <label className="toggle-row">
                          Зургийг AI-аар сайжруулах
                          <input
                            type="checkbox"
                            checked={imageEnhancement}
                            onChange={(event) =>
                              setImageEnhancement(event.target.checked)
                            }
                          />
                          <i />
                        </label>
                        <p className="option-hint">
                          Идэвхгүй болговол оруулсан зургийн төрхийг яг хэвээр
                          нь хадгална.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Утсан дээр энэ блок доод талд наалдана */}
                  <div className="upload-cta">
                    <Button
                      className="create-model"
                      onClick={() => void startGeneration()}
                      disabled={submitting || sources.length === 0}
                    >
                      <WandSparkles size={17} />
                      {submitting ? "Илгээж байна…" : "3D загвар үүсгэх"}
                    </Button>
                    <span className="generation-note">
                      {sources.length > 1 ? "MULTI-IMAGE" : "IMAGE"} · GLB +
                      USDZ · ≈ 1–3 МИНУТ
                    </span>
                  </div>
                  {genError && <p className="form-error">{genError}</p>}
                </aside>
              </div>
            )}
          </div>
        </main>
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFile}
        />
        <input
          ref={manualModelInput}
          className="sr-only"
          type="file"
          multiple
          accept=".glb,.usdz,model/gltf-binary,model/vnd.usdz+zip"
          onChange={(event) => void handleManualModel(event)}
        />
      </div>
    );
  };

  const renderGenerate = () => {
    const stages = [
      ["Analyzing image", 0, 18],
      ["Removing background", 18, 34],
      ["Building geometry", 34, 62],
      ["Applying texture", 62, 84],
      ["Preparing AR model", 84, 100],
    ] as const;
    return (
      <div className="generation-screen page-enter">
        <header>
          <button className="header-brand" onClick={() => go("landing")}>
            <Brand compact />
          </button>
          <span>AI PROCESS · SNAP ENGINE</span>
        </header>
        <main>
          <div className="generation-preview">
            <CornerFrame />
            <span className="scan-line" />
            {sources[0] ? (
              <motion.div
                layoutId="snapar-subject"
                className="generation-source"
                role="img"
                aria-label="Эх зураг"
                style={{ backgroundImage: `url(${sources[0].preview})` }}
                transition={motionTokens.spring.gentle}
              />
            ) : (
              <VaseScene
                className="vase-canvas"
                progress={Math.min(1, generation / 92)}
                color="#e8e2d6"
              />
            )}
            <span className="generation-percent">
              {Math.round(generation)}
              <small>%</small>
            </span>
          </div>
          <div className="generation-info">
            <SectionLabel>
              {task?.status === "PENDING" ? "IN QUEUE" : "AI GENERATION IN PROGRESS"}
            </SectionLabel>
            <h1>
              Creating your
              <br />
              3D model.
            </h1>
            <p>
              AI is reconstructing shape, material, and depth from your image.
              Generation continues safely if you leave this screen.
            </p>

            {/* Meshy-гээс ирсэн бодит дарааллын байрлал / үлдсэн хугацаа */}
            <div className="generation-meta">
              {task?.queuePosition !== null &&
                task?.queuePosition !== undefined && (
                  <span>
                    <b>ДАРААЛАЛ</b>
                    {task.queuePosition === 0
                      ? "Удахгүй эхэлнэ"
                      : `${task.queuePosition} даалгаврын дараа`}
                  </span>
                )}
              {task?.etaSeconds ? (
                <span>
                  <b>ҮЛДСЭН</b>≈ {formatEta(task.etaSeconds)}
                </span>
              ) : null}
              <span>
                <b>ЭХ ЗУРАГ</b>
                {sources.length || 1} ш
              </span>
            </div>
            <div className="generation-stages">
              {stages.map(([name, from, to], index) => {
                const done = generation >= to;
                const active = generation >= from && generation < to;
                return (
                  <div
                    key={name}
                    className={done ? "done" : active ? "active" : ""}
                  >
                    <span>{done ? <Check size={14} /> : `0${index + 1}`}</span>
                    <b>{name}</b>
                    <em>
                      {done
                        ? "БЭЛЭН"
                        : active
                          ? `${Math.round(((generation - from) / (to - from)) * 100)}%`
                          : "—"}
                    </em>
                  </div>
                );
              })}
            </div>
            {genError && <p className="form-error">{genError}</p>}
            <button className="cancel-generation" onClick={() => go("upload")}>
              Back to upload (generation will continue)
            </button>
          </div>
        </main>
      </div>
    );
  };

  const renderStudio = () => (
    <div className="studio-screen page-enter">
      {/*
        Хажуугийн rail-д өмнө нь Orbit / Move3D / Expand / Grid2X2 гэсэн 4
        товч байсан ч аль нь ч onClick-гүй байсан бөгөөд эхний хоёр нь
        харагдацын доод буланд байдаг viewport-tools-той яг давхардаж байв.
        Одоо rail нь зөвхөн навигацад үйлчилнэ, хэрэгслүүд viewport дээрээ.
      */}
      <aside className="studio-rail">
        <button aria-label="Нүүр" onClick={() => go("landing")}>
          <span className="solo-mark">
            <i />
          </span>
        </button>
        <span />
        <button aria-label="Хэрэглэгч" onClick={() => go("auth")}>
          <i className="avatar" />
        </button>
      </aside>
      <main className="studio-main">
        <header className="studio-header">
          <div>
            <button className="back-mobile" onClick={() => go("upload")}>
              <ArrowLeft size={16} />
            </button>
            <span>
              <b>{currentModel?.name ?? "3D загвар"}</b>
              <small>
                {isManualModel
                  ? "ГАРААР ОРУУЛСАН · AR-Д БЭЛЭН"
                  : currentModel?.sourceCount && currentModel.sourceCount > 1
                  ? `${currentModel.sourceCount} ЗУРАГНААС · MULTI-IMAGE`
                  : "MESHY AI · IMAGE TO 3D"}
              </small>
            </span>
          </div>
          <div>
            <button onClick={() => setModal("share")}>
              <Share2 size={15} /> Хуваалцах
            </button>
            <span className="download-wrap">
              <button
                onClick={() => setDownloadOpen(!downloadOpen)}
                disabled={!modelReady}
              >
                <Download size={15} /> Татах <ChevronDown size={13} />
              </button>
              {downloadOpen && urls && (
                <span className="download-menu page-enter">
                  <a href={urls.glbDownload} onClick={() => setDownloadOpen(false)}>
                    GLB · WEB / ANDROID
                  </a>
                  {(!isManualModel || currentModel?.hasUsdz) && (
                    <a
                      href={urls.usdzDownload}
                      onClick={() => setDownloadOpen(false)}
                    >
                      USDZ · iOS / AR
                    </a>
                  )}
                </span>
              )}
            </span>
            <Button onClick={() => go("ar")} disabled={!modelReady}>
              <Smartphone size={15} /> AR-аар харах
            </Button>
          </div>
        </header>
        <div className="studio-workspace">
          <div className={`studio-viewport ${grid ? "with-grid" : ""}`}>
            <CornerFrame />
            {modelReady && urls ? (
              <ModelViewer
                ref={viewerRef}
                src={urls.glb}
                iosSrc={!isManualModel || currentModel?.hasUsdz ? urls.usdz : undefined}
                poster={isManualModel ? undefined : urls.poster}
                alt="Үүсгэсэн 3D загвар"
                ar
                autoRotate={autoRotate}
                exposure={0.4 + (light / 100) * 1.4}
                shadowIntensity={0.3 + (roughness / 100) * 0.7}
                className="vase-canvas"
              />
            ) : (
              <VaseScene
                className="vase-canvas"
                color={vaseColor}
                material={material}
                roughness={roughness}
                autoRotate={autoRotate}
                showGrid={grid}
              />
            )}
            <span className="viewport-label">
              {modelReady
                ? isManualModel
                  ? "ГАРААР ОРУУЛСАН · GLB"
                  : "MESHY AI · GLB"
                : "ЖИШЭЭ ЗАГВАР"}
            </span>
            <span className="viewport-dimensions">
              {modelReady
                ? isManualModel
                  ? "ШУУД UPLOAD"
                  : `${(task?.creditsUsed ?? 0).toLocaleString()} CREDIT`
                : "ЗАГВАР СОНГООГҮЙ"}
              <br />
              GLB{!isManualModel || currentModel?.hasUsdz ? " · USDZ" : ""}
            </span>
            <div className="viewport-tools">
              <button className="active" aria-label="Эргүүлэх">
                <Orbit size={17} />
              </button>
              <button aria-label="Шилжүүлэх">
                <Move3D size={17} />
              </button>
              <button
                aria-label="Харагдацыг сэргээх"
                onClick={() => {
                  const element = viewerRef.current?.element();
                  if (element) element.cameraOrbit = "0deg 75deg 105%";
                  addToast("Харагдацыг сэргээлээ");
                }}
              >
                <RotateCcw size={17} />
              </button>
              <button
                className={autoRotate ? "active" : ""}
                aria-label="Автоматаар эргүүлэх"
                onClick={() => setAutoRotate(!autoRotate)}
              >
                <ScanLine size={17} />
              </button>
            </div>
          </div>
          <aside className={`studio-panel ${sheetOpen ? "sheet-open" : ""}`}>
            {/* Зөвхөн утсан дээр харагдана — панелийг дээш татаж нээнэ */}
            <button
              className="sheet-handle"
              aria-expanded={sheetOpen}
              aria-label={sheetOpen ? "Тохиргоог хаах" : "Тохиргоог нээх"}
              onClick={() => setSheetOpen((open) => !open)}
            >
              <i />
              <span>{sheetOpen ? "Хаах" : "Тохиргоо"}</span>
              <ChevronDown size={15} className={sheetOpen ? "" : "rotated"} />
            </button>
            <div className="studio-tabs">
              <button
                className={studioTab === "look" ? "active" : ""}
                onClick={() => setStudioTab("look")}
              >
                Харагдац
              </button>
              <button
                className={studioTab === "form" ? "active" : ""}
                onClick={() => setStudioTab("form")}
              >
                Хэлбэр
              </button>
              <button
                className={studioTab === "environment" ? "active" : ""}
                onClick={() => setStudioTab("environment")}
              >
                Орчин
              </button>
            </div>
            <div className="panel-body">
              {studioTab === "look" && (
                <>
                  {modelReady && (
                    <p className="panel-note">
                      Гэрэлтүүлэг, сүүдэр нь загварт шууд нөлөөлнө. Материал,
                      өнгө нь зөвхөн жишээ дүрслэлд хамаарна — Meshy-ийн
                      текстур хэвээр үлдэнэ.
                    </p>
                  )}
                  <SectionLabel>МАТЕРИАЛ</SectionLabel>
                  <div className="material-grid">
                    {(
                      [
                        ["ceramic", "Шаазан", "#eee7dc"],
                        ["metal", "Метал", "#a9adb5"],
                        ["wood", "Мод", "#a5754f"],
                        ["plastic", "Хуванцар", "#8068ff"],
                      ] as const
                    ).map(([id, name, dot]) => (
                      <button
                        key={id}
                        className={material === id ? "active" : ""}
                        onClick={() => setMaterial(id)}
                      >
                        <i style={{ background: dot }} />
                        {name}
                      </button>
                    ))}
                  </div>
                  <SectionLabel>ӨНГӨ</SectionLabel>
                  <div className="color-list">
                    {[
                      "#e8e2d6",
                      "#d9714f",
                      "#8068ff",
                      "#c9ff63",
                      "#17181e",
                    ].map((color) => (
                      <button
                        key={color}
                        aria-label={`Өнгө ${color}`}
                        className={vaseColor === color ? "active" : ""}
                        style={{ background: color }}
                        onClick={() => setVaseColor(color)}
                      />
                    ))}
                  </div>
                  <RangeControl
                    label="Барзгар байдал"
                    value={roughness}
                    onChange={setRoughness}
                  />
                  <RangeControl
                    label="Гэрэлтүүлэг"
                    value={light}
                    onChange={setLight}
                  />
                </>
              )}
              {studioTab === "form" && (
                <>
                  <RangeControl
                    label="Хэмжээ"
                    value={size}
                    onChange={setSize}
                  />
                  <RangeControl
                    label="Гөлгөр байдал"
                    value={smoothness}
                    onChange={setSmoothness}
                  />
                  <RangeControl
                    label="Нарийвчлал"
                    value={detail}
                    onChange={setDetail}
                  />
                  <div className="dimension-card">
                    <span>
                      ФОРМАТ <b>GLB · USDZ</b>
                    </span>
                    <span>
                      ПОЛИГОН <b>{quality === "fast" ? "~20,000" : "~50,000"}</b>
                    </span>
                    <span>
                      ХЭМЖЭЭ <b>AUTO (AI)</b>
                    </span>
                  </div>
                </>
              )}
              {studioTab === "environment" && (
                <>
                  <SectionLabel>ДЭВСГЭР</SectionLabel>
                  <div className="environment-list">
                    <button
                      className={!grid ? "active" : ""}
                      onClick={() => setGrid(false)}
                    >
                      <i className="env-studio" />
                      Студи
                    </button>
                    <button
                      className={grid ? "active" : ""}
                      onClick={() => setGrid(true)}
                    >
                      <i className="env-grid" />
                      Торон шугам
                    </button>
                    <button
                      onClick={() => {
                        setGrid(false);
                        addToast("Тунгалаг дэвсгэр сонголоо");
                      }}
                    >
                      <i className="env-clear" />
                      Тунгалаг
                    </button>
                  </div>
                  <RangeControl
                    label="Гэрлийн байрлал"
                    value={light}
                    onChange={setLight}
                    suffix="°"
                  />
                  <label className="toggle-row">
                    Шалны сүүдэр <input type="checkbox" defaultChecked />
                    <i />
                  </label>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );

  const renderAr = () => (
      <div className="ar-screen page-enter">
        <header>
          <button onClick={() => go("studio")}>
            <ArrowLeft size={16} /> Студи руу буцах
          </button>
          <span>AR · USDZ / GLB</span>
        </header>
        <main>
          <div className="ar-preview">
            <CornerFrame />
            {modelReady && urls ? (
              <ModelViewer
                ref={viewerRef}
                src={urls.glb}
                iosSrc={!isManualModel || currentModel?.hasUsdz ? urls.usdz : undefined}
                poster={isManualModel ? undefined : urls.poster}
                alt="AR-д бэлэн 3D загвар"
                ar
                arScale="auto"
                autoRotate
                className="vase-canvas"
              />
            ) : (
              <VaseScene
                className="vase-canvas ar-table-vase"
                color={vaseColor}
                material={material}
                autoRotate={false}
                presentation="ar"
                scale={0.28}
                distance={4.4}
                cameraY={0.72}
              />
            )}
            {!modelReady && (
              <div className="ar-scale-compare" aria-label="Өрөөний тавилгатай харьцуулсан хэмжээ">
                <span>CENTERED ON COFFEE TABLE</span>
                <b>VASE · 42 CM</b>
              </div>
            )}
            <span>
              {modelReady
                ? "1 : 1 · БОДИТ ХЭМЖЭЭ (AUTO-SIZE)"
                : "ЖИШЭЭ ВААР · 42 CM · ШИРЭЭН ДЭЭР БАЙРЛУУЛСАН"}
            </span>
          </div>
          <div className="ar-content">
            <div>
              <h1>Загвараа бодит орчинд байрлуулаарай.</h1>
              <p>
                {platform === "desktop"
                  ? "QR кодыг утсаараа уншуулж, 3D загвараа өөрийн орчинд AR-аар хараарай."
                  : "Доорх товчийг дарж камераа нээгээд загвараа шалан дээр байрлуулаарай."}
              </p>
            </div>

            {platform !== "desktop" && (
              <Button className="ar-launch" onClick={openAr} disabled={!modelReady}>
                <Smartphone size={16} /> Бодит орчинд байрлуулах
              </Button>
            )}

            {platform === "desktop" && (
              <div className="qr-row">
                {arLink ? (
                  <QrCode value={arLink} size={228} />
                ) : (
                  <div className="qr-empty">Эхлээд загвар үүсгэнэ үү</div>
                )}
                <div className="qr-steps">
                  <span>
                    <b>01</b>QR кодыг уншуулна
                  </span>
                  <span>
                    <b>02</b>Камер ашиглах зөвшөөрөл өгнө
                  </span>
                  <span>
                    <b>03</b>Загвар байрлуулах гадаргуугаа сонгоно
                  </span>
                </div>
              </div>
            )}
            {/* shareLink нь дэмждэггүй хөтөч дээр автоматаар copyLink рүү
                шилждэг тул тусад нь "хуулах" товч шаардлагагүй. */}
            <div className="ar-actions">
              <Button variant="secondary" onClick={() => void shareLink()}>
                <Share2 size={15} /> Холбоос хуваалцах
              </Button>
            </div>
            {arLink && (
              <a className="mobile-mode-link" href={arLink}>
                → AR ХУУДСЫГ ШУУД НЭЭХ
              </a>
            )}
          </div>
        </main>
      </div>
    );

  const renderModels = () => {
    const visible = models.filter((model) => {
      if (galleryFilter === "Бүгд") return true;
      if (galleryFilter === "Бэлэн") return model.status === "SUCCEEDED";
      if (galleryFilter === "Боловсруулж буй")
        return model.status === "PENDING" || model.status === "IN_PROGRESS";
      return model.status === "FAILED" || model.status === "CANCELED";
    });

    return (
      <div className="dashboard-layout page-enter">
        <SiteHeader
          screen={screen}
          go={go}
          balance={balance}
          onOpenMenu={() => setNavOpen(true)}
          hasTabs
        />
        <main className="models-main">
          <header>
            <div>
              <SectionLabel>ТАНЫ САН</SectionLabel>
              <h1>Миний загварууд</h1>
              <small>
                {models.length} ЗАГВАР ·{" "}
                {models.filter((m) => m.status === "SUCCEEDED").length} БЭЛЭН
              </small>
            </div>
            {/* Сан хоосон үед доорх хоосон төлөвт өөрийн CTA байгаа тул
                энд давхардуулж харуулахгүй. */}
            {models.length > 0 && (
              <Button onClick={() => go("upload")}>
                <Plus size={16} /> Шинэ загвар үүсгэх
              </Button>
            )}
          </header>
          {models.length > 0 && (
            <div className="filter-row">
              {["Бүгд", "Бэлэн", "Боловсруулж буй", "Амжилтгүй"].map(
                (filter) => (
                  <button
                    key={filter}
                    className={galleryFilter === filter ? "active" : ""}
                    onClick={() => setGalleryFilter(filter)}
                  >
                    {filter}
                  </button>
                ),
              )}
            </div>
          )}
          {visible.length === 0 ? (
            <div className="models-empty">
              <Box size={26} />
              {models.length === 0 ? (
                <>
                  <b>Одоохондоо загвар алга</b>
                  <p>
                    Зураг оруулаад эхний 3D загвараа үүсгээрэй. Загварууд энэ
                    хөтөч дээр хадгалагдана.
                  </p>
                  <Button onClick={() => go("upload")}>
                    <Plus size={16} /> Загвар үүсгэх
                  </Button>
                </>
              ) : (
                /* Шүүлтүүрт тохирох загвар олдсонгүй — энд "үүсгэх" товч
                   хэрэггүй, дээд талын толгойд аль хэдийн байгаа. */
                <>
                  <b>«{galleryFilter}» төлөвт загвар алга</b>
                  <p>Өөр шүүлтүүр сонгоод үзнэ үү.</p>
                </>
              )}
            </div>
          ) : (
            <div className="model-grid">
              {visible.map((model) => (
                <article key={model.id}>
                  <button
                    className="model-thumb"
                    onClick={() => openModel(model)}
                  >
                    <span className="model-grid-bg" />
                    {/* next/image ашиглахгүй: эх сурвалж нь Meshy proxy эсвэл
                        data: URI тул Worker-ийн зураг оновчлол хэрэггүй. */}
                    {model.status === "SUCCEEDED" && model.kind !== "manual" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={modelUrls(model.id).poster}
                        alt=""
                        className="model-poster"
                        loading="lazy"
                      />
                    ) : model.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={model.thumbnail}
                        alt=""
                        className="model-poster is-source"
                        loading="lazy"
                      />
                    ) : (
                      <MiniVase />
                    )}
                    <em className={model.status === "SUCCEEDED" ? "ready" : ""}>
                      {STATUS_LABEL[model.status]}
                    </em>
                    <small>
                      GLB{model.kind !== "manual" || model.hasUsdz ? " · USDZ" : ""}
                    </small>
                  </button>
                  <div className="model-card-copy">
                    <span>
                      <b>{model.name}</b>
                      <small>
                        {relativeDate(model.createdAt)} ·{" "}
                        {model.quality === "fast" ? "ХУРДАН" : "ӨНДӨР"}
                      </small>
                    </span>
                    <button
                      aria-label="Устгах"
                      onClick={() => {
                        removeModel(model.id);
                        addToast("Жагсаалтаас хаслаа");
                      }}
                    >
                      <MoreHorizontal />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  };

  const renderDetail = () => {
    const current = models.find((model) => model.id === taskId);

    return (
      <div className="detail-screen page-enter">
        <header>
          <button onClick={() => go("models")}>
            <ArrowLeft size={16} /> Миний загварууд
          </button>
          <span>{taskId ? `ID ${taskId.slice(0, 8)}` : "ЗАГВАР СОНГООГҮЙ"}</span>
        </header>
        <main>
          <div className="detail-visual">
            <CornerFrame />
            {modelReady && urls ? (
              <ModelViewer
                ref={viewerRef}
                src={urls.glb}
                iosSrc={!isManualModel || current?.hasUsdz ? urls.usdz : undefined}
                poster={isManualModel ? undefined : urls.poster}
                alt="3D загвар"
                ar
                autoRotate
                className="vase-canvas"
              />
            ) : (
              <VaseScene className="vase-canvas" color="#e8e2d6" />
            )}
            <span>
              {modelReady
                ? "INTERACTIVE 3D · DRAG TO ROTATE"
                : task
                  ? `${Math.round(task.progress)}% · БЭЛТГЭГДЭЖ БАЙНА`
                  : "ЗАГВАР АЧААЛЖ БАЙНА"}
            </span>
          </div>
          <div className="detail-copy">
            <SectionLabel>
              {modelReady ? "БЭЛЭН · 3D ЗАГВАР" : "БОЛОВСРУУЛЖ БАЙНА"}
            </SectionLabel>
            <h1>{current?.name ?? "3D загвар"}</h1>
            <p>
              {isManualModel
                ? "Гараар оруулсан, web болон утасны AR-д бэлэн 3D загвар."
                : "Нэг зургаас Meshy AI-аар үүсгэсэн, AR-д бэлэн 3D загвар."}
            </p>
            <div className="detail-actions">
              <Button onClick={() => go("studio")} disabled={!modelReady}>
                <WandSparkles size={16} /> Студид нээх
              </Button>
              <Button
                variant="secondary"
                onClick={() => go("ar")}
                disabled={!modelReady}
              >
                <Smartphone size={16} /> AR-аар харах
              </Button>
            </div>
            <div className="detail-specs">
              <span>
                <b>ФОРМАТ</b>
                GLB{!isManualModel || current?.hasUsdz ? " · USDZ" : ""}
              </span>
              <span>
                <b>ЧАНАР</b>
                {current?.quality === "fast" ? "Хурдан" : "Өндөр"}
              </span>
              <span>
                <b>КРЕДИТ</b>
                {isManualModel ? "0" : (task?.creditsUsed ?? "—")}
              </span>
              <span>
                <b>ҮҮССЭН</b>
                {current
                  ? new Date(current.createdAt).toLocaleDateString("mn-MN")
                  : "—"}
              </span>
            </div>
            {/* "Холбоос хуулах" нь Хуваалцах цонхны дотор аль хэдийн байгаа
                тул энд давхардуулахгүй. */}
            <div className="detail-links">
              <button onClick={() => setModal("share")}>
                <Share2 size={15} /> Хуваалцах
              </button>
              {urls && modelReady ? (
                <a href={urls.glbDownload}>
                  <Download size={15} /> GLB татах
                </a>
              ) : (
                <button disabled>
                  <Download size={15} /> Татах
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

  const renderPricing = () => (
    <div className="pricing-screen page-enter">
      <SiteHeader
        screen={screen}
        go={go}
        balance={balance}
        onOpenMenu={() => setNavOpen(true)}
      />
      <main>
        <SectionLabel>ЭНГИЙН · ИЛ ТОД</SectionLabel>
        <h1>
          Өөрт тохирох
          <br />
          багцаа сонго.
        </h1>
        <p>Хэзээ ч цуцалж болно. Нууц төлбөр байхгүй.</p>
        <div className="billing-toggle">
          <button
            className={!yearly ? "active" : ""}
            onClick={() => setYearly(false)}
          >
            Сараар
          </button>
          <button
            className={yearly ? "active" : ""}
            onClick={() => setYearly(true)}
          >
            Жилээр <span>−20%</span>
          </button>
        </div>
        <div className="pricing-grid">
          {planData.map((plan) => (
            <article
              key={plan.name}
              className={plan.recommended ? "recommended" : ""}
            >
              {plan.recommended && <em>ХАМГИЙН ИХ СОНГОДОГ</em>}
              <SectionLabel>{plan.name.toUpperCase()}</SectionLabel>
              <div className="plan-price">
                {yearly ? plan.yearly : plan.monthly}
                <small>/ САР{yearly ? " · ЖИЛЭЭР" : ""}</small>
              </div>
              <p>{plan.description}</p>
              <Button
                variant={plan.recommended ? "primary" : "secondary"}
                onClick={() =>
                  plan.name === "Баг" ? setModal("send") : go("upload")
                }
              >
                {plan.cta}
              </Button>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={14} />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  );

  const renderAuth = () => (
    <div className="auth-screen page-enter">
      <div className="auth-art">
        <button onClick={() => go("landing")}>
          <Brand />
        </button>
        <div className="auth-object">
          <VaseScene className="vase-canvas" color="#8068ff" />
        </div>
        <div>
          <SectionLabel>2D → 3D → AR</SectionLabel>
          <h2>
            Санаагаа шинэ
            <br />
            хэмжээст оруул.
          </h2>
        </div>
      </div>
      <main className="auth-panel">
        <button className="auth-back" onClick={() => go("landing")}>
          <ArrowLeft size={16} /> Нүүр рүү буцах
        </button>
        <div className="auth-form">
          <SectionLabel>
            {authMode === "login" ? "ТАВТАЙ МОРИЛ" : "ШИНЭ БҮРТГЭЛ"}
          </SectionLabel>
          <h1>{authMode === "login" ? "Нэвтрэх" : "Бүртгэл үүсгэх"}</h1>
          <p>
            {authMode === "login"
              ? "Үргэлжлүүлэн загваруудаа бүтээхийн тулд нэвтэрнэ үү."
              : "Нэг минутын дотор MORPH AR-аа ашиглаж эхлээрэй."}
          </p>
          <button
            className="google-button"
            onClick={() => addToast("Google нэвтрэлтийн демо")}
          >
            <span>G</span> Google-ээр үргэлжлүүлэх
          </button>
          <div className="auth-or">
            <i />
            ЭСВЭЛ
            <i />
          </div>
          {authMode === "signup" && (
            <label>
              НЭР
              <input type="text" placeholder="Таны нэр" />
            </label>
          )}
          <label>
            И-МЭЙЛ
            <input type="email" placeholder="name@example.com" />
          </label>
          <label>
            НУУЦ ҮГ
            <input type="password" placeholder="••••••••" />
          </label>
          <Button
            onClick={() => {
              addToast(
                authMode === "login" ? "Амжилттай нэвтэрлээ" : "Бүртгэл үүслээ",
              );
              go("models");
            }}
          >
            {authMode === "login" ? "Нэвтрэх" : "Бүртгэл үүсгэх"}
            <ArrowRight size={16} />
          </Button>
          <span className="auth-switch">
            {authMode === "login" ? "Бүртгэлгүй юу?" : "Бүртгэлтэй юу?"}
            <button
              onClick={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
              }
            >
              {authMode === "login" ? "Бүртгүүлэх" : "Нэвтрэх"}
            </button>
          </span>
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

  // Доод таб зөвхөн апп доторх дэлгэцүүд дээр (landing/pricing/auth дээр биш)
  const showTabs = [
    "upload",
    "generate",
    "models",
    "studio",
    "detail",
    "ar",
  ].includes(screen);

  return (
    <div className={`morph-app ${showTabs ? "with-tabs" : ""}`}>
      <LayoutGroup id="snapar-flow">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={screen}
            className="screen-motion-shell"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: motionTokens.duration.base,
              ease: motionTokens.ease.standard,
            }}
          >
            {screenContent[screen]()}
          </motion.div>
        </AnimatePresence>
      </LayoutGroup>
      {showTabs && (
        <MobileTabs
          screen={screen}
          go={go}
          hasModel={Boolean(modelReady)}
          onOpenMenu={() => setNavOpen(true)}
        />
      )}

      {/*
        Цэс нь БҮХ дэлгэц дээр ажиллана. Өмнө нь зөвхөн нүүр хуудсан дотор
        байсан тул утсаар аппын дэлгэц рүү ороод нүүр, үнийн багц, нэвтрэх
        рүү буцах арга байхгүй болдог байсан.
      */}
      {navOpen && (
        <div className="mobile-menu page-enter">
          <button
            className="mobile-close"
            aria-label="Цэс хаах"
            onClick={() => setNavOpen(false)}
          >
            <X />
          </button>
          {[
            { key: "landing", label: "Нүүр" },
            ...NAV_ITEMS.map(({ key, label }) => ({ key, label })),
            { key: "auth", label: "Нэвтрэх" },
          ].map((item) => (
            <button key={item.key} onClick={() => go(item.key as Screen)}>
              {item.label}
              <ArrowRight />
            </button>
          ))}
        </div>
      )}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id}>
            <Check size={14} />
            {toast.text}
          </div>
        ))}
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={modal === "share" ? "Хуваалцах" : "Бидэнтэй холбогдох"}
        >
          <div className="modal-card page-enter">
            <button
              className="modal-close"
              aria-label="Хаах"
              onClick={() => setModal(null)}
            >
              <X size={18} />
            </button>
            {modal === "share" ? (
              <>
                <span className="modal-icon">
                  <Share2 />
                </span>
                <h2>Загвар хуваалцах</h2>
                <p>
                  Энэ холбоосыг нээсэн хүн загварыг 3D болон AR-аар харах
                  боломжтой.
                </p>
                <div className="share-link">
                  <span>{arLink || "Загвар үүсгэсний дараа холбоос гарна"}</span>
                  <button onClick={copyLink} aria-label="Холбоос хуулах">
                    <Copy size={15} />
                  </button>
                </div>
                <div className="modal-actions">
                  <Button
                    onClick={() => {
                      setModal(null);
                      void shareLink();
                    }}
                    disabled={!arLink}
                  >
                    <Share2 size={16} /> Хуваалцах
                  </Button>
                  {arLink && (
                    <a
                      className="button button-secondary"
                      href={arLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setModal(null)}
                    >
                      Нээж үзэх <ArrowRight size={15} />
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="modal-icon">
                  <Smartphone />
                </span>
                <h2>Бидэнтэй холбогдох</h2>
                <p>
                  Багийн багц, API хандалт, тусгай шийдлийн талаар ярилцах уу?
                </p>
                <div className="modal-actions">
                  <a
                    className="button button-primary"
                    href="mailto:hello@morph.ar?subject=MORPH%20AR%20-%20Багийн%20багц"
                    onClick={() => setModal(null)}
                  >
                    И-мэйл бичих <ArrowRight size={16} />
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
