"use client";

import { FileImage, ImagePlus, Loader2, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { UploadProgress } from "@/components/upload/upload-progress";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

type UploadUrlResponse = { uploadUrl: string; key: string; contentType: string };

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & Partial<T>;
  if (!response.ok) throw new Error(payload.error ?? "Алдаа гарлаа. Дахин оролдоно уу.");
  return payload as T;
}

function putWithProgress(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.withCredentials = uploadUrl.startsWith("/");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error("Зураг оруулахад алдаа гарлаа."));
    xhr.onerror = () => reject(new Error("Зураг оруулах явц тасалдлаа."));
    xhr.send(file);
  });
}

export function ImageUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [percent, setPercent] = useState(5);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next: File | undefined) {
    setError(null);
    if (!next) return;
    const extension = next.name.split(".").pop()?.toLowerCase();
    const validExtension = ["jpg", "jpeg", "png", "webp"].includes(extension ?? "");
    if (!ALLOWED_TYPES.has(next.type) || !validExtension) {
      setError("JPG, PNG эсвэл WebP зураг сонгоно уу.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("Зураг 10 MB буюу түүнээс бага байна.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 100));
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  }

  async function generate() {
    if (!file || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setStep(0); setPercent(8);
      const created = await jsonRequest<{ project: { id: string } }>("/api/projects", {
        method: "POST", body: JSON.stringify({ title: title.trim() }),
      });
      const projectId = created.project.id;
      setStep(1); setPercent(18);
      const signed = await jsonRequest<UploadUrlResponse>("/api/upload-url", {
        method: "POST",
        body: JSON.stringify({ projectId, fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      await putWithProgress(signed.uploadUrl, file, signed.contentType, (value) => setPercent(18 + Math.round(value * 0.62)));
      await jsonRequest(`/api/projects/${projectId}/upload-complete`, {
        method: "POST", body: JSON.stringify({ key: signed.key }),
      });
      setStep(2); setPercent(88);
      await jsonRequest("/api/generate", {
        method: "POST", body: JSON.stringify({ projectId }),
      });
      setPercent(100);
      router.push(`/models/${projectId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Загвар үүсгэлтийг эхлүүлж чадсангүй.");
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="upload-workspace upload-busy">
        <div className="busy-visual"><Loader2 className="spin" size={30} /><span>АЮУЛГҮЙ ДАМЖУУЛАЛТ</span></div>
        <h2>Загварыг бэлтгэж байна</h2>
        <p>Эх зургийг аюулгүй дамжуулж дуустал энэ цонхыг нээлттэй үлдээнэ үү.</p>
        <UploadProgress step={step} percent={percent} />
      </div>
    );
  }

  return (
    <div className="upload-workspace">
      {!file ? (
        <div
          className={`dropzone ${dragging ? "is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          <div className="dropzone-icon"><ImagePlus size={27} /></div>
          <h2>Бүтээгдэхүүний зургаа энд оруулна уу</h2>
          <p>Нэг объект тод харагдсан, гэрэл сайтай зураг хамгийн сайн үр дүнтэй.</p>
          <button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()}><Upload size={17} /> Зураг сонгох</button>
          <span>JPG, PNG ЭСВЭЛ WEBP · ДЭЭД ХЭМЖЭЭ 10 MB</span>
          <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0])} />
        </div>
      ) : (
        <div className="upload-preview-layout">
          <div className="source-preview">
            {/* Local blob previews cannot use the optimized image pipeline. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview ?? ""} alt="Сонгосон эх зураг" />
            <span className="source-chip"><FileImage size={14} /> ЭХ ЗУРАГ</span>
            <button type="button" aria-label="Зураг хасах" onClick={() => { setFile(null); setPreview(null); }}><X size={18} /></button>
          </div>
          <div className="source-settings">
            <span className="eyebrow">Эх зураг бэлэн</span>
            <h2>Загвартаа нэр өгнө үү</h2>
            <p>Энэ нэр орон зайн санд харагдана.</p>
            <label htmlFor="project-title">Төслийн нэр</label>
            <input id="project-title" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} />
            <dl><div><dt>Файл</dt><dd>{file.name}</dd></div><div><dt>Хэмжээ</dt><dd>{(file.size / 1024 / 1024).toFixed(1)} MB</dd></div><div><dt>Гаралт</dt><dd>GLB + AR холбоос</dd></div></dl>
            <button className="button button-primary button-wide" type="button" onClick={generate} disabled={!title.trim()}><Sparkles size={17} /> 3D загвар үүсгэх</button>
            <button className="replace-file" type="button" onClick={() => inputRef.current?.click()}><RotateCcw size={15} /> Өөр зураг сонгох</button>
            <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0])} />
          </div>
        </div>
      )}
      {error && <p className="upload-error" role="alert">{error}</p>}
      {!file && <div className="upload-tips"><strong>Сайн үр дүнд</strong><span>Нэг объект ашиглах</span><span>Бүтэн хэлбэрийг харагдуулах</span><span>Жигд дэвсгэр сонгох</span></div>}
    </div>
  );
}
