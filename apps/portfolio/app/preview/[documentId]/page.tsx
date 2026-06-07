import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { backendApiUrl } from "@/lib/backend";
import { parsePortfolioContent } from "@/lib/portfolio";
import { LivePortfolioPreview } from "@/components/LivePortfolioPreview";

export const metadata = {
  title: "Private portfolio preview",
  robots: { index: false, follow: false },
};

export default async function PreviewPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  let response: Response;
  try {
    response = await fetch(
      backendApiUrl(`/portfolios/preview/${encodeURIComponent(documentId)}`, true),
      {
        headers: { Cookie: (await cookies()).toString() },
        cache: "no-store",
      },
    );
  } catch {
    return <PreviewUnavailable />;
  }
  if (response.status === 404) notFound();
  if (!response.ok) return <PreviewUnavailable />;
  const payload = await response.json();
  return <LivePortfolioPreview initialContent={parsePortfolioContent(payload.data.content)} />;
}

function PreviewUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-paper)] p-6 text-center">
      <div className="max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-panel)] p-6 shadow-[0_4px_0_var(--color-line-strong)]">
        <h1 className="text-lg font-extrabold">Preview temporarily unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
          We could not load this private preview. Return to the workspace and try again after the
          connection recovers.
        </p>
        <Link
          className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-[var(--color-accent)] px-4 text-xs font-extrabold text-[var(--color-accent-ink)]"
          href="/dashboard"
        >
          Return to workspace
        </Link>
      </div>
    </main>
  );
}
