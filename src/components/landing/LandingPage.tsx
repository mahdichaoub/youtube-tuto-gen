"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ── Scroll-reveal hook ─────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".scroll-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── Animated terminal ──────────────────────────────────────── */
function PipelineTerminal() {
  const steps = [
    { label: "Reading the video", time: "0.8s", done: true },
    { label: "Analyzing the content", time: "4.2s", done: true },
    { label: "Researching the topic", time: "6.1s", done: true },
    { label: "Writing your summary", time: "9.3s", done: true },
    { label: "Crafting your action plan", time: "12.7s", done: true },
    { label: "Report ready", time: "", done: true, success: true },
  ];

  const [visible, setVisible] = useState<number[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          steps.forEach((_, i) => {
            setTimeout(() => setVisible((v) => [...v, i]), i * 320 + 200);
          });
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-border bg-card overflow-hidden animate-border-glow"
    >
      {/* Terminal top bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 bg-background/50">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        <span className="ml-3 text-[11px] font-mono text-muted-foreground/50">
          learnagent — pipeline
        </span>
      </div>

      <div className="p-6 space-y-3 min-h-[200px]">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 transition-all duration-500"
            style={{
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i) ? "translateX(0)" : "translateX(-12px)",
              transitionDelay: `${i * 40}ms`,
            }}
          >
            <span
              className={`font-mono text-sm w-5 flex-shrink-0 ${
                step.success ? "text-emerald-400" : "text-primary"
              }`}
            >
              {step.success ? "✓" : "▶"}
            </span>
            <span
              className={`text-sm font-mono flex-1 ${
                step.success ? "text-emerald-400" : "text-foreground/90"
              }`}
            >
              {step.label}
            </span>
            {step.time && (
              <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums">
                {step.time}
              </span>
            )}
            {step.success && (
              <span className="text-[10px] font-mono text-emerald-400/60">done ✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Animated stat counter ──────────────────────────────────── */
function StatCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = target / 40;
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 30);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}
      {suffix}
    </span>
  );
}

