export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 py-6">
      <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-primary flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
              <path
                d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-serif italic text-sm text-muted-foreground">LearnAgent</span>
        </div>
        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} LearnAgent. Built for builders.
        </p>
      </div>
    </footer>
  );
}
