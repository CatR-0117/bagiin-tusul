import Link from "next/link";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import type { AppUser } from "@/lib/auth";
import { MobileAppNav } from "@/components/layout/sidebar-nav";
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
        <div>
          <Link className="mobile-settings-link" href="/account/settings" aria-label="Бүртгэлийн тохиргоо"><Settings size={18} /></Link>
          <Link className="button button-primary button-small" href="/create">Үүсгэх</Link>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <MobileAppNav />
    </div>
  );
}
