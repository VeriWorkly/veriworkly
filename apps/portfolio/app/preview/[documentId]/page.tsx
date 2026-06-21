import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";
import { parsePortfolioContent } from "@/lib/portfolio";
import { LivePortfolioPreview } from "@/components/LivePortfolioPreview";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ documentId: string }>;
}): Promise<Metadata> {
  const { documentId } = await params;
  try {
    const cookieStore = await cookies();
    const response = await fetch(
      backendApiUrl(`/portfolios/preview/${encodeURIComponent(documentId)}`, true),
      {
        headers: firstPartyServerHeaders({ Cookie: cookieStore.toString() }),
        cache: "no-store",
      },
    );
    if (response.ok) {
      const payload = await response.json();
      const content = parsePortfolioContent(payload.data?.content);
      const name = content.identity.name;
      return {
        title: `${name} | Private Portfolio Preview`,
        description: `Private workspace preview of ${name}'s professional portfolio on VeriWorkly.`,
        robots: { index: false, follow: false },
      };
    }
  } catch {
    // Fail silently
  }
  return {
    title: "Private Portfolio Preview",
    robots: { index: false, follow: false },
  };
}

export default async function PreviewPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  let response: Response;
  try {
    response = await fetch(
      backendApiUrl(`/portfolios/preview/${encodeURIComponent(documentId)}`, true),
      {
        headers: firstPartyServerHeaders({ Cookie: (await cookies()).toString() }),
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
