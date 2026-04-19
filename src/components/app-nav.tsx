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

const NAV_LINKS = [
  { href: "/", label: "HOME" },
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

        {/* Center nav links */}
        <div className="flex items-center gap-1">
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
        </div>

        {/* Right side — streak + avatar only */}
        <div className="flex items-center gap-2">

          {/* Streak */}
          <StreakDisplay />

          {/* Divider */}
          <div className="w-px h-4 bg-border/60" />

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild aria-label="Open user menu">
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
