/**
 * One projection per document type. Adding a document type means adding a file here and
 * nothing else — the master profile itself is never changed to accommodate one.
 */

export * from "./document.js";
export * from "./resume.js";
export * from "./cover-letter-content.js";
export * from "./cover-letter.js";
export * from "./portfolio-types.js";
export * from "./portfolio.js";
