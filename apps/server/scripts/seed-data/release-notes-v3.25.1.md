This release patches a critical remote code execution vulnerability in Next.js, in the code every VeriWorkly app uses to draw its link-preview images, and closes every other dependency advisory that has an upstream fix: `npm audit` goes from 21 findings (1 critical) to 5, all in one lint-only package that never ships. Dependencies are also updated within their current major versions, and the root dependency overrides are trimmed to the ones that still do something.

## 🛡️ Security

- Upgraded Next.js and eslint-config-next from 16.3.5 to 16.3.8 across the site, Studio, portfolio, blog and docs. This fixes remote code execution in `next/og` `ImageResponse` (GHSA-vcvr-r3jv-pc5j), which every app uses for its social preview images, along with a server-side request forgery in image optimization and cache-poisoning issues in statically generated pages.
- Upgraded Nodemailer from 9.1.1 to 10.0.14 on the server. 9.x has no patched release. This fixes SMTP credentials leaking across transports through a shared DNS cache (GHSA-6vj9-mwq6-2f5v) and four address-parser flaws: three denial-of-service attacks (GHSA-prgh-xp8r-p3m5, GHSA-v53p-9fqp-m79j, GHSA-8vvx-rff5-p5rq) and a malformed envelope recipient (GHSA-g57g-f23g-4646).
- Upgraded Express to 4.22.3, which brings qs 6.16 and fixes a request-parsing array-limit bypass and denial of service (GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g), and Multer to 2.4.0, which fixes a denial of service through aborted uploads (GHSA-3pph-fpjx-jg34).
- Corrected root overrides that were pinning vulnerable versions: fast-uri is now 3.1.8, fixing seven host-confusion and server-side request forgery advisories (the previous 3.1.7 override had never actually applied), and body-parser is now 1.20.8.
- Overrode mysql2 to 3.24.5 and deepmerge-ts to 8.0.2. Prisma 7 pins vulnerable versions of both, including a plaintext credential leak in mysql2 (GHSA-3f6p-5ww8-9rcr).
- Updated @xmldom/xmldom to 0.8.15, used when reading uploaded Word documents. This fixes XML injection and quadratic-time parsing advisories. Also updated nanoid, brace-expansion, and Vitest (a path traversal in test tooling, GHSA-82fw-gwwq-j7x9).

## 🔧 Improved

- Updated Prisma to 7.10.0.
- Updated Studio's document export libraries: @react-pdf/renderer to 4.9.0 and docx to 9.8.1. Resume PDFs pass the existing PDF parity tests unchanged.
- Updated other packages within their current major versions, including the AWS SDK, Dodo Payments, mammoth, pg, Resend, lucide-react, libphonenumber-js and Prettier.
- Better Auth stays on 1.6.x: 1.7 requires a database migration and will ship separately.
- The blog and docs now pin exactly the same fumadocs versions, and the root overrides keep a single copy of fumadocs for every package that depends on it.
- Removed overrides for packages no longer in the dependency tree (hono, @hono/node-server, better-sqlite3), one that had no effect (valibot), and nested entries that repeated top-level rules. The installed dependency tree is unchanged.
- The local setup guide and README now state the npm version the repository requires: 11 or higher.

## 🐛 Fixed

- The site now declares `tsx`, which its build scripts use. Before, the site build only worked because the server happened to install it.
- Corrected the tech stack description in `veriworkly.md`: Playwright is a Studio development dependency for browser tests, and no export path uses a headless browser.

**Full Changelog**: https://github.com/VeriWorkly/veriworkly/compare/Release-v3.25.0...Release-v3.25.1
