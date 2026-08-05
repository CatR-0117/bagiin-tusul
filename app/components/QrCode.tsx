"use client";

import { useEffect, useRef, useState } from "react";
import { loadQrCode } from "@/lib/cdn";

/**
 * Бодит QR код. AR холбоос руу заана — хэрэглэгч утсаараа уншуулаад
 * шууд /ar/<id> хуудсанд ороход iOS Quick Look / Android Scene Viewer нээгдэнэ.
 */
export default function QrCode({
  value,
  size = 240,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!value) return;

    loadQrCode()
      .then((QRCode) => {
        if (cancelled || !canvasRef.current) return;
        return QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#0b0c10", light: "#f4f1ea" },
        });
      })
      .catch(() => {
        if (!cancelled) setError("QR код үүсгэж чадсангүй");
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div className={`qr-canvas-wrap ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        aria-label="AR холбоосын QR код"
      />
      {error && <span className="qr-error">{error}</span>}
    </div>
  );
}
