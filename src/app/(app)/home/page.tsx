"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGeneration } from "@/components/GenerationBanner";
import { NeuralMeshBg } from "@/components/neural-mesh-bg";

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


/* ─────────── Page ─────────── */
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
    <div className="relative min-h-[calc(100vh-56px)] overflow-hidden" style={{ background: "oklch(0.085 0.006 265)" }}>

      <NeuralMeshBg />

      <div className="relative z-10 max-w-xl mx-auto px-4 pt-16 pb-24">

        {/* Hero */}
        <div className="text-center mb-10 animate-fade-up">

          {/* Status tag */}
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 mb-7" style={{
            border: "1px solid color-mix(in oklab, oklch(0.78 0.18 75) 30%, transparent)",
            background: "color-mix(in oklab, oklch(0.78 0.18 75) 10%, transparent)",
          }}>
            <span className="w-[5px] h-[5px] rounded-full bg-primary" style={{ animation: "p 1.5s ease-in-out infinite" }} />
            <span className="text-primary font-mono tracking-[0.14em] uppercase" style={{ fontSize: "10.5px" }}>
              AI pipeline active
            </span>
          </div>

          <h1
            className="font-serif italic text-foreground mb-5"
            style={{ fontSize: "clamp(44px, 6vw, 72px)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
          >
            Learn faster.
            <br />
            <em style={{ fontStyle: "normal", color: "oklch(0.78 0.18 75)", textShadow: "0 0 50px oklch(0.78 0.18 75 / 50%)" }}>
              Build sooner.
            </em>
          </h1>

          <p style={{ fontSize: "15px", lineHeight: 1.55, color: "oklch(0.5 0.016 265)", maxWidth: "480px", margin: "0 auto" }}>
            Paste any YouTube video, describe your project — get a{" "}
            <span style={{ color: "oklch(0.94 0.008 90)" }}>project-specific action plan</span> in under 90 seconds.
          </p>

          {/* Numbered feature chips */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {["Transcript extraction", "AI analysis", "Action plan"].map((label, i) => (
              <span key={label} style={{
                fontSize: "10.5px", fontFamily: "var(--font-mono)", letterSpacing: "0.12em",
                padding: "3px 10px", borderRadius: "5px",
                background: "oklch(0 0 0 / 50%)", backdropFilter: "blur(8px)",
                border: "1px solid color-mix(in oklab, oklch(0.94 0.008 90) 14%, transparent)",
                color: "oklch(0.7 0.016 265)",
              }}>
                {String(i + 1).padStart(2, "0")} {label.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div
          className="rounded-[18px] overflow-hidden animate-fade-up relative"
          style={{
            background: "color-mix(in oklab, oklch(0.085 0.006 265) 85%, transparent)",
            backdropFilter: "blur(16px)",
            border: "1px solid oklch(0.22 0.008 265)",
            boxShadow: "0 30px 80px oklch(0 0 0 / 50%), 0 0 0 1px oklch(0.78 0.18 75 / 8%)",
          }}
        >
          {/* Top glow line */}
          <div className="h-px w-full" style={{
            background: "linear-gradient(90deg, transparent, oklch(0.78 0.18 75 / 70%), transparent)",
          }} />

          {/* Animated scan sweep */}
          <div className="absolute left-0 right-0 h-[2px] pointer-events-none z-10" style={{
            background: "linear-gradient(90deg, transparent, oklch(0.78 0.18 75 / 85%), transparent)",
            animation: "scanCard 2.6s ease-in-out infinite",
          }} />

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "oklch(0.5 0.016 265)" }}>
                YouTube URL
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.4 0.016 265)" }}>
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
                  className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm transition-all disabled:opacity-50 focus:outline-none"
                  style={{
                    background: "oklch(0.1 0.008 265)", border: "1px solid oklch(0.22 0.008 265)",
                    color: "oklch(0.94 0.008 90)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "oklch(0.78 0.18 75 / 50%)")}
                  onBlur={e => (e.target.style.borderColor = "oklch(0.22 0.008 265)")}
                />
              </div>
            </div>

            {/* Project context */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "oklch(0.5 0.016 265)" }}>
                What are you building?
              </label>
              <textarea
                placeholder="e.g. A SaaS app for freelancers that tracks invoices and sends automatic reminders..."
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full rounded-lg px-4 py-2.5 text-sm transition-all resize-none disabled:opacity-50 focus:outline-none"
                style={{
                  background: "oklch(0.1 0.008 265)", border: "1px solid oklch(0.22 0.008 265)",
                  color: "oklch(0.94 0.008 90)",
                }}
                onFocus={e => (e.target.style.borderColor = "oklch(0.78 0.18 75 / 50%)")}
                onBlur={e => (e.target.style.borderColor = "oklch(0.22 0.008 265)")}
              />
              <p className="text-[11px] font-mono" style={{ color: "oklch(0.4 0.016 265)" }}>
                The more specific you are, the more actionable the output.
              </p>
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] transition-colors"
              style={{ color: "oklch(0.5 0.016 265)" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : ""}`}>
                <path d="M3 2 L7 5 L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Advanced settings
            </button>

            {showAdvanced && (
              <div className="space-y-5 pt-1 animate-fade-in" style={{ borderTop: "1px solid oklch(0.22 0.008 265)" }}>

                {/* Depth */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "oklch(0.5 0.016 265)" }}>
                    Analysis depth
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEPTH_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setDepth(opt.value)} disabled={isSubmitting}
                        className="rounded-lg px-3 py-2.5 text-left text-sm transition-all"
                        style={depth === opt.value ? {
                          border: "1px solid oklch(0.78 0.18 75 / 60%)",
                          background: "oklch(0.78 0.18 75 / 10%)",
                          color: "oklch(0.78 0.18 75)",
                          boxShadow: "0 0 12px oklch(0.78 0.18 75 / 15%)",
                        } : {
                          border: "1px solid oklch(0.22 0.008 265)",
                          background: "oklch(0.1 0.008 265)",
                          color: "oklch(0.5 0.016 265)",
                        }}>
                        <div className="font-medium text-xs">{opt.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expertise */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "oklch(0.5 0.016 265)" }}>
                    Your experience level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPERTISE_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setExpertiseLevel(opt.value)} disabled={isSubmitting}
                        className="rounded-lg px-3 py-2.5 text-left text-sm transition-all"
                        style={expertiseLevel === opt.value ? {
                          border: "1px solid oklch(0.78 0.18 75 / 60%)",
                          background: "oklch(0.78 0.18 75 / 10%)",
                          color: "oklch(0.78 0.18 75)",
                          boxShadow: "0 0 12px oklch(0.78 0.18 75 / 15%)",
                        } : {
                          border: "1px solid oklch(0.22 0.008 265)",
                          background: "oklch(0.1 0.008 265)",
                          color: "oklch(0.5 0.016 265)",
                        }}>
                        <div className="font-medium text-xs">{opt.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail level */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "oklch(0.5 0.016 265)" }}>
                    Action plan detail — {DETAIL_OPTIONS[detailLevel - 1]?.desc}
                  </label>
                  <div className="flex gap-1.5">
                    {DETAIL_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setDetailLevel(opt.value)} disabled={isSubmitting}
                        className="flex-1 rounded-lg py-2 text-sm font-mono font-medium transition-all"
                        style={detailLevel === opt.value ? {
                          border: "1px solid oklch(0.78 0.18 75 / 60%)",
                          background: "oklch(0.78 0.18 75 / 10%)",
                          color: "oklch(0.78 0.18 75)",
                        } : {
                          border: "1px solid oklch(0.22 0.008 265)",
                          background: "oklch(0.1 0.008 265)",
                          color: "oklch(0.5 0.016 265)",
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "oklch(0.5 0.016 265)" }}>
                    Focus <span className="normal-case tracking-normal opacity-50">(optional)</span>
                  </label>
                  <input type="text" placeholder='e.g. "focus on the architecture decisions"'
                    value={focus} onChange={(e) => setFocus(e.target.value)} disabled={isSubmitting}
                    className="w-full rounded-lg px-4 py-2.5 text-sm transition-all disabled:opacity-50 focus:outline-none"
                    style={{ background: "oklch(0.1 0.008 265)", border: "1px solid oklch(0.22 0.008 265)", color: "oklch(0.94 0.008 90)" }}
                    onFocus={e => (e.target.style.borderColor = "oklch(0.78 0.18 75 / 50%)")}
                    onBlur={e => (e.target.style.borderColor = "oklch(0.22 0.008 265)")}
                  />
                </div>

                {/* Reference URL */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "oklch(0.5 0.016 265)" }}>
                    Reference URL <span className="normal-case tracking-normal opacity-50">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input type="url" placeholder="https://..." value={referenceUrl}
                      onChange={(e) => setReferenceUrl(e.target.value)} disabled={isSubmitting}
                      className="flex-1 rounded-lg px-4 py-2.5 text-sm transition-all disabled:opacity-50 focus:outline-none"
                      style={{ background: "oklch(0.1 0.008 265)", border: "1px solid oklch(0.22 0.008 265)", color: "oklch(0.94 0.008 90)" }}
                      onFocus={e => (e.target.style.borderColor = "oklch(0.78 0.18 75 / 50%)")}
                      onBlur={e => (e.target.style.borderColor = "oklch(0.22 0.008 265)")}
                    />
                    <select value={referenceUrlType} onChange={(e) => setReferenceUrlType(e.target.value as RefType)}
                      disabled={isSubmitting || !referenceUrl.trim()}
                      className="rounded-lg px-3 py-2.5 text-xs focus:outline-none disabled:opacity-50"
                      style={{ background: "oklch(0.1 0.008 265)", border: "1px solid oklch(0.22 0.008 265)", color: "oklch(0.5 0.016 265)" }}>
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
              <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm" style={{
                border: "1px solid oklch(0.55 0.22 25 / 30%)", background: "oklch(0.55 0.22 25 / 10%)",
                color: "oklch(0.7 0.2 25)",
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={isSubmitting}
              className="w-full rounded-lg font-medium py-3 text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              style={{
                background: "oklch(0.78 0.18 75)",
                color: "oklch(0.12 0.01 75)",
                boxShadow: "0 0 28px oklch(0.78 0.18 75 / 30%)",
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Starting pipeline…
                </span>
              ) : "Generate Action Plan →"}
            </button>
          </form>
        </div>

        {/* Recent reports */}
        {recentReports.length > 0 && (
          <div className="mt-12 animate-fade-up delay-300">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "oklch(0.4 0.016 265)" }}>
                Recent Reports
              </p>
              <div className="flex-1 h-px" style={{ background: "oklch(0.22 0.008 265)" }} />
            </div>
            <div className="space-y-2">
              {recentReports.map((report, i) => (
                <a key={report.id} href={`/report/${report.id}`}
                  className="group flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 animate-fade-up"
                  style={{
                    border: "1px solid oklch(0.22 0.008 265)",
                    background: "oklch(0.1 0.008 265 / 60%)",
                    animationDelay: `${300 + i * 60}ms`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.78 0.18 75 / 30%)";
                    (e.currentTarget as HTMLElement).style.background = "oklch(0.12 0.01 265 / 80%)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.22 0.008 265)";
                    (e.currentTarget as HTMLElement).style.background = "oklch(0.1 0.008 265 / 60%)";
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug line-clamp-1 transition-colors" style={{ color: "oklch(0.94 0.008 90)" }}>
                      {report.title ?? "Untitled video"}
                    </p>
                    <p className="text-[11px] mt-0.5 font-mono" style={{ color: "oklch(0.4 0.016 265)" }}>
                      {new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {report.topicCategory && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{
                        border: "1px solid oklch(0.22 0.008 265)", color: "oklch(0.4 0.016 265)",
                        background: "oklch(0.12 0.008 265)",
                      }}>
                        {report.topicCategory}
                      </span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "oklch(0.4 0.016 265)" }}>
                      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
