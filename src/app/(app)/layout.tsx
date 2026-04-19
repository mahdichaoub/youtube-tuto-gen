import { StreakProvider } from "@/contexts/StreakContext"
import { GenerationProvider, GenerationBanner } from "@/components/GenerationBanner"
import { AppNav } from "@/components/app-nav"
import { AppFooter } from "@/components/app-footer"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StreakProvider>
      <GenerationProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <AppNav />
          <GenerationBanner />
          <main className="flex-1">{children}</main>
          <AppFooter />
        </div>
      </GenerationProvider>
    </StreakProvider>
  )
}
