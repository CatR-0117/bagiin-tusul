"use client";

import dynamic from "next/dynamic";
import {
  ArrowRight,
  Armchair,
  Box,
  Check,
  ChevronRight,
  CirclePlay,
  Expand,
  GraduationCap,
  Landmark,
  Layers3,
  Maximize2,
  MousePointer2,
  Orbit,
  PackageCheck,
  RotateCcw,
  ScanLine,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Upload,
  WandSparkles,
  ZoomIn,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  type CSSProperties,
  type ComponentType,
  useEffect,
  useRef,
  useState,
} from "react";
import MotionReveal from "./MotionReveal";
import { motionTokens } from "./motion-tokens";

const VaseScene = dynamic(() => import("./VaseScene"), {
  ssr: false,
  loading: () => <div className="snap-canvas-loading" aria-hidden="true" />,
});

type SnapLandingProps = {
  onCreate: () => void;
  onModels: () => void;
};

const heroSteps = [
  { label: "Upload", detail: "Product image" },
  { label: "Analyze", detail: "Depth + subject" },
  { label: "Build", detail: "3D geometry" },
  { label: "Preview", detail: "Textured GLB" },
  { label: "Place", detail: "Real-world AR" },
];

const statusByPhase = [
  "Image ready",
  "Detecting depth",
  "Building geometry",
  "360° model ready",
  "Placed in your space",
];

const howSteps = [
  {
    icon: Upload,
    number: "01",
    title: "Upload",
    copy: "Add one clear JPG, PNG, or WebP product image.",
  },
  {
    icon: WandSparkles,
    number: "02",
    title: "Generate",
    copy: "AI removes the background and builds textured geometry.",
  },
  {
    icon: Orbit,
    number: "03",
    title: "Preview",
    copy: "Inspect every angle in a responsive 360° viewer.",
  },
  {
    icon: Smartphone,
    number: "04",
    title: "View in AR",
    copy: "Place the same model at true scale in your space.",
  },
];

const useCases: Array<{
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  copy: string;
}> = [
  {
    icon: ShoppingBag,
    title: "Products",
    copy: "Turn a clean packshot into an interactive product experience.",
  },
  {
    icon: Armchair,
    title: "Furniture",
    copy: "Help buyers understand scale and fit before they order.",
  },
  {
    icon: GraduationCap,
    title: "Education",
    copy: "Make physical subjects explorable from every angle.",
  },
  {
    icon: Landmark,
    title: "Museums",
    copy: "Bring collection objects into classrooms and homes.",
  },
  {
    icon: PackageCheck,
    title: "E-commerce",
    copy: "Share conversion-ready 3D and AR without a native app.",
  },
];

function phaseFor(progress: number) {
  if (progress < 0.2) return 0;
  if (progress < 0.4) return 1;
  if (progress < 0.65) return 2;
  if (progress < 0.8) return 3;
  return 4;
}

