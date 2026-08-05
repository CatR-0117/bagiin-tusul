import type { Metadata, Viewport } from "next";
import { Geologica, Golos_Text, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

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
  themeColor: "#0b0c10",
  colorScheme: "dark",
};

const baseMetadata: Metadata = {
  title: "MORPH AR — Нэг зургаас шинэ хэмжээс рүү",
  description:
    "Нэг зургаас интерактив 3D загвар үүсгэж, бодит орчинд AR-аар байрлуулах Монгол платформ.",
  keywords: ["3D", "AR", "AI", "MORPH AR", "Монгол"],
  openGraph: {
    title: "MORPH AR — Нэг зургаас шинэ хэмжээс рүү",
    description:
      "Нэг зургаас интерактив 3D загвар үүсгэж, бодит орчинд AR-аар байрлуулаарай.",
    type: "website",
    locale: "mn_MN",
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        alt: "MORPH AR — Нэг зургаас шинэ хэмжээс рүү",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MORPH AR — Нэг зургаас шинэ хэмжээс рүү",
    description: "AI-аар 2D зургаа 3D, AR загвар болго.",
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
      lang="mn"
      className={`${geologica.variable} ${golos.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
