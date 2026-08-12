"use client";

import Link from "next/link";
import { Box, LayoutGrid, Plus, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/create", label: "Create model", icon: Plus },
  { href: "/models", label: "My models", icon: Box },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace navigation">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SettingsLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/account/settings");
  return (
    <Link className={`settings-link ${active ? "active" : ""}`} href="/account/settings" aria-label="Account settings" aria-current={active ? "page" : undefined}>
      <Settings size={17} aria-hidden="true" />
    </Link>
  );
}

export function MobileAppNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile workspace navigation">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <Icon size={19} />
            <span>{label === "Create model" ? "Create" : label === "My models" ? "Models" : label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

