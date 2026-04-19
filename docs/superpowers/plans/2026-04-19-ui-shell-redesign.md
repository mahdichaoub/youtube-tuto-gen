# UI Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline navbar in `(app)/layout.tsx` with a polished `AppNav` component, add `AppFooter`, and wire both into the app shell — matching the futuristic dark OKLCH design from the reference HTML.

**Architecture:** Extract two focused components (`AppNav`, `AppFooter`) from the existing inline layout. `AppNav` reuses existing `Avatar`, `DropdownMenu`, `useSession`, `signOut`, `useTheme`, and `StreakDisplay`. `AppFooter` is a pure presentational component. The `(app)/layout.tsx` becomes a thin shell.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS v4 (OKLCH tokens already in `globals.css`) · shadcn/ui (`Avatar`, `DropdownMenu`, `Separator`) · `next-themes` · `lucide-react` · `@/lib/auth-client` · `@/contexts/StreakContext`

> **Note:** Fonts (Geist, Geist_Mono, Instrument_Serif) and OKLCH color tokens are **already configured** in `src/app/layout.tsx` and `src/app/globals.css`. No font or Tailwind config changes needed.

---

### Task 1: Create `AppNav` component

**Files:**
- Create: `src/components/app-nav.tsx`

- [ ] **Step 1: Create the file with all imports**

```tsx
// src/components/app-nav.tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Settings, LogOut, Sun, Moon } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession, signOut } from "@/lib/auth-client"
import { StreakDisplay } from "@/contexts/StreakContext"
```

- [ ] **Step 2: Add the nav links config and component shell**

```tsx
const NAV_LINKS = [
  { href: "/home", label: "HOME" },
  { href: "/library", label: "LIBRARY" },
  { href: "/progress", label: "PROGRESS" },
] as const

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut()
    router.replace("/")
    router.refresh()
  }

  const initials = (
    session?.user?.name?.[0] ||
    session?.user?.email?.[0] ||
    "U"
  ).toUpperCase()

  return (
    <header className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-md">
      <nav className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2.5 group" aria-label="LearnAgent home">
          <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_oklch(0.78_0.18_75/40%)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
              <path d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-serif italic text-[1.05rem] text-foreground group-hover:text-primary transition-colors duration-200">
            LearnAgent
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1">

          {/* Nav links */}
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "px-3 py-1.5 rounded-md text-[10.5px] font-mono tracking-widest transition-all duration-150",
                  isActive
                    ? "bg-primary/15 text-primary shadow-[0_0_8px_oklch(0.78_0.18_75/20%)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                ].join(" ")}
              >
                {label}
              </Link>
            )
          })}

          {/* Divider */}
          <div className="w-px h-4 bg-border/60 mx-2" />

          {/* Streak */}
          <StreakDisplay />

          {/* Divider */}
          <div className="w-px h-4 bg-border/60 mx-1" />

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="size-8 cursor-pointer ring-1 ring-border/40 hover:ring-primary/50 transition-all duration-150">
                <AvatarImage
                  src={session?.user?.image || ""}
                  alt={session?.user?.name || "User"}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-mono text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border/40 bg-popover/95 backdrop-blur-md">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground leading-none mt-1">{session?.user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="gap-2 cursor-pointer">
                {theme === "dark"
                  ? <Sun className="h-4 w-4 text-muted-foreground" />
                  : <Moon className="h-4 w-4 text-muted-foreground" />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                <Link href="/settings/models">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </nav>
    </header>
  )
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "c:\Users\Asus\youtube tuto gen" && pnpm typecheck 2>&1 | tail -20
```

Expected: no errors mentioning `app-nav.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/components/app-nav.tsx
git commit -m "feat: add AppNav with active links and avatar dropdown"
```

---

### Task 2: Create `AppFooter` component

**Files:**
- Create: `src/components/app-footer.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/app-footer.tsx
import Link from "next/link"

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const NAV_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/progress", label: "Progress" },
]

export function AppFooter() {
  return (
    <footer className="border-t border-border/20 bg-background py-10">
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">

          {/* Logo + tagline */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-primary flex items-center justify-center shadow-[0_0_10px_oklch(0.78_0.18_75/35%)]">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                  <path d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-serif italic text-sm text-foreground">LearnAgent</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono tracking-wide">Built for builders.</p>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-5" aria-label="Footer navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors uppercase"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Social links */}
          <div className="flex items-center gap-3">
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow on X"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/mahdichaoub/youtube-tuto-gen"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on GitHub"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <GitHubIcon className="w-4 h-4" />
            </a>
          </div>

        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border/10">
          <p className="text-xs text-muted-foreground/50 font-mono">
            © {new Date().getFullYear()} LearnAgent. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "c:\Users\Asus\youtube tuto gen" && pnpm typecheck 2>&1 | tail -20
```

Expected: no errors mentioning `app-footer.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/app-footer.tsx
git commit -m "feat: add AppFooter with nav links and social icons"
```

---

### Task 3: Wire both components into `(app)/layout.tsx`

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Replace the layout**

```tsx
// src/app/(app)/layout.tsx
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
```

- [ ] **Step 2: Run full build to catch any issues**

```bash
cd "c:\Users\Asus\youtube tuto gen" && pnpm build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit and push**

```bash
git add src/app/\(app\)/layout.tsx
git commit -m "feat: wire AppNav and AppFooter into app layout"
git push
```

---

### Task 4: Verify on production

- [ ] **Step 1: Wait for Vercel deploy (~1 min), then check live site**

Visit `https://youtube-tuto-gen.vercel.app/home` and confirm:
- Sticky navbar with logo, HOME / LIBRARY / PROGRESS links, avatar dropdown
- Active link gets amber pill highlight on current page
- Avatar dropdown opens with name, email, theme toggle, settings, sign out
- Footer visible at page bottom with nav links + social icons + copyright

- [ ] **Step 2: Test sign out flow**

Click avatar → Sign out → should redirect to `/` landing page.

- [ ] **Step 3: Test theme toggle**

Click avatar → toggle theme → page switches between dark and light.
