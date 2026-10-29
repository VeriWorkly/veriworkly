import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { fetchServerApiResult } from "@/lib/server-api";
import { isAmbassadorProgramEnabled } from "@/lib/feature-flags";
import type { AmbassadorStatus, ApplyViewer } from "@/features/ambassador/types";
import AmbassadorApplyNav from "@/features/ambassador/AmbassadorApplyNav";
import AmbassadorApplyExperience from "@/features/ambassador/AmbassadorApplyExperience";
import {
  AmbassadorAlreadyAcceptedCard,
  AmbassadorComingSoonCard,
  AmbassadorPendingCard,
  AmbassadorUnavailableCard,
} from "@/features/ambassador/AmbassadorStatusCard";
import "../ambassador.css";
import { MotionIsland } from "@/providers/motion-island";

const pageUrl = `${siteConfig.url}/ambassador/apply`;

const loginUrl = `${siteConfig.links.app}/login?callbackURL=${encodeURIComponent(pageUrl)}`;

/** Never prerender: with the flag off, a build would bake "applications open soon" into a page a runtime env flip never undoes. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply - Campus Ambassador Program | VeriWorkly",
  description:
    "Seven quick, fun questions and you're in the running to become a VeriWorkly Campus Ambassador.",
  alternates: { canonical: pageUrl },
  robots: { index: false, follow: true },
};

const GUEST_VIEWER: ApplyViewer = {
  isAuthenticated: false,
  viewerKey: null,
  name: null,
  draft: null,
  reviewNote: null,
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MotionIsland>
      <div className="ambassador-bg-noise relative min-h-screen pb-24">
        <AmbassadorApplyNav />
        <main className="px-6 pt-16 sm:pt-20">{children}</main>
      </div>
    </MotionIsland>
  );
}

export default async function AmbassadorApplyPage() {
  // Checked first: the backend answers 503 when the flag is off, and reading that as "logged out" caused a login redirect loop.
  if (!isAmbassadorProgramEnabled()) {
    return (
      <Shell>
        <AmbassadorComingSoonCard />
      </Shell>
    );
  }

  const result = await fetchServerApiResult<AmbassadorStatus>("/ambassador/me");

  // Backend down, timed out, or flagged off server-side. Show a retry, never a redirect.
  if (!result.ok && result.reason === "unavailable") {
    return (
      <Shell>
        <AmbassadorUnavailableCard />
      </Shell>
    );
  }

  // No session (or a stale one): the form parks the draft and signs them in at submit time.
  if (!result.ok) {
    return (
      <Shell>
        <AmbassadorApplyExperience viewer={GUEST_VIEWER} loginUrl={loginUrl} />
      </Shell>
    );
  }

  const status = result.data;
  const application = status.application;

  if (status.role === "AMBASSADOR") {
    return (
      <Shell>
        <AmbassadorAlreadyAcceptedCard />
      </Shell>
    );
  }

  if (status.ambassadorStatus === "PENDING") {
    return (
      <Shell>
        <AmbassadorPendingCard />
      </Shell>
    );
  }

  const viewer: ApplyViewer = {
    isAuthenticated: true,
    viewerKey: status.email?.toLowerCase() ?? null,
    name: status.name,
    // Prefill from the account, plus previous answers when re-applying after a rejection.
    draft: {
      collegeName: application?.collegeName ?? status.collegeName ?? undefined,
      graduationYear: application?.graduationYear ?? status.graduationYear ?? undefined,
      whyJoin: application?.whyJoin ?? undefined,
      superpower: application?.superpower ?? undefined,
      funFact: application?.funFact ?? undefined,
      vibeCheck: application?.vibeCheck ?? undefined,
      socialHandle: application?.socialHandle ?? undefined,
    },
    reviewNote: application?.status === "REJECTED" ? application.reviewNote : null,
  };

  return (
    <Shell>
      <AmbassadorApplyExperience viewer={viewer} loginUrl={loginUrl} />
    </Shell>
  );
}
