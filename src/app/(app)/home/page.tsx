"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGeneration } from "@/components/GenerationBanner";

interface RecentReport {
  id: string;
  title: string | null;
  topicCategory: string | null;
  createdAt: string;
}

type Depth = "quick" | "deep" | "expert";
type RefType = "style_guide" | "extra_reading" | "project_context";
type ExpertiseLevel = "beginner" | "intermediate" | "advanced";

const DEPTH_OPTIONS: { value: Depth; label: string; desc: string }[] = [
  { value: "quick", label: "Quick", desc: "~100 words" },
  { value: "deep", label: "Deep", desc: "~300 words" },
  { value: "expert", label: "Expert", desc: "~500 words" },
];

const DETAIL_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: "1", desc: "Key points" },
  { value: 2, label: "2", desc: "Brief steps" },
  { value: 3, label: "3", desc: "Balanced" },
  { value: 4, label: "4", desc: "Thorough" },
  { value: 5, label: "5", desc: "Deep dive" },
];

const EXPERTISE_OPTIONS: { value: ExpertiseLevel; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "New here" },
  { value: "intermediate", label: "Intermediate", desc: "Some exp." },
  { value: "advanced", label: "Advanced", desc: "Deep know." },
];

/* ---------- Neural mesh canvas ---------- */
interface Node {
  x: number; y: number; vx: number; vy: number; r: number; pulse: number; phase: number;
}

