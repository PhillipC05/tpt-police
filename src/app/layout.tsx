import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { validateSecretsOnStartup } from "@/lib/secrets";
import "./globals.css";

// Validate required secrets on startup (non-blocking warning in dev)
if (typeof globalThis !== "undefined" && process.env.NODE_ENV === "production") {
  validateSecretsOnStartup();
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TPT Police — National Law Enforcement Platform",
  description: "Comprehensive police department management system",
  manifest: "/manifest.json",
  themeColor: "#1e293b",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TPT Police" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