/* ── Feature card ───────────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  desc,
  delay = 0,
}: {
  icon: string;
  title: string;
  desc: string;
  delay?: number;
}) {
  return (
    <div
      className="scroll-reveal rounded-xl border border-border/60 bg-card/60 p-5
                 hover:border-primary/30 hover:bg-card hover:-translate-y-1
                 transition-all duration-300 group cursor-default"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-primary text-lg mb-3 group-hover:scale-110 transition-transform duration-300 inline-block">
        {icon}
      </div>
      <h3 className="font-medium text-foreground mb-1.5 text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function LandingPage() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group animate-fade-in">
            <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                <path d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-serif italic text-[1.1rem] text-foreground group-hover:text-primary transition-colors duration-200">
              LearnAgent
            </span>
          </a>
          <div className="flex items-center gap-2 animate-fade-in delay-150">
            <Link href="/login" className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg
                         hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, oklch(0.78 0.18 75 / 12%) 0%, transparent 60%)",
          }}
        />

        {/* Floating orbs */}
        <div
          className="absolute top-20 left-[8%] w-24 h-24 rounded-full pointer-events-none animate-float-slow"
          style={{
            background: "radial-gradient(circle, oklch(0.78 0.18 75 / 6%) 0%, transparent 70%)",
            animationDelay: "0s",
          }}
        />
        <div
          className="absolute top-32 right-[10%] w-16 h-16 rounded-full pointer-events-none animate-float"
          style={{
            background: "radial-gradient(circle, oklch(0.78 0.18 75 / 4%) 0%, transparent 70%)",
            animationDelay: "2s",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-5 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 mb-8 animate-fade-up">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping-amber absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="text-primary text-[11px] font-mono tracking-[0.15em] uppercase">
              Multi-agent AI pipeline
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-serif italic text-5xl sm:text-6xl text-foreground leading-[1.1] mb-6 animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            From YouTube to
            <br />
            <span className="text-primary">action plan</span> in 90s.
          </h1>

          {/* Sub */}
          <p
            className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto mb-10 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            Paste any tutorial video, describe what you&apos;re building — LearnAgent runs a
            5-agent AI pipeline and returns a project-specific action plan you can start using
            today.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground
                         font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all text-sm
                         shadow-lg shadow-primary/20"
            >
              Generate my first plan
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="group-hover:translate-x-1 transition-transform duration-200"
              >
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 border border-border text-sm
                         text-muted-foreground rounded-lg hover:text-foreground hover:border-foreground/30
                         hover:bg-accent transition-all"
            >
              Sign in
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/40 mt-5 animate-fade-up" style={{ animationDelay: "400ms" }}>
            No credit card required · Free to start
          </p>
        </div>
      </section>

      {/* ── PIPELINE TERMINAL ── */}
      <section className="py-12 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-5">
          <div className="scroll-reveal">
            <PipelineTerminal />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-14 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-5">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: 90, suffix: "s", label: "average pipeline time" },
              { value: 5, suffix: "", label: "AI agents working in series" },
              { value: 6, suffix: "", label: "structured report sections" },
            ].map((stat, i) => (
              <div
                key={i}
                className="scroll-reveal"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="font-serif italic text-4xl text-primary mb-1">
                  <StatCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-14 scroll-reveal">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">
              How it works
            </p>
            <h2 className="font-serif italic text-3xl text-foreground">
              Three inputs. One action plan.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
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
            ].map((item, i) => (
              <div
                key={item.step}
                className="scroll-reveal group"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div
                  className="text-[11px] font-mono text-primary/60 mb-3 tracking-[0.1em] group-hover:text-primary transition-colors duration-300"
                >
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
          <div className="text-center mb-14 scroll-reveal">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">
              What you get
            </p>
            <h2 className="font-serif italic text-3xl text-foreground">
              Not a summary. An action plan.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FeatureCard delay={0}   icon="⬡" title="Project-specific tasks"   desc="Every task in Do Today, This Week, and 30-Day Challenge explicitly references your project. Generic tasks are rejected by design." />
            <FeatureCard delay={80}  icon="⬢" title="5-agent AI pipeline"      desc="Fetcher → Analyst → Researcher → Teacher → Action. Each agent has a strict output contract. No hallucination chains." />
            <FeatureCard delay={160} icon="◈" title="Progress tracking"        desc="Check off tasks as you complete them. A daily streak keeps you accountable to what you've learned." />
            <FeatureCard delay={240} icon="◉" title="Share reports"            desc="Generate a public link for any report and share it with colleagues — no account needed to view." />
            <FeatureCard delay={320} icon="▣" title="Research links"           desc="The pipeline automatically surfaces relevant documentation and articles to complement the video content." />
            <FeatureCard delay={400} icon="◆" title="Your library"             desc="Every report is saved to your personal library. Search and revisit any video you've processed." />
          </div>
        </div>
      </section>

      {/* ── REPORT PREVIEW ── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12 scroll-reveal">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">
              Sample output
            </p>
            <h2 className="font-serif italic text-3xl text-foreground">
              What a report looks like
            </h2>
          </div>

          <div className="scroll-reveal rounded-xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors duration-500">
            <div className="border-b border-border/60 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-foreground text-sm mb-2">
                    Building REST APIs with FastAPI — Best Practices
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground bg-muted/50">Backend</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground bg-muted/50">Intermediate</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/50 whitespace-nowrap">generated in 74s</span>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <TaskGroup
                label="Do Today"
                labelColor="text-primary"
                tasks={[
                  "Add Pydantic response models to all existing endpoints in your invoice API to catch serialization errors early",
                  "Replace your current dict returns with FastAPI's JSONResponse using the status_code patterns shown at 12:40",
                  "Add a /health endpoint with DB connectivity check — mirrors the pattern from the video for your PostgreSQL pool",
                ]}
                checked
              />
              <div className="pt-2 border-t border-border/40">
                <TaskGroup
                  label="This Week"
                  labelColor="text-muted-foreground"
                  tasks={[
                    "Implement the dependency injection pattern for your DB session — reduces boilerplate across all route handlers",
                    "Migrate authentication middleware to FastAPI's Security() with OAuth2PasswordBearer as shown at 28:15",
                    "Write integration tests for your new typed endpoints using pytest + httpx, following the test structure from the video",
                  ]}
                  checked={false}
                />
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground/40 mt-4 scroll-reveal">
            Every task references both the video content and your specific project.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 border-t border-border/40 relative overflow-hidden">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 100%, oklch(0.78 0.18 75 / 10%) 0%, transparent 65%)",
          }}
        />
        <div className="relative max-w-xl mx-auto px-5 text-center scroll-reveal">
          <h2 className="font-serif italic text-4xl text-foreground mb-5">
            Start learning with purpose.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            Stop watching videos and forgetting everything. Turn every tutorial into a concrete
            plan tied to what you&apos;re building right now.
          </p>
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground
                       font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all text-sm
                       shadow-xl shadow-primary/25"
          >
            Generate my first plan — it&apos;s free
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="group-hover:translate-x-1 transition-transform duration-200"
            >
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

/* ── Task group helper ──────────────────────────────────────── */
function TaskGroup({
  label,
  labelColor,
  tasks,
  checked,
}: {
  label: string;
  labelColor: string;
  tasks: string[];
  checked: boolean;
}) {
  return (
    <div>
      <p className={`text-[10px] font-mono uppercase tracking-[0.15em] mb-3 ${labelColor}`}>
        {label}
      </p>
      <div className="space-y-2">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-start gap-2.5 group/task">
            <div
              className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                checked
                  ? "border-primary/40 bg-primary/8"
                  : "border-border/60 group-hover/task:border-border"
              }`}
            >
              {checked && <div className="w-1.5 h-1.5 rounded-sm bg-primary" />}
            </div>
            <p className={`text-xs leading-relaxed ${checked ? "text-foreground/80" : "text-muted-foreground"}`}>
              {task}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