function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas;
    const ctx = c.getContext("2d")!;
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0;
    const nodes: Node[] = [];
    const NODE_COUNT = 38;
    const MAX_DIST = 160;

    function resize() {
      W = c.offsetWidth;
      H = c.offsetHeight;
      c.width = W;
      c.height = H;
    }

    function init() {
      nodes.length = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: 1.5 + Math.random() * 2,
          pulse: 0,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H);

      // update
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.0008 + n.phase));
      }

      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ni = nodes[i]!; const nj = nodes[j]!;
          const dx = ni.x - nj.x;
          const dy = ni.y - nj.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_DIST) {
            const alpha = (1 - d / MAX_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(ni.x, ni.y);
            ctx.lineTo(nj.x, nj.y);
            ctx.strokeStyle = `oklch(0.78 0.18 75 / ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        grd.addColorStop(0, `oklch(0.78 0.18 75 / ${0.7 * n.pulse})`);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * n.pulse, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(0.78 0.18 75 / ${0.9 * n.pulse})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    init();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", () => { resize(); init(); });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", () => { resize(); init(); });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
    />
  );
}

/* ---------- Page ---------- */
export default function HomePage() {
  const router = useRouter();
  const { setActiveReportId } = useGeneration();
  const [url, setUrl] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [depth, setDepth] = useState<Depth>("deep");
  const [detailLevel, setDetailLevel] = useState(3);
  const [expertiseLevel, setExpertiseLevel] = useState<ExpertiseLevel>("intermediate");
  const [focus, setFocus] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceUrlType, setReferenceUrlType] = useState<RefType>("extra_reading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch("/api/reports?limit=5&status=ready")
      .then((r) => r.json())
      .then((data) => { if (data.reports) setRecentReports(data.reports); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) { setError("Please enter a YouTube URL."); return; }
    if (projectContext.trim().length < 10) {
      setError("Please describe what you're building (at least 10 characters).");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          project_context: projectContext.trim(),
          depth,
          detail_level: detailLevel,
          expertise_level: expertiseLevel,
          focus: focus.trim() || undefined,
          reference_url: referenceUrl.trim() || undefined,
          reference_url_type: referenceUrl.trim() ? referenceUrlType : undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError("A report is already being generated. Please wait for it to complete.");
        return;
      }
      if (!res.ok) { setError(data.message ?? "Something went wrong. Please try again."); return; }
      setActiveReportId(data.report_id);
      router.push(`/process/${data.report_id}`);
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)] bg-background overflow-hidden">

      {/* Neural mesh */}
      <NeuralCanvas />

      {/* Deep ambient glow — amber top centre */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, oklch(0.78 0.18 75 / 22%) 0%, transparent 65%)",
          animation: "drift1 18s ease-in-out infinite",
        }}
      />
      {/* Violet bottom-right accent */}
      <div
        className="absolute bottom-0 right-0 w-[600px] h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 100% 100%, oklch(0.72 0.2 290 / 22%) 0%, transparent 55%)" }}
      />
      {/* Cyan bottom-left accent */}
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 0% 100%, oklch(0.74 0.14 210 / 16%) 0%, transparent 55%)" }}
      />

      <div className="relative max-w-xl mx-auto px-4 pt-16 pb-24">

        {/* Hero */}
        <div className="text-center mb-12 animate-fade-up">
          {/* Status chip */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-[11px] font-mono tracking-[0.15em] uppercase">
              AI pipeline active
            </span>
          </div>

          <h1
            className="font-serif italic text-foreground mb-5"
            style={{
              fontSize: "clamp(44px, 6vw, 72px)",
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
            }}
          >
            Learn faster.
            <br />
            <em
              style={{
                fontStyle: "normal",
                color: "oklch(0.78 0.18 75)",
                textShadow: "0 0 50px oklch(0.78 0.18 75 / 45%)",
              }}
            >
              Build sooner.
            </em>
          </h1>

          <p className="text-muted-foreground leading-[1.55] max-w-sm mx-auto" style={{ fontSize: "15px" }}>
            Paste any YouTube video, describe your project — get a{" "}
            <span className="text-foreground font-medium">project-specific action plan</span> in under 90 seconds.
          </p>

          {/* Feature pills */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {["Transcript extraction", "AI analysis", "Action plan"].map((label, i) => (
              <span
                key={label}
                className="text-[10px] font-mono tracking-widest text-muted-foreground/70 px-2.5 py-1 rounded border border-border/40 bg-background/60"
              >
                {String(i + 1).padStart(2, "0")} {label.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div
          className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-up relative"
          style={{
            boxShadow: "0 0 0 1px oklch(0.22 0.008 265 / 80%), 0 30px 80px oklch(0 0 0 / 50%), 0 0 80px oklch(0.78 0.18 75 / 8%)",
          }}
        >
          {/* Static top glow line */}
          <div
            className="h-px w-full flex-shrink-0"
            style={{ background: "linear-gradient(90deg, transparent, oklch(0.78 0.18 75 / 70%), transparent)" }}
          />
          {/* Animated scan sweep */}
          <div
            className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
            style={{
              background: "linear-gradient(90deg, transparent, oklch(0.78 0.18 75 / 90%), transparent)",
              animation: "scanCard 2.6s ease-in-out infinite",
            }}
          />

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.14em]">
                YouTube URL
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-background/60 border border-border/60 rounded-lg pl-9 pr-4 py-2.5 text-sm
                             placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2
                             focus:ring-primary/40 focus:border-primary/50 transition-all
                             disabled:opacity-50"
                />
              </div>
            </div>

            {/* Project context */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.14em]">
                What are you building?
              </label>
              <textarea
                placeholder="e.g. A SaaS app for freelancers that tracks invoices and sends automatic reminders..."
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-2.5 text-sm
                           placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2
                           focus:ring-primary/40 focus:border-primary/50 transition-all resize-none
                           disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground/60">
                The more specific you are, the more actionable the output.
              </p>
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.14em]"
            >
              <svg
                width="10" height="10" viewBox="0 0 10 10" fill="none"
                className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : ""}`}
              >
                <path d="M3 2 L7 5 L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Advanced settings
            </button>

            {showAdvanced && (
              <div className="space-y-5 pt-1 border-t border-border/50 animate-fade-in">
                {/* Depth */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.14em]">Analysis depth</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEPTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value} type="button" onClick={() => setDepth(opt.value)} disabled={isSubmitting}
                        className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                          depth === opt.value
                            ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_12px_oklch(0.78_0.18_75/15%)]"
                            : "border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        <div className="font-medium text-xs">{opt.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expertise */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.14em]">Your experience level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPERTISE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value} type="button" onClick={() => setExpertiseLevel(opt.value)} disabled={isSubmitting}
                        className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                          expertiseLevel === opt.value
                            ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_12px_oklch(0.78_0.18_75/15%)]"
                            : "border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        <div className="font-medium text-xs">{opt.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail level */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.14em]">
                    Action plan detail — {DETAIL_OPTIONS[detailLevel - 1]?.desc}
                  </label>
                  <div className="flex gap-1.5">
                    {DETAIL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value} type="button" onClick={() => setDetailLevel(opt.value)} disabled={isSubmitting}
                        className={`flex-1 rounded-lg border py-2 text-sm font-mono font-medium transition-all ${
                          detailLevel === opt.value
                            ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_12px_oklch(0.78_0.18_75/15%)]"
                            : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.14em]">
                    Focus <span className="normal-case tracking-normal opacity-50">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder='e.g. "focus on the architecture decisions"'
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-2.5 text-sm
                               placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2
                               focus:ring-primary/40 focus:border-primary/50 transition-all disabled:opacity-50"
                  />
                </div>

                {/* Reference URL */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.14em]">
                    Reference URL <span className="normal-case tracking-normal opacity-50">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={referenceUrl}
                      onChange={(e) => setReferenceUrl(e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1 bg-background/60 border border-border/60 rounded-lg px-4 py-2.5 text-sm
                                 placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2
                                 focus:ring-primary/40 focus:border-primary/50 transition-all disabled:opacity-50"
                    />
                    <select
                      value={referenceUrlType}
                      onChange={(e) => setReferenceUrlType(e.target.value as RefType)}
                      disabled={isSubmitting || !referenceUrl.trim()}
                      className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-xs text-muted-foreground
                                 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                    >
                      <option value="extra_reading">Extra reading</option>
                      <option value="project_context">My project</option>
                      <option value="style_guide">Style guide</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary text-primary-foreground font-medium py-3 text-sm
                         hover:opacity-90 active:scale-[0.99] transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-card"
              style={{ boxShadow: "0 0 24px oklch(0.78 0.18 75 / 25%)" }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Starting pipeline…
                </span>
              ) : (
                "Generate Action Plan →"
              )}
            </button>
          </form>
        </div>

        {/* Recent reports */}
        {recentReports.length > 0 && (
          <div className="mt-12 animate-fade-up delay-300">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.14em]">
                Recent Reports
              </p>
              <div className="flex-1 h-px bg-border/30" />
            </div>
            <div className="space-y-2">
              {recentReports.map((report, i) => (
                <a
                  key={report.id}
                  href={`/report/${report.id}`}
                  className="group flex items-center justify-between rounded-lg border border-border/40
                             bg-card/40 backdrop-blur-sm px-4 py-3 hover:border-primary/30 hover:bg-card/70
                             transition-all duration-200 animate-fade-up"
                  style={{ animationDelay: `${300 + i * 60}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                      {report.title ?? "Untitled video"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(report.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {report.topicCategory && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground bg-muted/30">
                        {report.topicCategory}
                      </span>
                    )}
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors"
                    >
                      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
