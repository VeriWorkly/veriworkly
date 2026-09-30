This release adds native Resend transactional email integration via its REST API, hardens the SMTP transport with connection pooling and socket timeouts, and fixes a Better Auth redirect issue where cancelling social login sent users to raw API JSON instead of the Studio login screen.

## ✨ Added

- Added native Resend provider support (`AUTH_EMAIL_PROVIDER=resend`) using the official SDK and `RESEND_API_KEY`, enabling fast and reliable transactional email delivery over HTTPS.
- Added connection pooling, keepalive, and socket timeouts to the Nodemailer SMTP transport, preventing hanging connections when using SMTP relays.
- Added test coverage for Resend dispatch, missing credentials, API errors, and production runtime configuration validation.

## 🔧 Improved

- Updated `validateAuthRuntimeConfig` to permit both `resend` and `smtp` as valid production email providers.
- Replaced direct `window` object calls in Studio `SocialAuth.tsx` with idiomatic Next.js `useSearchParams()` and canonical site config URLs.
- Updated documentation and environment examples across `.env.example`, `.env.docker.example`, `compose.yaml`, and the docs platform.

## 🐛 Fixed

- Fixed Better Auth OAuth cancellation redirecting to `https://api.veriworkly.com/?error=access_denied...` instead of returning to the Studio login page.
- Added error toast feedback on the Studio login page and cleaned up lingering authentication query parameters from the browser address bar.

**Full Changelog**: https://github.com/VeriWorkly/veriworkly/compare/Release-v3.24.3...Release-v3.24.4
