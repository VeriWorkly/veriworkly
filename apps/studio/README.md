# VeriWorkly Studio

The studio is the editor at app.veriworkly.com. People build resumes and cover letters here, keep their Master Profile, run ATS checks, use AI writing help, share documents, and manage billing, credits and API keys. Admins run the `/admin` console from here too.

It is a Next.js 16 app (App Router, React 19, Tailwind CSS 4). Guests can use the editor with no account; their documents stay in the browser.

## Run it locally

From the repository root:

```bash
npm install
cp apps/studio/.env.example apps/studio/.env
npm run dev:studio
```

Open http://localhost:3001. `predev` builds `packages/profile-core` first.

Guest mode works with no backend. Sign-in, sync, sharing, AI, ATS and billing need the API running on port 8080 (`npm run dev:server`, see [`apps/server/README.md`](../server/README.md)).

## Architecture

**Local-first storage.** Every document lives in `localStorage` first. `LocalStorageService` (`features/documents/services/local-storage-service.ts`) stores one key per document plus an index. It owns each document's `sync` block: editors save content, and only the sync APIs change sync fields (`patchSync`, bulk toggles, keep-local-only). Storage parsing is lenient so a half-typed email or date is never thrown away. Strict validation runs only in the editor UI and at export.

**Per-document sync.** Signed-in users with sync on get a background sync engine (`sync-engine.ts`, `document-sync-service.ts`). It syncs each document on its own, at most 4 at a time, with a lock so two tabs never send the same document twice. It follows the server's contracts: 409 is a revision conflict; 401, 408, 429 and 5xx retry with backoff; 402 (free-tier limit) stops until the next app load, which tries it once more because the plan may have changed; 403 and other rejected requests stop until the user syncs by hand or turns sync back on; 404 removes a clean copy and keeps an edited one. Edits typed while a request is in flight stay pending.

**One template skin engine.** All 7 resume templates are skins on `templates/resume/shared/`. The live preview (`web.tsx`) and the PDF (`pdf.tsx`) use the same type scale, spacing model and content model. Both use the same keep-together rule (`keep-together.ts`), so a section breaks across pages in the same place in the preview and in the PDF. The 5 cover letter templates share `templates/cover-letter/shared.ts`. Each registry (`templates/*/registry.ts`) loads renderers on demand.

**One source per export.** `buildResumeSections` (`templates/resume/shared/model.ts`) and `getCoverLetterState` (`templates/cover-letter/shared.ts`) decide what every format prints: preview, PDF, DOCX, HTML, Markdown and text. `exportDocumentByType` loads each format's exporter with a dynamic `import()`, so `@react-pdf/renderer` and `docx` stay out of the editor bundle until someone exports.

**Server calls from server renders.** Every backend call made during a server render goes through `lib/server-fetch.ts`. It forwards the visitor's cookies, sends the studio `Origin`, times out after 5 seconds, and throws on failure so the page shows an error instead of an empty account. With `INTERNAL_API_KEY` set it also sends the visitor's IP, so the API rate-limits each visitor separately. Browser calls use `utils/fetchApiData.ts`.

**Signed out means 401 or 403.** `fetchCurrentUser` returns `null` only for those. Any other failure throws to an error boundary. A rejected session cookie goes to `app/auth/session-expired`, which clears it and sends the user to `/login`.

**Error boundaries.** `app/error.tsx`, `app/global-error.tsx`, `app/(main)/(dashboard)/error.tsx`, `app/(main)/checkout/error.tsx`, `app/admin/error.tsx`, `app/share/error.tsx` and the preview's `error.tsx`.

**Security headers** ship with the app. `proxy.ts` sets the Content-Security-Policy with a fresh nonce per request (`lib/content-security-policy.ts`): scripts run only with that nonce or when a nonced script loads them, so an injected inline script does not run. Reading the nonce in the root layout renders every page per request. HSTS, `X-Frame-Options` and the rest are set in `next.config.ts`.

## Folders

