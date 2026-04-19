import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SignInButton } from "@/components/auth/sign-in-button"
import { auth } from "@/lib/auth"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/home")

  const { reset } = await searchParams

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">

        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-6">
            <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_16px_oklch(0.78_0.18_75/50%)]">
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                <path d="M1 10 L3.5 3 L6 8 L8.5 4.5 L11 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-serif italic text-[1.15rem] text-foreground group-hover:text-primary transition-colors duration-200">
              LearnAgent
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm" style={{ color: "oklch(0.5 0.016 265)" }}>Sign in to your account</p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-[18px] overflow-hidden relative"
          style={{
            background: "color-mix(in oklab, oklch(0.085 0.006 265) 80%, transparent)",
            backdropFilter: "blur(20px)",
            border: "1px solid oklch(0.22 0.008 265)",
            boxShadow: "0 30px 80px oklch(0 0 0 / 50%), 0 0 0 1px oklch(0.78 0.18 75 / 8%)",
          }}
        >
          <div className="h-px w-full" style={{
            background: "linear-gradient(90deg, transparent, oklch(0.78 0.18 75 / 60%), transparent)",
          }} />
          <div className="p-7">
            {reset === "success" && (
              <div className="mb-5 rounded-lg px-4 py-3 text-sm" style={{
                border: "1px solid oklch(0.65 0.18 145 / 30%)",
                background: "oklch(0.65 0.18 145 / 8%)",
                color: "oklch(0.75 0.15 145)",
              }}>
                Password reset successfully. Please sign in with your new password.
              </div>
            )}
            <SignInButton />
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "oklch(0.4 0.016 265)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
