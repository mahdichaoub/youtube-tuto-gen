import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/session";

export default async function RootPage() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/home");
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                <path d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-serif italic text-[1.1rem] text-foreground">LearnAgent</span>
          </a>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
        {/* Amber glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, oklch(0.78 0.18 75 / 10%) 0%, transparent 65%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-5 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-[11px] font-mono tracking-[0.15em] uppercase">
              Multi-agent AI pipeline
            </span>
          </div>

          <h1 className="font-serif italic text-5xl sm:text-6xl text-foreground leading-[1.1] mb-6">
            From YouTube to
            <br />
            <span className="text-primary">action plan</span> in 90s.
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Paste any tutorial video, describe what you&apos;re building — LearnAgent runs a
            5-agent AI pipeline and returns a project-specific action plan you can start using
            today.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all text-sm"
            >
              Generate my first plan
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 border border-border text-sm text-muted-foreground rounded-lg hover:text-foreground hover:border-foreground/30 transition-all"
            >
              Sign in
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/50 mt-5">
            No credit card required · Free to start
          </p>
        </div>
      </section>

      {/* ── PIPELINE VISUAL ── */}
      <section className="py-12 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-5">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-background/50">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
              <span className="ml-3 text-xs font-mono text-muted-foreground/60">
                learnagent — pipeline
              </span>
            </div>
            <div className="p-6 space-y-3">
              {[
                { icon: "▶", label: "Reading the video", color: "text-primary", done: true },
                { icon: "◎", label: "Analyzing the content", color: "text-primary", done: true },
                { icon: "◉", label: "Researching the topic", color: "text-primary", done: true },
                { icon: "◈", label: "Writing your summary", color: "text-primary", done: true },
                { icon: "◆", label: "Crafting your action plan", color: "text-primary", done: true },
                { icon: "✓", label: "Report ready", color: "text-emerald-400", done: true },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`font-mono text-sm w-4 ${step.color}`}>{step.icon}</span>
                  <span
                    className={`text-sm font-mono ${step.done ? "text-foreground" : "text-muted-foreground/40"}`}
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    {step.label}
                  </span>
                  {step.done && i < 5 && (
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground/40">
                      {["0.8s", "4.2s", "6.1s", "9.3s", "12.7s", ""][i]}
                    </span>
                  )}
                  {i === 5 && (
                    <span className="ml-auto text-[10px] font-mono text-emerald-400/70">done ✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">
              How it works
            </p>
            <h2 className="font-serif italic text-3xl text-foreground">
              Three inputs. One action plan.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Paste a YouTube URL",
                desc: "Any tutorial, lecture, or walkthrough. LearnAgent fetches the transcript automatically.",
              },
              {
                step: "02",
                title: "Describe your project",
                desc: "Tell it what you're currently building. One sentence is enough to anchor every recommendation.",
              },
              {
                step: "03",
                title: "Get your action plan",
                desc: "A structured report with concept summary, key insights, and tasks tied directly to your project.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-[11px] font-mono text-primary/60 mb-3 tracking-[0.1em]">
                  {item.step}
                </div>
                <h3 className="font-medium text-foreground mb-2 text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">
              What you get
            </p>
            <h2 className="font-serif italic text-3xl text-foreground">
              Not a summary. An action plan.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "⬡",
                title: "Project-specific tasks",
                desc: "Every task in Do Today, This Week, and 30-Day Challenge explicitly references your project. Generic tasks are rejected by design.",
              },
              {
                icon: "⬢",
                title: "5-agent AI pipeline",
                desc: "Fetcher → Analyst → Researcher → Teacher → Action. Each agent has a strict output contract. No hallucination chains.",
              },
              {
                icon: "◈",
                title: "Progress tracking",
                desc: "Check off tasks as you complete them. A daily streak keeps you accountable to what you've learned.",
              },
              {
                icon: "◉",
                title: "Share reports",
                desc: "Generate a public link for any report and share it with colleagues or clients — no account needed to view.",
              },
              {
                icon: "▣",
                title: "Research links",
                desc: "The pipeline automatically surfaces relevant documentation and articles to complement the video content.",
              },
              {
                icon: "◆",
                title: "Your library",
                desc: "Every report is saved to your personal library. Search and revisit any video you've processed.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="rounded-xl border border-border/60 bg-card/60 p-5 hover:border-primary/25 hover:bg-card transition-all duration-200 group"
              >
                <div className="text-primary text-lg mb-3 group-hover:scale-110 transition-transform duration-200 inline-block">
                  {feat.icon}
                </div>
                <h3 className="font-medium text-foreground mb-1.5 text-sm">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REPORT PREVIEW ── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">
              Sample output
            </p>
            <h2 className="font-serif italic text-3xl text-foreground">
              What a report looks like
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Report header mock */}
            <div className="border-b border-border/60 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-foreground text-sm mb-2">
                    Building REST APIs with FastAPI — Best Practices
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground bg-muted/50">
                      Backend
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground bg-muted/50">
                      Intermediate
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/50 whitespace-nowrap">
                  generated in 74s
                </span>
              </div>
            </div>

            {/* Action plan preview */}
            <div className="p-5 space-y-5">
              <div>
                <p className="text-[10px] font-mono text-primary uppercase tracking-[0.15em] mb-3">
                  Do Today
                </p>
                <div className="space-y-2">
                  {[
                    "Add Pydantic response models to all existing endpoints in your invoice API to catch serialization errors early",
                    "Replace your current dict returns with FastAPI's JSONResponse using the status_code patterns shown at 12:40",
                    "Add a /health endpoint with DB connectivity check — mirrors the pattern from the video for your PostgreSQL pool",
                  ].map((task, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 mt-0.5 rounded border border-primary/40 bg-primary/8 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{task}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border/40">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em] mb-3">
                  This Week
                </p>
                <div className="space-y-2">
                  {[
                    "Implement the dependency injection pattern for your DB session — reduces boilerplate across all route handlers",
                    "Migrate authentication middleware to FastAPI's Security() with OAuth2PasswordBearer as shown at 28:15",
                    "Write integration tests for your new typed endpoints using pytest + httpx, following the test structure from the video",
                  ].map((task, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 mt-0.5 rounded border border-border/60 flex items-center justify-center flex-shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{task}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground/50 mt-4">
            Every task references both the video content and your specific project.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 border-t border-border/40 relative overflow-hidden">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.78 0.18 75 / 8%) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-xl mx-auto px-5 text-center">
          <h2 className="font-serif italic text-4xl text-foreground mb-5">
            Start learning with purpose.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            Stop watching videos and forgetting everything. Turn every tutorial into a concrete
            plan tied to what you&apos;re building right now.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all text-sm"
          >
            Generate my first plan — it&apos;s free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                <path d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-serif italic text-sm text-muted-foreground">LearnAgent</span>
          </div>
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} LearnAgent. Built for builders.
          </p>
        </div>
      </footer>
    </div>
  );
}
