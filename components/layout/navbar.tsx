import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AppUser } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";

export function Navbar({ user }: { user?: AppUser | null }) {
  return (
    <header className="site-nav">
      <Logo />
      <nav className="landing-nav-links" aria-label="Main navigation">
        <a href="#workflow">How it works</a>
        <a href="#features">Features</a>
        {user && <Link href="/dashboard">My models</Link>}
      </nav>
      <div className="nav-actions">
        {user ? (
          <Link className="button button-primary button-small" href="/create">
            Create model <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <>
            <Link className="nav-login" href="/auth/login">Log in</Link>
            <Link className="button button-primary button-small" href="/auth/signup">
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

