import { redirect } from "next/navigation";

// Handles web+tpt:// protocol handler links from external CAD/RMS systems.
// The protocol_handlers manifest entry maps: web+tpt://cases/abc → /deep-link?q=cases/abc
export default async function DeepLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  if (!q) redirect("/dashboard");

  // Decode and sanitise: strip any leading slashes or the tpt:// scheme
  const path = decodeURIComponent(q)
    .replace(/^web\+tpt:\/\//, "")
    .replace(/^\/+/, "");

  // Allow-list the roots that external systems may link into
  const allowed = ["cases", "dispatch", "persons", "incidents", "alerts"];
  const root = path.split("/")[0];
  if (!allowed.includes(root)) redirect("/dashboard");

  redirect(`/${path}`);
}
