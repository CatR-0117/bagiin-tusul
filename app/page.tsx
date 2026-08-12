import Link from "next/link";
import { ArrowRight, Box, Check, Image as ImageIcon, ScanLine, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const cta = user ? "/create" : "/auth/signup";

  return (
    <main className="landing-page">
      <Navbar user={user} />
      <section className="hero-section">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> AI image-to-spatial studio</span>
          <h1>Turn images into 3D.<br /><em>See them in your world.</em></h1>
          <p>Upload a single product image and SnapAR turns it into a ready-to-share 3D model—complete with a mobile AR experience.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={cta}>Create your first 3D model <ArrowRight size={18} /></Link>
            <a className="text-link" href="#workflow">See how it works <span>↓</span></a>
          </div>
          <div className="hero-proof">
            <span><Check size={15} /> No 3D skills needed</span>
            <span><Check size={15} /> GLB + mobile AR</span>
          </div>
        </div>
        <div className="hero-object" aria-label="Image transforming into a 3D object and AR view">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="spatial-card card-image"><ImageIcon size={22} /><small>01 / IMAGE</small></div>
          <div className="spatial-cube"><span /><span /><span /></div>
          <div className="spatial-card card-ar"><ScanLine size={22} /><small>03 / AR READY</small></div>
          <div className="object-status"><i /> MODEL GENERATED <strong>00:42</strong></div>
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="section-heading">
          <span className="eyebrow">From flat to spatial</span>
          <h2>Three steps. One continuous flow.</h2>
          <p>No complex modeling software, exporting rituals, or AR engineering.</p>
        </div>
        <div className="workflow-grid">
          {[
            { number: "01", icon: Upload, title: "Upload an image", body: "Choose a clear JPG, PNG, or WebP product shot. Your file uploads directly to secure object storage." },
            { number: "02", icon: Box, title: "Generate the model", body: "AI reconstructs geometry and materials, then packages an interactive GLB and optional USDZ." },
            { number: "03", icon: ScanLine, title: "Place it in AR", body: "Share a QR link. Any phone can open the preview and launch a native AR experience." },
          ].map(({ number, icon: Icon, title, body }) => (
            <article key={number} className="workflow-card">
              <div><span>{number}</span><Icon size={21} /></div>
              <h3>{title}</h3><p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="feature-visual">
          <div className="viewer-shell">
            <div className="viewer-top"><span><i /> LIVE PREVIEW</span><small>GLB · PBR</small></div>
            <div className="viewer-object"><span /><span /><span /></div>
            <div className="viewer-controls"><button>−</button><button>↻</button><button>+</button></div>
          </div>
        </div>
        <div className="feature-copy">
          <span className="eyebrow">Built for real workflows</span>
          <h2>Private by default.<br />Ready to share.</h2>
          <p>Every model belongs to your workspace. Files stay in dedicated object storage, while signed links keep the viewer fast and secure.</p>
          <ul>
            <li><ShieldCheck size={19} /><span><strong>Secure uploads</strong>Direct, presigned transfers to Cloudflare R2.</span></li>
            <li><Box size={19} /><span><strong>Interactive 3D</strong>Orbit, zoom, inspect, and download your GLB.</span></li>
            <li><ScanLine size={19} /><span><strong>Instant mobile AR</strong>One QR route for Android Scene Viewer and iOS Quick Look.</span></li>
          </ul>
        </div>
      </section>

      <section className="landing-cta">
        <div><span className="eyebrow">Your next product shot can move</span><h2>Make it spatial in minutes.</h2></div>
        <Link className="button button-light" href={cta}>Start creating <ArrowRight size={18} /></Link>
      </section>
      <footer className="landing-footer"><span>SnapAR</span><small>IMAGE → 3D → AR</small><small>© 2026 SnapAR Studio</small></footer>
    </main>
  );
}