function rangeProgress(value: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

function SnapMark() {
  return (
    <span className="snap-brand-mark" aria-hidden="true">
      <span />
      <i />
    </span>
  );
}

function HeroStory({ onCreate }: { onCreate: () => void }) {
  const storyRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(reduceMotion ? 1 : 0);
  const activeProgress = reduceMotion ? 1 : progress;
  const phase = phaseFor(activeProgress);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    let cancelled = false;
    let cleanup = () => {};

    void import("gsap").then((gsapModule) => {
      if (cancelled || !storyRef.current) return;
      const gsap = gsapModule.gsap;
      const timelineProgress = { value: 0 };

      const context = gsap.context(() => {
        const storyTimeline = gsap.timeline({ repeat: -1, repeatDelay: 0.15 });

        storyTimeline
          .set(".snap-story-portal", { autoAlpha: 0, scale: 0.82 })
          .set(timelineProgress, { value: 0 })
          .to(timelineProgress, {
            value: 1,
            duration: 13.4,
            ease: "none",
            onUpdate: () => setProgress(timelineProgress.value),
          })
          .to(
            ".snap-story-portal",
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.72,
              ease: "power3.inOut",
            },
            "-=0.58",
          )
          .call(() => {
            timelineProgress.value = 0;
            setProgress(0);
          })
          .to(".snap-story-portal", {
            autoAlpha: 0,
            scale: 1.18,
            duration: 0.82,
            ease: "power3.out",
          });

        gsap.to(".snap-story-glow", {
          rotation: 360,
          duration: 26,
          repeat: -1,
          ease: "none",
        });
      }, storyRef);

      cleanup = () => context.revert();
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [reduceMotion]);

  const meshProgress =
    activeProgress < 0.31
      ? 0.04
      : activeProgress < 0.64
        ? rangeProgress(activeProgress, 0.31, 0.64)
        : 1;
  const flatOpacity = 1 - rangeProgress(activeProgress, 0.25, 0.38);
  const modelOpacity = rangeProgress(activeProgress, 0.27, 0.42);
  const arAmount = rangeProgress(activeProgress, 0.77, 0.94);
  const viewerAmount = rangeProgress(activeProgress, 0.59, 0.71) * (1 - arAmount);
  const spatialAmount = rangeProgress(activeProgress, 0.28, 0.46) * (1 - arAmount);
  const orbit = activeProgress * Math.PI * 2;
  const style = {
    "--story-progress": activeProgress,
    "--flat-opacity": flatOpacity,
    "--model-opacity": modelOpacity,
    "--viewer-opacity": viewerAmount,
    "--ar-opacity": arAmount,
    "--spatial-opacity": spatialAmount,
    "--orbit-x": `${Math.sin(orbit) * 3.2}deg`,
    "--orbit-y": `${Math.cos(orbit * 0.78) * 1.35}deg`,
    "--scene-lift": `${Math.sin(orbit * 1.25) * -6}px`,
    "--parallax-x": `${Math.sin(orbit) * 14}px`,
    "--ar-lift": `${arAmount * -7}%`,
    "--model-scale": 1 - arAmount * 0.12,
    "--hero-shadow-width": `${28 - arAmount * 14}%`,
    "--hero-shadow-bottom": `${13 + arAmount * 9}%`,
    "--story-percent": `${activeProgress * 100}%`,
  } as CSSProperties;

  return (
    <section ref={storyRef} className="snap-hero" id="top" style={style}>
      <div className="snap-hero-pin">
        <div className="snap-hero-aurora" aria-hidden="true" />
        <div className="snap-hero-inner">
          <motion.div
            className="snap-hero-copy"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionTokens.duration.slow,
              ease: motionTokens.ease.enter,
            }}
          >
            <span className="snap-eyebrow">
              <Sparkles size={14} /> AI-POWERED 3D &amp; AR
            </span>
            <h1>From one image to 3D — then into your world.</h1>
            <p>
              Upload a product image, generate a detailed 3D model with AI,
              and place it in your space using augmented reality.
            </p>
            <div className="snap-hero-actions">
              <button className="snap-button snap-button-primary" onClick={onCreate}>
                Create your 3D model <ArrowRight size={17} />
              </button>
              <a className="snap-button snap-button-secondary" href="#how-it-works">
                <CirclePlay size={17} /> See how it works
              </a>
            </div>
            <div className="snap-trust-row" aria-label="Supported output">
              <span><Check size={13} /> No app required</span>
              <span><Check size={13} /> GLB + USDZ</span>
              <span><Check size={13} /> AR ready</span>
            </div>
          </motion.div>

          <div className={`snap-story-stage phase-${phase}`}>
            <div className="snap-story-glow" aria-hidden="true" />
            <div className="snap-story-shell">
              <div className="snap-stage-topline">
                <span><i /> {statusByPhase[phase]}</span>
                <small>{Math.round(activeProgress * 100).toString().padStart(2, "0")}%</small>
              </div>

              <div className="snap-flat-card" aria-hidden={flatOpacity < 0.1}>
                <div className="snap-file-meta">
                  <span className="snap-file-icon"><Upload size={15} /></span>
                  <span><b>ceramic-vase.jpg</b><small>1.8 MB · 2048 × 2048</small></span>
                  <Check size={15} />
                </div>
                <div className="snap-flat-image">
                  <VaseScene
                    className="snap-flat-canvas"
                    color="#c9a6ff"
                    progress={1}
                    compact
                    still
                    interactive={false}
                    autoRotate={false}
                    distance={4.2}
                    cameraY={0.9}
                    label="Uploaded ceramic vase"
                  />
                </div>
              </div>

              <div className="snap-ar-environment" aria-hidden="true" />

              <div className="snap-spatial-field" aria-hidden="true">
                <span className="snap-orbit-ring snap-orbit-ring-one" />
                <span className="snap-orbit-ring snap-orbit-ring-two" />
                <div className="snap-depth-constellation">
                  {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
                </div>
              </div>

              <div className="snap-model-object" aria-hidden={modelOpacity < 0.1}>
                <VaseScene
                  className="snap-story-canvas"
                  color="#c9a6ff"
                  progress={meshProgress}
                  autoRotate={activeProgress > 0.6}
                  interactive={phase >= 3}
                  showGrid={phase === 2}
                  scale={1 - arAmount * 0.72}
                  distance={4.25}
                  cameraY={0.92}
                  label="Vase transforming from mesh to textured 3D model"
                />
                <span className="snap-object-shadow" />
              </div>

              <div className="snap-scan-overlay" aria-hidden="true">
                <span className="snap-scan-beam" />
                <span className="snap-scan-column" />
                <div className="snap-analysis-pills">
                  <span><Check size={11} /> Analyzing image</span>
                  <span><Check size={11} /> Removing background</span>
                  <span><ScanLine size={11} /> Detecting depth</span>
                </div>
              </div>

              <div className="snap-mesh-labels" aria-hidden="true">
                <span>DEPTH MAP</span>
                <span>18.4K VERTICES</span>
                <span>MANIFOLD MESH</span>
              </div>

              <div className="snap-viewer-ui" aria-hidden="true">
                <span className="snap-viewer-badge"><Box size={13} /> GLB · READY</span>
                <div className="snap-viewer-tools">
                  <span><Orbit size={15} /></span>
                  <span><ZoomIn size={15} /></span>
                  <span><RotateCcw size={15} /></span>
                  <span><Maximize2 size={15} /></span>
                </div>
                <span className="snap-drag-hint"><MousePointer2 size={13} /> DRAG TO ROTATE</span>
              </div>

              <div className="snap-ar-ui" aria-hidden="true">
                <div className="snap-phone-status"><span>9:41</span><span>● ● ●</span></div>
                <div className="snap-room-lines" />
                <span className="snap-surface-note">SURFACE FOUND</span>
                <span className="snap-room-reference"><i /> Centered on coffee table</span>
                <span className="snap-vase-measure"><i /><b>42 cm</b></span>
                <span className="snap-reticle"><i /></span>
                <div className="snap-ar-bottom">
                  <span />
                  <b>Move to place · pinch to scale</b>
                  <span />
                </div>
              </div>

              <div className="snap-story-portal" aria-hidden="true">
                <span className="snap-portal-rings"><i /><i /></span>
                <SnapMark />
                <b>SPATIAL ASSET READY</b>
              </div>
            </div>

            <div className="snap-story-progress" aria-label={`Story step ${phase + 1} of 5`}>
              <span className="snap-progress-energy" aria-hidden="true"><i /></span>
              {heroSteps.map((step, index) => (
                <span
                  key={step.label}
                  className={`snap-story-step ${index === phase ? "active" : index < phase ? "done" : ""}`}
                >
                  <i />
                  <span className="snap-story-step-copy"><b>{step.label}</b><small>{step.detail}</small></span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {reduceMotion && (
        <div className="snap-static-steps">
          {heroSteps.map((step, index) => (
            <span key={step.label}><b>0{index + 1}</b>{step.label}</span>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SnapLanding({ onCreate, onModels }: SnapLandingProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="snap-landing">
      <header className={`snap-nav ${scrolled ? "is-scrolled" : ""}`}>
        <a className="snap-logo" href="#top" aria-label="SnapAR home">
          <SnapMark />
          <span>Snap<b>AR</b></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How It Works</a>
          <a href="#demo">Demo</a>
          <a href="#use-cases">Use Cases</a>
          <button type="button" onClick={onModels}>My Models</button>
        </nav>
        <button className="snap-button snap-button-primary snap-nav-cta" onClick={onCreate}>
          Create 3D <ArrowRight size={15} />
        </button>
      </header>

      <main>
        <HeroStory onCreate={onCreate} />

        <section className="snap-section snap-how" id="how-it-works">
          <MotionReveal className="snap-section-heading">
            <span className="snap-kicker">One simple flow</span>
            <h2>From a flat image to something you can almost touch.</h2>
            <p>Every stage keeps the same subject in focus, from upload through real-world placement.</p>
          </MotionReveal>
          <div className="snap-how-grid">
            {howSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <MotionReveal className="snap-how-card" key={step.title} delay={index * 0.07}>
                  <span className="snap-how-icon"><Icon size={19} /></span>
                  <small>{step.number}</small>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                  {index < howSteps.length - 1 && <ChevronRight className="snap-how-arrow" size={17} />}
                </MotionReveal>
              );
            })}
          </div>
        </section>

        <section className="snap-section snap-demo" id="demo">
          <MotionReveal className="snap-demo-copy">
            <span className="snap-kicker">Try the real workflow</span>
            <h2>Your image goes in. A spatial asset comes out.</h2>
            <p>
              Upload up to four angles for better geometry. SnapAR validates the
              image, shows live AI progress, then opens the result in the real GLB viewer.
            </p>
            <ul>
              <li><Check size={14} /> JPG, PNG, and WebP up to 20 MB</li>
              <li><Check size={14} /> Background and image-quality analysis</li>
              <li><Check size={14} /> GLB for web and USDZ for iPhone AR</li>
            </ul>
          </MotionReveal>
          <MotionReveal className="snap-demo-upload" delay={0.1}>
            <button className="snap-demo-drop" onClick={onCreate} type="button">
              <span className="snap-upload-orbit"><Upload size={24} /></span>
              <b>Drop your product image here</b>
              <p>or choose a file to start creating</p>
              <span className="snap-button snap-button-primary">Choose image <ArrowRight size={15} /></span>
              <small>JPG · PNG · WEBP</small>
            </button>
            <div className="snap-demo-flow">
              {["Analyzing", "Geometry", "Texture", "AR ready"].map((label, index) => (
                <span key={label}><i className={index === 0 ? "active" : ""} />{label}</span>
              ))}
            </div>
          </MotionReveal>
        </section>

        <section className="snap-preview-section">
          <MotionReveal className="snap-preview-heading">
            <span className="snap-kicker">Interactive 3D preview</span>
            <h2>See every angle before it enters the room.</h2>
            <p>Rotate, zoom, reset, and inspect the generated model in a fast, responsive web viewer.</p>
          </MotionReveal>
          <MotionReveal className="snap-preview-stage" delay={0.08}>
            <div className="snap-preview-grid" aria-hidden="true" />
            <span className="snap-viewer-badge"><Box size={13} /> TEXTURED GLB</span>
            <VaseScene
              className="snap-preview-canvas"
              color="#c9a6ff"
              progress={1}
              showGrid
              interactive
              distance={4.1}
              cameraY={0.92}
              label="Interactive textured 3D vase. Drag to rotate and scroll to zoom."
            />
            <div className="snap-preview-controls">
              <button aria-label="Rotate model"><Orbit size={18} /></button>
              <button aria-label="Zoom model"><ZoomIn size={18} /></button>
              <button aria-label="Reset view"><RotateCcw size={18} /></button>
              <button aria-label="Open fullscreen"><Expand size={18} /></button>
            </div>
            <span className="snap-preview-help"><MousePointer2 size={14} /> Drag to rotate · scroll to zoom</span>
          </MotionReveal>
        </section>

        <section className="snap-section snap-ar-section">
          <MotionReveal className="snap-ar-phone-wrap">
            <div className="snap-ar-phone">
              <div className="snap-phone-status"><span>9:41</span><span>● ● ●</span></div>
              <div className="snap-ar-camera">
                <span className="snap-camera-copy">SURFACE FOUND</span>
                <span className="snap-ar-live"><i /> LIVE AR PREVIEW</span>
                <div className="snap-room-lines" />
                <VaseScene
                  className="snap-ar-vase"
                  color="#c9a6ff"
                  progress={1}
                  autoRotate={false}
                  interactive={false}
                  presentation="ar"
                  scale={0.28}
                  distance={4.4}
                  cameraY={0.72}
                  label="3D vase placed on a detected floor in AR"
                />
                <span className="snap-reticle"><i /></span>
                <span className="snap-ar-contact" />
                <span className="snap-room-reference"><i /> Centered on coffee table</span>
                <span className="snap-vase-measure"><i /><b>42 cm</b></span>
                <div className="snap-ar-model-info">
                  <span className="snap-ar-model-swatch" />
                  <span><b>Ceramic vase</b><small>42 cm · centered placement</small></span>
                  <Check size={13} />
                </div>
              </div>
              <div className="snap-ar-bottom"><span /><b>Pinch to scale · drag to rotate</b><span /></div>
            </div>
          </MotionReveal>
          <MotionReveal className="snap-ar-copy" delay={0.08}>
            <span className="snap-kicker">Web AR, ready when you are</span>
            <h2>Place the same model in your space.</h2>
            <p>
              Open the AR link on iPhone or Android, scan a surface, and place
              your generated model at a believable scale—without installing an app.
            </p>
            <div className="snap-ar-facts">
              <span><Smartphone size={17} /><b>iOS Quick Look</b><small>USDZ support</small></span>
              <span><Layers3 size={17} /><b>Scene Viewer</b><small>Android GLB</small></span>
              <span><ScanLine size={17} /><b>WebXR</b><small>Supported devices</small></span>
            </div>
            <button className="snap-button snap-button-primary" onClick={onCreate}>
              Create an AR-ready model <ArrowRight size={16} />
            </button>
          </MotionReveal>
        </section>

        <section className="snap-section snap-use-cases" id="use-cases">
          <MotionReveal className="snap-section-heading snap-use-heading">
            <span className="snap-kicker">Built for visual decisions</span>
            <h2>One image. More ways to understand, present, and sell.</h2>
          </MotionReveal>
          <div className="snap-use-grid">
            {useCases.map((item, index) => {
              const Icon = item.icon;
              return (
                <MotionReveal className="snap-use-card" key={item.title} delay={index * 0.05}>
                  <Icon size={22} strokeWidth={1.7} />
                  <span>0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </MotionReveal>
              );
            })}
          </div>
        </section>

        <section className="snap-section snap-share-section">
          <MotionReveal className="snap-share-card">
            <div className="snap-share-copy">
              <span className="snap-kicker">Save and share anywhere</span>
              <h2>One model. One link. Every device.</h2>
              <p>Share a browser-ready 3D preview or let someone scan the QR code to launch AR on mobile.</p>
              <div className="snap-share-actions">
                <span><Share2 size={16} /> Shareable link</span>
                <span><Smartphone size={16} /> Mobile AR handoff</span>
              </div>
            </div>
            <div className="snap-share-visual">
              <div className="snap-link-pill"><span>snapar.app/m/ceramic-vase</span><Check size={15} /></div>
              <div className="snap-qr-card">
                <div className="snap-qr-pattern" aria-label="Example QR code" />
                <span><b>Open in AR</b><small>Scan with your phone</small></span>
              </div>
              <span className="snap-share-success"><Check size={14} /> Link copied</span>
            </div>
          </MotionReveal>
        </section>

        <section className="snap-final-cta">
          <div className="snap-final-orb" aria-hidden="true">
            <VaseScene
              className="snap-final-vase"
              color="#c9a6ff"
              progress={1}
              still
              interactive={false}
              autoRotate={false}
              distance={4.2}
              cameraY={0.92}
              label=""
            />
          </div>
          <MotionReveal className="snap-final-copy">
            <span className="snap-kicker">Your first spatial asset is one image away</span>
            <h2>Turn your first image into 3D.</h2>
            <p>Create the model, inspect it from every angle, and place it in your world.</p>
            <button className="snap-button snap-button-primary" onClick={onCreate}>
              Create your 3D model <ArrowRight size={17} />
            </button>
          </MotionReveal>
        </section>
      </main>

      <footer className="snap-footer">
        <a className="snap-logo" href="#top"><SnapMark /><span>Snap<b>AR</b></span></a>
        <p>AI-powered image to 3D and AR.</p>
        <span>© 2026 SnapAR</span>
      </footer>
    </div>
  );
}
