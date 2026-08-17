import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0a10",
  colorScheme: "dark",
};

const metadata: Metadata = {
  title: { default: "Object Room — Нээлттэй 3D үзүүлэн", template: "%s · Object Room" },
  description: "Таван 3D загварыг бүртгэлгүйгээр 360° үзэж, QR холбоосоор утсан дээрээ нээнэ.",
  keywords: ["3D model", "3D viewer", "GLB", "QR", "Mongolia"],
  openGraph: {
    title: "Object Room — Нээлттэй 3D үзүүлэн",
    description: "Таван 3D загварыг бүртгэлгүйгээр бүх өнцгөөс үзээрэй.",
    type: "website",
    images: [{ url: "/og-object-room-v2.png", width: 1200, height: 630, alt: "Object Room нээлттэй 3D болон AR үзүүлэн" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Object Room — Нээлттэй 3D үзүүлэн",
    description: "Таван 3D загварыг бүртгэлгүйгээр бүх өнцгөөс үзээрэй.",
    images: ["/og-object-room-v2.png"],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { metadataBase: new URL(`${protocol}://${host}`), ...metadata };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="mn" className={`${sans.variable} ${mono.variable}`}><body>{children}</body></html>;
}
