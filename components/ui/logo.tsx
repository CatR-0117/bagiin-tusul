import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`logo ${compact ? "logo-compact" : ""}`} href="/">
      <span className="logo-mark" aria-hidden="true">
        <span />
      </span>
      <span>SnapAR</span>
    </Link>
  );
}

