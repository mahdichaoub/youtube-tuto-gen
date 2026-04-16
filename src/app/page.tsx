import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getOptionalSession } from "@/lib/session";

export default async function RootPage() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/home");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Learn faster. Build sooner.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Paste any YouTube tutorial and describe what you&apos;re building.
            Get a project-specific action plan in under 90 seconds.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Create an account</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Any YouTube video</p>
            <p className="text-sm text-muted-foreground">
              Paste a link to any tutorial and we extract the key insights automatically.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Tied to your project</p>
            <p className="text-sm text-muted-foreground">
              Describe what you&apos;re building and every action item is tailored to your work.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Ready in 90 seconds</p>
            <p className="text-sm text-muted-foreground">
              A complete report with concept summary, insights, and action plan — fast.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
