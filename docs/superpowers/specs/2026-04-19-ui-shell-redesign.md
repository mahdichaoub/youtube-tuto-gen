# UI Shell Redesign — AppNav + AppFooter + Visual Polish

**Date:** 2026-04-19  
**Status:** Approved

---

## Goal

Replace the inline navbar in `(app)/layout.tsx` with a dedicated `AppNav` component, add an `AppFooter`, and apply a futuristic dark design system matching the reference HTML (dark OKLCH palette, Instrument Serif + Geist + Geist Mono, glowing accents, glassmorphism).

---

## Approach

**B — Extract dedicated components.** Keep `(app)/layout.tsx` as a thin orchestrator. Two new focused files: `AppNav` and `AppFooter`.

---

## Design System

| Token | Value |
|-------|-------|
| Background | `oklch(0.085 0.006 265)` |
| Foreground | `oklch(0.94 0.008 90)` |
| Muted | `oklch(0.5 0.016 265)` |
| Border | `oklch(0.22 0.008 265)` |
| Primary (amber) | `oklch(0.78 0.18 75)` |
| Violet accent | `oklch(0.72 0.2 290)` |
| Cyan accent | `oklch(0.74 0.14 210)` |

**Fonts:** Instrument Serif (serif italic wordmarks) · Geist (body) · Geist Mono (labels, chips, badges) — loaded via `next/font/google`.

---

## AppNav (`src/components/app-nav.tsx`)

- Sticky, `z-50`, `bg-background/80 backdrop-blur-md`, `border-b border-border/20`
- **Left:** Waveform SVG icon + "LearnAgent" in Instrument Serif italic
- **Center-left:** `Home` · `Library` · `Progress` links — Geist Mono `10.5px` uppercase. Active route gets amber pill background + glow
- **Right:** `StreakDisplay` → divider → Avatar `DropdownMenu`
  - Trigger: shadcn `Avatar` with user initials fallback
  - Header: user name + email (non-clickable)
  - `Separator`
  - Toggle theme (sun/moon icon)
  - Settings → `/settings/models`
  - `Separator`
  - Sign out (calls `signOut()` from auth-client)

Uses `usePathname` for active link detection. Client component (`"use client"`).

---

## AppFooter (`src/components/app-footer.tsx`)

- `border-t border-border/20`, dark bg, `py-10`
- Three-column layout (stacks on mobile):
  - **Left:** Logo + "Built for builders." tagline in muted serif
  - **Center:** Nav links — Home, Library, Progress (Geist Mono, muted)
  - **Right:** Social icons — Twitter/X and GitHub (icon-only links, hover glow)
- Copyright line below: `© 2026 LearnAgent`

---

## Layout Changes (`(app)/layout.tsx`)

- Remove all inline `<header>` markup
- Import and render `<AppNav />` and `<AppFooter />`
- Wrap `<main>` + `<AppFooter />` so footer sits below content

---

## Font Setup (`src/app/layout.tsx`)

- Add `Instrument_Serif`, `Geist`, `Geist_Mono` via `next/font/google`
- Pass as CSS variables: `--font-serif`, `--font-sans`, `--font-mono`
- Add variables to `tailwind.config` font families

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/components/app-nav.tsx` | Create |
| `src/components/app-footer.tsx` | Create |
| `src/app/(app)/layout.tsx` | Modify — replace inline header |
| `src/app/layout.tsx` | Modify — add fonts |
| `tailwind.config.ts` | Modify — add font + OKLCH color tokens |

---

## Out of Scope

- Redesigning individual page content (home, library, progress, report)
- Mobile hamburger menu
- Notification system
