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
  title: { default: "SnapAR — Image to 3D to AR", template: "%s · SnapAR" },
  description: "Turn one product image into an interactive 3D model and place it in your world with AR.",
  keywords: ["AI 3D", "image to 3D", "augmented reality", "GLB", "USDZ"],
  openGraph: {
    title: "SnapAR — Image to 3D to AR",
    description: "Turn one product image into an interactive 3D model and place it in AR.",
    type: "website",
    images: [{ url: "/og.png", width: 1727, height: 911, alt: "SnapAR image to 3D to AR studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapAR — Image to 3D to AR",
    description: "One image becomes an interactive 3D model and mobile AR experience.",
    images: ["/og.png"],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { metadataBase: new URL(`${protocol}://${host}`), ...metadata };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={`${sans.variable} ${mono.variable}`}><body>{children}</body></html>;
}

