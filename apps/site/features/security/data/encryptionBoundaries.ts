import type { EncryptionBoundary } from "../types";

export const ENCRYPTION_BOUNDARIES: EncryptionBoundary[] = [
  {
    number: "01",
    title: "Client-Side Browser Sandbox",
    description:
      "All documents compile in your browser using local vector rendering. Your career facts and contact details are never transmitted to remote parsing backends during document generation.",
    specs: [
      "LocalStorage encryption",
      "In-memory vector rendering (WASM / Canvas)",
      "Zero unauthenticated uploads",
    ],
  },
  {
    number: "02",
    title: "Encrypted Cloud Sync & Better Auth",
    description:
      "When you choose to register and log in, your Master Profile and sandbox documents sync securely. Connections are encrypted in transit via TLS 1.3 and protected by passwordless OTP verification.",
    specs: [
      "Better Auth passwordless OTP login",
      "TLS 1.3 encrypted transit",
      "AES-256 database encryption at rest",
    ],
  },
  {
    number: "03",
    title: "Public Portfolios & Custom Subdomains",
    description:
      "Portfolios published to subdomains (yourname.veriworkly.com) are delivered via global CDN edge caches. Visitor counts are calculated in aggregate without using third-party tracking cookies.",
    specs: [
      "Edge SSL provisioning & automated rotation",
      "Zero-cookie analytics",
      "Instant unpublish switch with cache purge",
    ],
  },
  {
    number: "04",
    title: "Stateless AI Processing",
    description:
      "When using AI resume tailoring and cover letter drafting, prompts are executed ephemerally through secure API gateways. User inputs are never stored permanently or used to train public models.",
    specs: [
      "Zero model training on user career data",
      "Ephemeral API gateways with strict rate limiting",
      "Side-by-side diff review before applying changes",
    ],
  },
];
