import SEOContentContainer from "@/components/SEOContentContainer";

const RoadmapSEOContent = () => {
  return (
    <SEOContentContainer>
      <h2 className="text-xl font-semibold">What’s on the VeriWorkly Roadmap?</h2>

      <p className="text-muted text-sm leading-6">
        The VeriWorkly roadmap is a public, admin-managed backlog that shows exactly what we&apos;re
        building next across the whole workspace - resume and cover letter templates, the ATS
        checker, GitHub and LinkedIn import, portfolio publishing, and AI writing tools - not just
        resumes. Every item shows its status (planned, in progress, or released), an ETA where one
        exists, and the reasoning behind it.
      </p>

      <p className="text-muted text-sm leading-6">
        VeriWorkly is a free, privacy-first career workspace with no login required to start. We
        ship based on user feedback and evolving hiring and ATS trends, and this roadmap page is
        updated as items move between planned, in-progress, and shipped.
      </p>
    </SEOContentContainer>
  );
};

export default RoadmapSEOContent;
