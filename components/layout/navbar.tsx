import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AppUser } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";

export function Navbar({ user }: { user?: AppUser | null }) {
  return (
    <header className="site-nav">
      <Logo />
      <nav className="landing-nav-links" aria-label="Үндсэн цэс">
        <a href="#workflow">Хэрхэн ажиллах вэ</a>
        <a href="#features">Боломжууд</a>
        {user && <Link href="/dashboard">Миний загварууд</Link>}
      </nav>
      <div className="nav-actions">
        {user ? (
          <Link className="button button-primary button-small" href="/create">
            Загвар үүсгэх <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <>
            <Link className="nav-login" href="/auth/login">Нэвтрэх</Link>
            <Link className="button button-primary button-small" href="/auth/signup">
              Эхлэх
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
