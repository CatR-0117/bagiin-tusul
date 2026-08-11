/** Сервер болон клиент дээр хуваалцаж ашиглах төхөөрөмж танигч. */
export type Platform = "ios" | "android" | "desktop";

export function platformFromUserAgent(userAgent: string): Platform {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export function platformFromBrowser(): Platform {
  if (typeof navigator === "undefined") return "desktop";

  // iPadOS 13+ заримдаа өөрийгөө Macintosh гэж танилцуулдаг.
  if (
    platformFromUserAgent(navigator.userAgent) === "ios" ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }

  return platformFromUserAgent(navigator.userAgent);
}
