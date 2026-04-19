import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "LearnAgent",
    template: "%s | LearnAgent",
  },
  description:
    "Submit a YouTube URL + what you're building — get a project-specific action plan in under 90 seconds.",
  keywords: ["YouTube", "learning", "action plan", "AI", "productivity", "developer tools"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "LearnAgent",
    title: "LearnAgent",
    description:
      "Submit a YouTube URL + what you're building — get a project-specific action plan in under 90 seconds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LearnAgent",
    description:
      "Submit a YouTube URL + what you're building — get a project-specific action plan in under 90 seconds.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <main id="main-content">{children}</main>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
