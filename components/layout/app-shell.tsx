import Link from "next/link";
import { Box, LayoutGrid, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { AppUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Logo } from "@/components/ui/logo";

export function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <header className="mobile-app-header">
        <Logo compact />
        <Link className="button button-primary button-small" href="/create">Create</Link>
      </header>
      <main className="app-main">{children}</main>
      <nav className="mobile-bottom-nav" aria-label="Mobile workspace navigation">
        <Link href="/dashboard"><LayoutGrid size={19} /><span>Overview</span></Link>
        <Link href="/create"><Plus size={19} /><span>Create</span></Link>
        <Link href="/models"><Box size={19} /><span>Models</span></Link>
      </nav>
    </div>
  );
}

