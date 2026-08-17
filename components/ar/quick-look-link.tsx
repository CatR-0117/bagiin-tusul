import type { ComponentProps } from "react";

type QuickLookLinkProps = Omit<ComponentProps<"a">, "href" | "rel"> & {
  href: string;
};

/**
 * Apple Quick Look requires a user-tapped `a[rel="ar"]` whose first child is
 * an image. Keep that exact markup instead of launching a generated link from
 * JavaScript, which newer iOS versions may ignore.
 */
export function QuickLookLink({
  children,
  href,
  ...props
}: QuickLookLinkProps) {
  return (
    <a {...props} href={href} rel="ar">
      {/* Apple requires a real image as the first child of the AR link. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="quick-look-link-thumbnail"
        src="/ar-coffee-table.avif"
        alt=""
        aria-hidden="true"
      />
      {children}
    </a>
  );
}
