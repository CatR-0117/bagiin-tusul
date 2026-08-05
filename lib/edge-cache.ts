/**
 * Cloudflare Workers-ийн `caches.default` руу төрөл аюулгүй хандах.
 *
 * DOM-ийн `CacheStorage` төрөлд `default` талбар байдаггүй (энэ нь
 * Cloudflare-ийн өргөтгөл) тул энд нэг дор кастлаж, орчин дэмжихгүй
 * тохиолдолд `null` буцаана.
 */
type CloudflareCacheStorage = CacheStorage & { default?: Cache };

export function edgeCache(): Cache | null {
  if (typeof caches === "undefined") return null;
  return (caches as CloudflareCacheStorage).default ?? null;
}
