import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { fetchServerApiData } from "@/lib/server-api";
import { parsePortfolioContent, createDefaultPortfolio } from "@/lib/portfolio";
import { LivePortfolioPreview } from "@/components/LivePortfolioPreview";
import { hasPortfolioAccess } from "@/lib/portfolio-status";

type Params = { params: Promise<{ documentId: string }> };

/** The draft to preview: null when there is none for this user, throws when the API failed. */
function readPreview(documentId: string) {
  return fetchServerApiData<{ content: unknown }>(
    `/portfolios/preview/${encodeURIComponent(documentId)}`,
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { documentId } = await params;
  const robots = { index: false, follow: false };
  if (documentId === "guest") return { title: "Guest Portfolio Preview", robots };

  const preview = await readPreview(documentId).catch(() => null);
  if (!preview) return { title: "Private Portfolio Preview", robots };

  const name = parsePortfolioContent(preview.content).identity.name;
  return {
    title: `${name} | Private Portfolio Preview`,
    description: `Private workspace preview of ${name}'s professional portfolio on VeriWorkly.`,
    robots,
  };
}

export default async function PreviewPage({ params }: Params) {
  const { documentId } = await params;
  if (documentId === "guest") {
    return <LivePortfolioPreview initialContent={createDefaultPortfolio()} canPublish={false} />;
  }

  const [billingData, preview] = await Promise.all([
    fetchServerApiData<{ billing: { canPublish: boolean } }>("/portfolios/me").catch(() => null),
    readPreview(documentId).catch(() => undefined),
  ]);
  if (preview === undefined) return <PreviewUnavailable />;
  if (preview === null) notFound();

  return (
    <LivePortfolioPreview
      initialContent={parsePortfolioContent(preview.content)}
      canPublish={hasPortfolioAccess(billingData?.billing)}
    />
  );
}

function PreviewUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-(--color-paper) p-6 text-center">
      <div className="max-w-sm rounded-(--radius-lg) bg-white p-6 shadow-[0_4px_0_var(--color-line-strong)]">
        <h1 className="text-lg font-extrabold">Preview temporarily unavailable</h1>

        <p className="text-muted mt-2 text-sm leading-6">
          We could not load this private preview. Return to the workspace and try again after the
          connection recovers.
        </p>

        <Link
          href="/dashboard"
          className="bg-accent text-ink mt-5 inline-flex min-h-10 items-center rounded-lg px-4 text-xs font-extrabold"
        >
          Return to workspace
        </Link>
      </div>
    </main>
  );
}
