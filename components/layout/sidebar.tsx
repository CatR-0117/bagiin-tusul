import type { AppUser } from "@/lib/auth";
import { LogoutButton } from "@/components/layout/logout-button";
import { SettingsLink, SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/ui/logo";

export function Sidebar({ user }: { user: AppUser }) {
  return (
    <aside className="sidebar">
      <Logo />
      <SidebarNav />
      <div className="sidebar-footer">
        <div className="user-chip">
          <span>{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.isDemo ? "Demo workspace" : user.email}</small>
          </div>
        </div>
        <SettingsLink />
        <LogoutButton isDemo={user.isDemo} />
      </div>
    </aside>
  );
}
