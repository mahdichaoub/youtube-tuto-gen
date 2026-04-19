import Link from "next/link";

export function SiteHeader() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md"
      >
        Skip to main content
      </a>
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md" role="banner">
        <nav
          className="max-w-5xl mx-auto px-5 h-14 flex items-center"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="LearnAgent — go to homepage"
          >
            <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                <path
                  d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-serif italic text-[1.05rem] text-foreground group-hover:text-primary transition-colors duration-200">
              LearnAgent
            </span>
          </Link>
        </nav>
      </header>
    </>
  );
}