| Folder       | What is in it                                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`       | Routes. `(main)/(dashboard)` holds the signed-in pages, `(main)/editor` the editors, plus `admin`, `login`, `share`.                                                                            |
| `app/parity` | A dev-only page the parity tests measure. It returns 404 in production.                                                                                                                         |
| `components` | Shared UI: dashboard shell, admin pieces, modals.                                                                                                                                               |
| `config/`    | `site.ts` (origins and links), `templates.ts` (template summaries).                                                                                                                             |
| `features/`  | One folder per area: `documents`, `resume`, `cover-letter`, `profile`, `ats`, `ai`, `billing`, `credits`, `api-keys`, `auth`, `affiliate`, `ambassador`, `analytics`, `roadmap`, `admin`.       |
| `lib/`       | `server-fetch.ts`, `auth-client.ts`, `auth-redirect.ts`, `content-security-policy.ts`, `feature-flags.ts`.                                                                                      |
| `providers/` | Auth and theme providers.                                                                                                                                                                       |
| `store/`     | `useUserStore` (Zustand). The open document lives in its editor's Zustand store (`features/resume/store`, `features/cover-letter/store`); every stored document lives in `LocalStorageService`. |
| `templates/` | `resume/`, `cover-letter/`, `shared/` (registry, pagination, geometry) and `pdf/` (fonts, glyph widths).                                                                                        |
| `types/`     | Shared types.                                                                                                                                                                                   |
| `utils/`     | `fetchApiData.ts`, the browser-side API client.                                                                                                                                                 |
| `tests/`     | `contracts/` (fast, node), `browser/` and `parity/` (boot the app and drive Chrome).                                                                                                            |
| `scripts/`   | `check-env-example.mjs`.                                                                                                                                                                        |
| `public/`    | Fonts, template previews, `llms.txt` and `.well-known/agent.json`. A contract test checks the last two.                                                                                         |

## Environment variables

Copy `.env.example` to `.env`. `NEXT_PUBLIC_*` values are built into the browser bundle, so changing one needs a rebuild. The rest are read at runtime.

| Variable                     | Required     | Meaning                                                                                                                                         |
| ---------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BACKEND_URL`    | Yes          | API base URL the browser calls, for example `https://api.veriworkly.com/api/v1`. Also added to the CSP `connect-src`.                           |
| `BACKEND_INTERNAL_URL`       | No           | API base URL for server renders. Falls back to `NEXT_PUBLIC_BACKEND_URL`. On the VPS, point it at the API on loopback.                          |
| `NEXT_PUBLIC_APP_URL`        | Yes in prod  | The studio's own origin. Used for metadata, sitemap, robots and the `Origin` header on API calls, so it must be in the API's `ALLOWED_ORIGINS`. |
| `INTERNAL_API_KEY`           | Yes in prod  | Server only. Must equal the API's `INTERNAL_API_KEY`. Without it every visitor shares the studio's IP and one rate-limit bucket.                |
| `ADMIN_EMAIL`                | For `/admin` | Server only. The one account that sees `/admin`. Unset means `/admin` is a 404 for everyone.                                                    |
| `AFFILIATE_PROGRAM_ENABLED`  | No           | `true` or `false`. Unset or empty means on outside production and off in production. Keep it equal to the API's flag.                           |
| `AMBASSADOR_PROGRAM_ENABLED` | No           | Same rule as the affiliate flag.                                                                                                                |
| `SHOT`, `SHOT_FIXTURE`       | Tests only   | `SHOT=1` makes the parity run write preview and PDF images to `tests/parity/shots/`. `SHOT_FIXTURE` picks the fixture (default `default`).      |
| `PARITY_ORIGIN`              | Tests only   | Reuse a studio dev server you already started, for example `http://localhost:3001`, instead of booting one on port 4311.                        |

`node apps/studio/scripts/check-env-example.mjs` fails when the code reads a variable that `.env.example` does not list, or when `.env.example` lists one no code reads. The contract suite runs the same check.

## Tests

Run from the repository root.

