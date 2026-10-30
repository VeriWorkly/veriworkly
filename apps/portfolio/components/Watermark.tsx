import { siteConfig } from "@/config/site";

/** Where the badge leads, tagged so the main site can count sign-ups that came from a badge. */
export function badgeHref(subdomain?: string) {
  const params = new URLSearchParams({
    ref: "badge",
    utm_source: "portfolio_badge",
    utm_medium: "referral",
  });
  if (subdomain) params.set("utm_content", subdomain);

  return `${siteConfig.links.main}/?${params.toString()}`;
}

// Bottom left and a modest z-index: templates put their own widgets (theme switch, back to top)
// on the right and above ordinary content, and the badge must never cover them.
export function Watermark({ subdomain }: { subdomain?: string }) {
  return (
    <div className="fixed bottom-4 left-4 z-40">
      <a
        href={badgeHref(subdomain)}
        target="_blank"
        rel="noopener"
        aria-label="Built with VeriWorkly (opens in a new tab)"
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-md transition hover:bg-black/80 hover:text-white"
      >
        <span>Built with</span>
        <span className="font-bold tracking-tight text-white">VeriWorkly</span>
      </a>
    </div>
  );
}
