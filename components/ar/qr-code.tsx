"use client";

import { QRCodeSVG } from "qrcode.react";

export function ArQrCode({ value }: { value: string }) {
  return (
    <div className="qr-code-shell">
      <QRCodeSVG value={value} size={168} level="M" marginSize={3} bgColor="#ffffff" fgColor="#111018" title="AR page QR code" />
    </div>
  );
}

