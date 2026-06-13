import type { Metadata } from "next";
import Link from "next/link";
import { PublicServiceWorkerRegistration } from "@/components/pwa/public-service-worker-registration";

export const metadata: Metadata = {
  title: "TPT Police — Community Portal",
  description: "Submit tips, file complaints, commend officers, and connect with your local police.",
  manifest: "/public-manifest.json",
  themeColor: "#2563eb",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TPT Community" },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicServiceWorkerRegistration />
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/public" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="text-primary">TPT Police</span>
            <span className="text-muted-foreground font-normal text-sm">Community Portal</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/public/tips" className="hover:text-primary transition-colors">Submit a Tip</Link>
            <Link href="/public/complaints" className="hover:text-primary transition-colors">File a Complaint</Link>
            <Link href="/public/track" className="hover:text-primary transition-colors">Track Status</Link>
            <Link href="/public/alerts" className="hover:text-primary transition-colors">Alerts</Link>
            <Link href="/crime-map" className="hover:text-primary transition-colors">Crime Map</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t bg-card mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>If this is an emergency, call 111 immediately.</p>
          <p className="mt-1">This portal is for non-emergency submissions only.</p>
        </div>
      </footer>
    </div>
  );
}