| Command                                         | What it does                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run test:contracts -w @veriworkly/studio`  | Fast node tests in `tests/contracts/`. Runs on every pull request.                 |
| `npm run test:browser -w @veriworkly/studio`    | Boots `next dev` on port 4311 and drives Chrome through the editor.                |
| `npm run test:parity -w @veriworkly/studio`     | Boots `next dev` on port 4311 and compares the preview with the PDF, page by page. |
| `npx tsc --noEmit -p apps/studio/tsconfig.json` | Type check.                                                                        |
| `npm run lint -w @veriworkly/studio`            | ESLint.                                                                            |

Browser and parity tests:

- They launch your installed Chrome (then Edge), not Playwright's bundled Chromium. Windows Application Control blocks the bundled one on some machines.
- They use `localhost`, never `127.0.0.1`. Next's dev server blocks `/_next/` for the second origin, the page never hydrates, and the measurements are of dead markup.
- They set the `veriworkly-guest-mode=true` cookie to skip the login redirect.
- Only one dev server can run per checkout. If port 4311 is taken the run stops and says so. Set `PARITY_ORIGIN` to reuse a server on purpose.
- A failed browser test saves a screenshot of its page to `tests/browser/.failures/`; the parity run logs every comparison to `tests/parity/.report.log`.
- CI runs both nightly and on demand (`.github/workflows/studio-browser.yaml`) and uploads the screenshots and the report when a run fails.

## Deploy (VPS + nginx + pm2)

Production runs `next start` under pm2 as `veriworkly-app` on port 7046, behind nginx. There is no Docker image and no standalone build for the studio. `npm start` binds to `127.0.0.1`: a request straight to the port would skip nginx and set its own `X-Real-IP`, which server renders forward to the API as the visitor's address.

1. Put the production values in `apps/studio/.env` on the server (see the table above).
2. Build from the repository root. The studio's `prebuild` builds `packages/profile-core` first.

   ```bash
   cd /root/veriworkly-resume
   git pull
   npm ci --legacy-peer-deps
   npm run build -w @veriworkly/studio
   ```

   The build replaces `.next` while the old process still serves from it, so until the restart in step 3 open pages can hit 404s and chunk-load errors. Run the restart straight after the build.

3. Start it the first time, save the process list and register pm2 at boot; after each later build, restart:

   ```bash
   pm2 start npm --name veriworkly-app --cwd /root/veriworkly-resume/apps/studio -- run start -- -p 7046
   pm2 save
   pm2 startup   # once per machine; run the command it prints

   pm2 restart veriworkly-app
   ```

4. Check it answers on loopback only, with the security headers:

   ```bash
   curl -sI http://127.0.0.1:7046/login   # 200 with Content-Security-Policy
   ss -ltnp | grep 7046                   # 127.0.0.1:7046, never 0.0.0.0 or *
   ```

nginx in front of the studio:

```nginx
server {
    server_name app.veriworkly.com;

    location / {
        proxy_pass http://127.0.0.1:7046;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

nginx in front of the API sets the same two address headers, and drops the ones a visitor could set that the API's sign-in rate limits also read (`AUTH_IP_ADDRESS_HEADERS`):

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Client-IP "";
proxy_set_header CF-Connecting-IP "";
```

Rules:

- **Set `X-Real-IP $remote_addr`, and overwrite `X-Forwarded-For` with `$remote_addr`**, on both. The studio forwards that address to the API as the visitor's IP. Appending with `$proxy_add_x_forwarded_for` lets a visitor put any address first. Behind Cloudflare, configure nginx's `real_ip` module (`set_real_ip_from` Cloudflare's ranges, `real_ip_header CF-Connecting-IP`) so `$remote_addr` is the visitor, and keep the API's `TRUST_PROXY` equal to the number of proxies in front of it.
- **Use the same `INTERNAL_API_KEY` in the studio and the API.** The API ignores the forwarded IP without it, and every visitor shares the studio's rate-limit bucket.
- **List the studio's origin in the API's `ALLOWED_ORIGINS`** (for example `https://app.veriworkly.com`, the studio's `NEXT_PUBLIC_APP_URL`). Server renders send it as `Origin`, and sign-in trusts only listed origins.
- **Do not add security headers in nginx.** The studio already sets them; a second CSP would apply on top of the first.
- **`NEXT_PUBLIC_*` changes need a rebuild**, not just a restart.
- **Release the studio before the API when a release changes how documents are listed.** The studio reads document lists twenty at a time and also works with an API that answers in one response. A studio without paging reads only the first page of a paged API, so its library and sync miss every document after the twentieth.
