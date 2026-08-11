"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FC,
} from "react";
import { loadModelViewer } from "@/lib/cdn";

/**
 * `<model-viewer>`-ийн React боодол.
 *
 * AR-ийн гурван горимыг нэг дор өгнө:
 *  - `webxr`        → Android Chrome (WebXR-тэй төхөөрөмж)
 *  - `scene-viewer` → Android, GLB файлаар (Google Play Services for AR)
 *  - `quick-look`   → iOS Safari, USDZ файлаар
 */

type ModelViewerElement = HTMLElement & {
  activateAR: () => void;
  canActivateAR: boolean;
  cameraOrbit: string;
  resetTurntableRotation: (radians?: number) => void;
  toDataURL: (type?: string) => string;
};

// React 19-д custom element-ийг JSX-д ашиглах хамгийн найдвартай арга.
const MV = "model-viewer" as unknown as FC<Record<string, unknown>>;

export type ModelViewerHandle = {
  activateAR: () => void;
  canActivateAR: () => boolean;
  element: () => ModelViewerElement | null;
  screenshot: () => string | null;
};

export type ModelViewerProps = {
  /** GLB файлын хаяг (Android / вэб) */
  src: string;
  /** USDZ файлын хаяг (iOS Quick Look) */
  iosSrc?: string;
  poster?: string;
  alt?: string;
  className?: string;
  /** AR товч, AR горимыг идэвхжүүлэх эсэх */
  ar?: boolean;
  /** model-viewer-ийн өөрийн AR товчийг харуулах эсэх */
  showArButton?: boolean;
  arButtonLabel?: string;
  autoRotate?: boolean;
  cameraControls?: boolean;
  /** 0–2, гэрлийн эрчим */
  exposure?: number;
  /** 0–1, шалны сүүдэр */
  shadowIntensity?: number;
  environmentImage?: string;
  /** "auto" = бодит хэмжээ, "fixed" = тогтмол хэмжээ */
  arScale?: "auto" | "fixed";
  /** Тухайн харагдацад зөвшөөрөх AR backend-үүд */
  arModes?: string;
  /** WebXR-ийн бодит орчны гэрлийн үнэлгээг ашиглах эсэх */
  xrEnvironment?: boolean;
  onArStatus?: (status: string) => void;
  onLoad?: () => void;
  onError?: (message: string) => void;
};

const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(
  function ModelViewer(
    {
      src,
      iosSrc,
      poster,
      alt = "3D загвар",
      className = "",
      ar = false,
      showArButton = false,
      arButtonLabel = "AR-аар харах",
      autoRotate = false,
      cameraControls = true,
      exposure = 1,
      shadowIntensity = 0.85,
      environmentImage = "neutral",
      arScale = "auto",
      arModes = "webxr scene-viewer quick-look",
      xrEnvironment = false,
      onArStatus,
      onLoad,
      onError,
    },
    ref,
  ) {
    const hostRef = useRef<ModelViewerElement | null>(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      let cancelled = false;
      loadModelViewer()
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch((error: Error) => {
          if (cancelled) return;
          setFailed(error.message);
          onError?.(error.message);
        });
      return () => {
        cancelled = true;
      };
      // onError-ийг зориудаар хамааралд оруулаагүй — дахин ачаалахаас сэргийлнэ.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const attach = useCallback(
      (node: HTMLElement | null) => {
        hostRef.current = node as ModelViewerElement | null;
      },
      [],
    );

    useEffect(() => {
      const node = hostRef.current;
      if (!node || !ready) return;

      const handleLoad = () => {
        setLoaded(true);
        onLoad?.();
      };
      const handleError = () => {
        const message = "3D загвар ачаалагдсангүй.";
        setFailed(message);
        onError?.(message);
      };
      const handleArStatus = (event: Event) => {
        const detail = (event as CustomEvent<{ status: string }>).detail;
        if (detail?.status) onArStatus?.(detail.status);
      };

      node.addEventListener("load", handleLoad);
      node.addEventListener("error", handleError);
      node.addEventListener("ar-status", handleArStatus);
      return () => {
        node.removeEventListener("load", handleLoad);
        node.removeEventListener("error", handleError);
        node.removeEventListener("ar-status", handleArStatus);
      };
    }, [ready, src, onLoad, onError, onArStatus]);

    useImperativeHandle(
      ref,
      () => ({
        activateAR: () => hostRef.current?.activateAR(),
        canActivateAR: () => Boolean(hostRef.current?.canActivateAR),
        element: () => hostRef.current,
        screenshot: () => hostRef.current?.toDataURL("image/png") ?? null,
      }),
      [],
    );

    if (failed) {
      return (
        <div className={`model-viewer-fallback ${className}`}>
          <span>{failed}</span>
        </div>
      );
    }

    // Boolean атрибутууд байгаа эсэхээр нь ажилладаг тул `false` үед
    // тухайн түлхүүрийг ерөөсөө оруулахгүй.
    const attributes: Record<string, unknown> = {
      ref: attach,
      src,
      alt,
      className: `morph-model-viewer ${className}`,
      "shadow-intensity": String(shadowIntensity),
      exposure: String(exposure),
      "environment-image": environmentImage,
      "touch-action": "pan-y",
      "interaction-prompt": "none",
      loading: "eager",
    };

    if (poster) attributes.poster = poster;
    if (iosSrc) attributes["ios-src"] = iosSrc;
    if (cameraControls) attributes["camera-controls"] = "";
    if (autoRotate) {
      attributes["auto-rotate"] = "";
      attributes["rotation-per-second"] = "22deg";
    }
    if (ar) {
      attributes.ar = "";
      attributes["ar-modes"] = arModes;
      attributes["ar-scale"] = arScale;
      attributes["ar-placement"] = "floor";
      if (xrEnvironment) attributes["xr-environment"] = "";
    }
    if (ar && !showArButton) {
      // Өөрийн товчоо ашиглах үед model-viewer-ийн товчийг нуухдаа
      // slot-ыг хоосон элементээр дарна.
      attributes.children = (
        <button slot="ar-button" className="mv-ar-button-hidden" type="button" />
      );
    } else if (ar && showArButton) {
      attributes.children = (
        <button slot="ar-button" className="mv-ar-button" type="button">
          {arButtonLabel}
        </button>
      );
    }

    return (
      <div className={`model-viewer-wrap ${loaded ? "is-loaded" : ""}`}>
        {ready ? <MV {...attributes} /> : null}
        {!loaded && (
          <span className="model-viewer-loading">
            <i />
            {ready ? "ЗАГВАР АЧААЛЖ БАЙНА" : "ҮЗЭГЧ БЭЛТГЭЖ БАЙНА"}
          </span>
        )}
      </div>
    );
  },
);

export default ModelViewer;
