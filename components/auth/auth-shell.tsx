import type { ReactNode } from "react";
import { Box, ScanLine, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="SnapAR workflow">
        <Logo />
        <div className="auth-visual-copy">
          <span className="eyebrow"><Sparkles size={14} /> Image to spatial</span>
          <h2>One image.<br />A world of depth.</h2>
          <p>Turn a flat product shot into an interactive 3D asset and place it anywhere with AR.</p>
          <div className="auth-flow">
            <span>IMG</span><i /><span><Box size={18} /></span><i /><span><ScanLine size={18} /></span>
          </div>
        </div>
        <small>AI-powered 3D creation for modern product teams.</small>
      </section>
      <section className="auth-panel">
        <div className="auth-mobile-logo"><Logo /></div>
        <div className="auth-card">
          <span className="auth-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

