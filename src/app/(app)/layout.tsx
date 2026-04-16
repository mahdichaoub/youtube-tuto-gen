import { StreakProvider, StreakDisplay } from "@/contexts/StreakContext";
import { GenerationProvider, GenerationBanner } from "@/components/GenerationBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StreakProvider>
      <GenerationProvider>
        <div className="min-h-screen bg-background">
          <header className="border-b bg-card">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/home" className="text-sm font-semibold tracking-tight hover:opacity-80">
                LearnAgent
              </a>
              <StreakDisplay />
            </div>
          </header>
          <GenerationBanner />
          <main>{children}</main>
        </div>
      </GenerationProvider>
    </StreakProvider>
  );
}
