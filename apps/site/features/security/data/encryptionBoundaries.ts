import type { EncryptionBoundary } from "../types";

/**
 * Every spec on this page has to be something the repository can back up, because
 * this is the page a reader will quote back at us. Claims we could not support have
 * been removed rather than softened:
 *
 * - "LocalStorage encryption" - the studio writes plaintext JSON.
 * - "In-memory vector rendering (WASM / Canvas)" - exports run through
 *   @react-pdf/renderer, which is neither.
 * - "Zero unauthenticated uploads" - POST /ats/extract accepts a 5 MB file from
 *   anonymous callers by design; that is the ATS checker's own upload path.
 * - "AES-256 database encryption at rest", "TLS 1.3", "edge SSL rotation",
 *   "encrypted API gateways" - provider-dependent, with nothing in this repo behind
 *   them. Our privacy policy deliberately claims none of these, and this page now
 *   matches its restraint: where a provider makes the guarantee, we attribute it to
 *   the provider instead of asserting it ourselves.
 */
export const ENCRYPTION_BOUNDARIES: EncryptionBoundary[] = [
  {
    number: "01",
    title: "Local-First Browser Storage",
    description:
      "Documents are drafted and rendered in your browser, and your drafts live in that browser's storage. Nothing is sent to us during document generation. Note that browser storage is not encrypted by us: on a shared or compromised machine, treat it as readable.",
    specs: [
      "Drafts held in browser storage, not our database",
      "No transmission during editing or export",
      "Sign in only when you want sync or publishing",
    ],
  },
  {
    number: "02",
    title: "Encrypted Transit & Better Auth",
    description:
      "When you register and log in, your Master Profile and documents sync over an encrypted connection, with passwordless OTP verification handled by Better Auth. Storage-layer encryption is provided by our hosting and database providers under their terms, not implemented by us.",
    specs: [
      "Better Auth passwordless OTP login",
      "Encrypted in transit (HTTPS)",
      "At-rest encryption per our infrastructure providers",
    ],
  },
  {
    number: "03",
    title: "Public Portfolios & Subdomains",
    description:
      "Portfolios published to a veriworkly.com subdomain are served through edge caches with HTTPS. Visitor counts are aggregated without third-party tracking cookies, and unpublishing purges every cache layer that could keep a page readable.",
    specs: [
      "HTTPS on every published subdomain",
      "Zero-cookie visitor aggregation",
      "Unpublish switch with full cache purge",
    ],
  },
  {
    number: "04",
    title: "Third-Party AI Processing",
    description:
      "AI tailoring and cover letter drafting send your text to a third-party model provider. We do not store the prompt or the response beyond the request, and we do not train models on your data — but the text does leave our infrastructure, which is why every AI action is something you trigger deliberately.",
    specs: [
      "No model training on your career data",
      "Prompt and response not retained after the request",
      "Side-by-side diff review before any change lands",
    ],
  },
];
