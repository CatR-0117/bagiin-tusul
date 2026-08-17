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
      <section className="auth-visual" aria-label="OBJECT ROOM ажлын урсгал">
        <Logo />
        <div className="auth-visual-copy">
          <span className="eyebrow"><Sparkles size={14} /> Зургаас орон зайн загварт</span>
          <h2>Нэг зураг.<br />Бодит мэт гүн.</h2>
          <p>Бүтээгдэхүүний зургаа интерактив 3D загвар болгоод AR-аар хүссэн орчиндоо байрлуулаарай.</p>
          <div className="auth-flow">
            <span>IMG</span><i /><span><Box size={18} /></span><i /><span><ScanLine size={18} /></span>
          </div>
        </div>
        <small>Орчин үеийн багуудад зориулсан AI 3D бүтээл.</small>
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
