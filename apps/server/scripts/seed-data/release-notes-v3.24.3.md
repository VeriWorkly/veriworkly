This release upgrades Next.js to 16.3.5 across all frontend apps to patch a critical remote code execution vulnerability, updates React to 19.3.0, and updates Sharp to 0.35.4. We also removed redundant React and Sharp overrides from the root package configuration, updated Multer and Nodemailer to patched versions, added offline safety to the changelog static export, and extracted the ATS scoring and parsing engine into a dedicated workspace package.

## 🛡️ Security

- Upgraded Next.js to 16.3.5 across all frontend workspaces, resolving critical remote code execution vulnerabilities on Windows-hosted servers (GHSA-p293-qw3h-jr36) and the Image Optimization API vulnerability (GHSA-2xp9-vwfh-vxw4).
- Upgraded Sharp to 0.35.4 to patch libheif vulnerabilities (GHSA-rgj7-g3m4-5g8c).
- Updated Multer to 2.3.0 in apps/server to patch multipart parsing denial-of-service vulnerabilities.
- Updated Nodemailer to 9.1.1 in apps/server to patch recipient domain validation and address parser denial-of-service flaws.
- Updated root overrides for fast-uri to 3.1.7 and js-yaml to 4.3.2 to remediate upstream advisories.

## ✨ Added

- Extracted ATS scoring, tokenizer, and parsing rules into a shared `@veriworkly/ats-engine` package consumed by the server and frontend applications.
- Added ATS AI processing service with strict schema formatting, grounding validation, and automated repair routines.
- Added generate script in root package.json for building docs API routes.

## 🔧 Improved

- Upgraded Next.js and eslint-config-next from 16.2.12 to 16.3.5 across apps/site, apps/studio, apps/portfolio, apps/blog-platform, and apps/docs-platform.
- Upgraded React and react-dom to 19.3.0 across all frontend applications.
- Removed root package overrides for React, react-dom, and Sharp, allowing npm workspace hoisting to resolve deduplicated copies directly.
- Updated technical documentation to reference Next.js 16.3.5 and React 19.3.0.
- Cleaned up marketing site components and updated site documentation to match current architecture.

## 🐛 Fixed

- Resolved static build failure in apps/site when prerendering changelog release pages without an active backend server.
- Broke circular module dependency between template registry and template-details in apps/portfolio.
- Improved private policy error reporting and path resolution in apps/server.
- Removed deprecated compare config shim in apps/site, routing competitor imports directly to features/compare.

**Full Changelog**: https://github.com/VeriWorkly/veriworkly/compare/Release-v3.24.2...Release-v3.24.3
