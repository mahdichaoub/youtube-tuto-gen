import { StreakProvider, StreakDisplay } from "@/contexts/StreakContext";
import { GenerationProvider, GenerationBanner } from "@/components/GenerationBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StreakProvider>
      <GenerationProvider>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
            <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
              <a href="/home" className="flex items-center gap-2.5 group">
                <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                    <path d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="font-serif italic text-[1.1rem] text-foreground group-hover:text-primary transition-colors duration-200">
                  LearnAgent
                </span>
              </a>

              <nav className="flex items-center gap-0.5">
                <a href="/library" className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
                  Library
                </a>
                <a href="/progress" className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
                  Progress
                </a>
                <div className="w-px h-4 bg-border mx-2" />
                <StreakDisplay />
              </nav>
            </div>
          </header>

          <GenerationBanner />
          <main>{children}</main>
        </div>
      </GenerationProvider>
    </StreakProvider>
  );
}
