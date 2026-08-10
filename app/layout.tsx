import type { Metadata, Viewport } from "next";
import { Geologica, Golos_Text, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./snap-premium.css";

const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin", "cyrillic"],
});

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
});

/**
 * Утасны тохиргоо.
 *
 * `viewportFit: "cover"` байхгүй бол iPhone-ий хонхорхой/доод зурааснаас
 * зайлсхийхэд ашигладаг `env(safe-area-inset-*)` утгууд үргэлж 0 байдаг.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8fc",
  colorScheme: "light",
};

const baseMetadata: Metadata = {
  title: "SnapAR — From one image to 3D, then AR",
  description:
    "Upload a product image, generate a detailed 3D model with AI, and place it in your space with AR.",
  keywords: ["3D", "AR", "AI", "SnapAR", "image to 3D"],
  openGraph: {
    title: "SnapAR — From one image to 3D, then AR",
    description:
      "Turn one product image into a detailed 3D model, then place it in your world with AR.",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1727,
        height: 911,
        alt: "SnapAR — Image to 3D to AR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapAR — From one image to 3D, then AR",
    description: "Turn one image into a 3D model and place it in AR.",
    images: ["/og.png"],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    ...baseMetadata,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geologica.variable} ${golos.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
