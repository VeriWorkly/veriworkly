import { PageSection, TYPE } from "@/components/marketing/PageLayout";

const DIFFERENCES = [
  {
    title: "Guest mode to start.",
    body: "Continue as a guest: no email check, no phone number, no card. What you write stays on your device until you choose to sync.",
  },
  {
    title: "Downloads stay clean.",
    body: "Your resume should look like yours, not an ad for a software company. Export PDF, Word (.docx) and Markdown with no logo on them.",
  },
  {
    title: "One place for all three.",
    body: "Write the resume, draft a matching cover letter, and publish a portfolio on a veriworkly.com subdomain. Free core templates carry a small badge; premium templates and badge removal are paid. Publishing opens at launch.",
  },
];

/**
 * Most builders let you write for an hour, then put the subscription on the download button.
 * These are the three places VeriWorkly does the opposite, stated once for the whole hub.
 */
const CompareDifferences = () => (
  <PageSection
    tone="card"
    title="Three things we do differently."
    lede="Most resume sites wait until you have finished writing, then put a subscription on the download button. We built VeriWorkly to remove that moment."
  >
    <ul className="grid gap-x-10 gap-y-10 md:grid-cols-3">
      {DIFFERENCES.map((item) => (
        <li key={item.title} className="reveal border-border border-t pt-6">
          <h3 className={`${TYPE.title} text-balance`}>{item.title}</h3>
          <p className="text-muted mt-3 text-base leading-7 text-pretty">{item.body}</p>
        </li>
      ))}
    </ul>
  </PageSection>
);

export default CompareDifferences;
