import { siteConfig } from "@/config/site";

// Shown on a subdomain that is unknown, unpublished or suspended. Every subdomain path is
// rewritten to its portfolio, so relative links here would land on this page again: they must be
// absolute and point at the platform (P-060).
export default function PublishedNotFound() {
  const action = "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold";

  return (
    <main className="bg-paper text-ink flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-muted text-sm font-semibold">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">There is no portfolio here</h1>
        <p className="text-muted mt-4 text-sm leading-relaxed">
          This address is not in use right now. The site may have been unpublished, or the link may
          have a typo.
        </p>
        <p className="mt-6 text-sm font-semibold">This name may be available.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a
            className={`${action} bg-accent text-white`}
            href={`${siteConfig.links.portfolio}/settings`}
          >
            Claim it
          </a>
          <a className={`${action} border-line border`} href={siteConfig.links.portfolio}>
            Go to VeriWorkly Portfolio
          </a>
        </div>
      </div>
    </main>
  );
}
