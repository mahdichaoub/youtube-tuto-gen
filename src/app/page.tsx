import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/session";
import LandingPage from "@/components/landing/LandingPage";

export default async function RootPage() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/home");
  }

  return <LandingPage />;
}
