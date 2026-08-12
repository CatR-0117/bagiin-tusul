import Link from "next/link";
import { Box, LayoutGrid, Plus, Settings } from "lucide-react";
import type { AppUser } from "@/lib/auth";
import { LogoutButton } from "@/components/layout/logout-button";
import { Logo } from "@/components/ui/logo";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/create", label: "Create model", icon: Plus },
  { href: "/models", label: "My models", icon: Box },
];

export function Sidebar({ user }: { user: AppUser }) {
  return (
    <aside className="sidebar">
      <Logo />
      <nav aria-label="Workspace navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <span>{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.isDemo ? "Demo workspace" : user.email}</small>
          </div>
        </div>
        <Link className="settings-placeholder" href="/dashboard" aria-label="Account settings">
          <Settings size={17} aria-hidden="true" />
        </Link>
        <LogoutButton isDemo={user.isDemo} />
      </div>
    </aside>
  );
}

