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
          // iPhone Camera нь Android-аас quiet zone багатай QR-д мэдрэмтгий.
          // ISO/IEC 18004-ийн зөвлөмжийн дагуу дөрвөн модуль зай үлдээнэ.
          margin: 4,
          errorCorrectionLevel: "M",
          // Хамгийн өндөр контраст нь дэлгэцийн гэрэл болон өнгөний профайлаас
          // үл хамааран iOS Camera-д найдвартай танигдана.
          color: { dark: "#000000", light: "#ffffff" },
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
        style={{ width: size, maxWidth: "100%", height: "auto" }}
        aria-label="AR холбоосын QR код"
      />
      {error && <span className="qr-error">{error}</span>}
    </div>
  );
}
