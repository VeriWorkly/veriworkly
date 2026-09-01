import type { ScopeClassification } from "../types";

export const DISCLOSURE_IN_SCOPE: ScopeClassification = {
  category: "In-Scope Vulnerabilities",
  items: [
    "Authentication bypass or broken session state in Better Auth",
    "Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF)",
    "Unauthorized cross-tenant data access or Master Profile leaks",
    "Remote Code Execution (RCE) or arbitrary file read/write",
    "Subdomain takeover vulnerabilities on *.veriworkly.com",
    "Direct Object Reference (IDOR) on documents, resumes, or tokens",
    "Server-Side Request Forgery (SSRF) in export compilers",
  ],
};

export const DISCLOSURE_OUT_OF_SCOPE: ScopeClassification = {
  category: "Out-of-Scope Findings",
  items: [
    "Volumetric Denial of Service (DDoS) or network flood testing",
    "Social engineering, phishing, or physical attacks against team members",
    "Self-XSS (attacks requiring user to paste malicious code into DevTools console)",
    "Missing security headers that do not result in direct exploitable vulnerabilities",
    "Reports from automated scanning tools without a working Proof of Concept (PoC)",
    "Issues in upstream third-party dependencies without direct impact on VeriWorkly",
  ],
};
