# `@veriworkly/profile-core`

The single source of truth for the VeriWorkly Master Profile schema, validation, normalization, migrations, and document projections.

---

## 1. Architectural Model & Core Philosophy

1. **Master Profile is a Central Data Pool**:
   - The master profile is the single canonical data pool containing all user profile data (identity, experience, projects, skills, education, awards, certifications, languages, custom sections, etc.).
2. **Fork-on-Create Rule**:
   - Documents (resumes, cover letters, portfolios, etc.) **fork from the master profile once upon creation** via dedicated pure projection functions (`projectToResume`, `projectToCoverLetter`, `projectToPortfolio`).
   - Documents own their layout, styling, and customizations. Editing a document **never** writes back to the master profile.
3. **Lossless, Pure Projections**:
   - Projections are pure, total, and deterministic functions.
   - Projections share zero object references with the master profile (deep clone).
4. **Deploy Order (Server First)**:
   - Both server and client schemas strip unknown keys (`.strip()`). When adding new fields to the master profile, **always deploy the backend server first** so unknown fields are not stripped on incoming payloads.

---

## 2. Directory Layout & Module Responsibilities

```
packages/profile-core/src/
├── common/             # Pure shared primitives, string/date helpers, sanitizers
│   ├── phone.ts        # E.164 phone normalization with libphonenumber-js
│   ├── primitives.ts   # createId, deepClone, URL and email validators/schemas
│   └── sanitize.ts     # Persistence sanitizer (URL/phone formatting)
├── schema/             # Canonical schema definition, types, and defaults
│   ├── schema.ts       # Zod schemas with length caps (CURRENT_SCHEMA_VERSION = 2)
│   ├── types.ts        # Inferred TypeScript interfaces (MasterProfileData)
│   └── defaults.ts     # Content-free empty master profile and defaults
├── normalization/      # Defensive parsing and schema transforms
│   ├── legacy-sections.ts # Unflattens legacy custom sections into typed arrays
│   └── normalize.ts    # Total normalizer, field-by-field salvage routines
├── validation/         # Business validation logic
│   └── validate.ts     # Checks required fields before publishing/saving upstream
├── migrations/         # Schema evolution and version migrations
│   ├── v1-to-v2.ts     # v1 (unversioned/mirrored) -> v2 migration
│   └── index.ts        # Migration pipeline runner and NewerSchemaVersionError
├── projections/        # Pure document projection engines
│   ├── document.ts     # Envelope types (DocumentSyncState)
│   ├── resume.ts       # projectToResume
│   ├── cover-letter.ts # projectToCoverLetter
│   ├── cover-letter-content.ts # CoverLetterContent & appearance defaults
│   ├── portfolio.ts    # projectToPortfolio & mergeMasterProfileIntoPortfolio
│   └── portfolio-types.ts # PortfolioContent, PortfolioSection, etc.
├── testing/            # Universal contract test utilities
│   └── assertProjectionIsPure.ts # Asserts immutability, purity, and isolation
└── index.ts            # Root barrel export of the public API
```

---

## 3. How to Add a Field to the Master Profile

Follow this step-by-step playbook:

1. **`src/schema/schema.ts`**:
   - Add the field and its length limits to the relevant sub-schema (or `masterProfileSchemaBase`).
   - Example: `bio: z.string().max(2000).default("")`.
2. **`src/schema/types.ts`**:
   - Types are inferred directly from schemas. Re-export if needed.
3. **`src/schema/defaults.ts`**:
   - Add default neutral starting values in `createEmptyMasterProfile()` or section factory.
4. **`src/migrations/`**:
   - If the field requires structural transformation from older profiles, bump `CURRENT_SCHEMA_VERSION` and add a migration in `src/migrations/`.
5. **`src/projections/`**:
   - Update projections (`resume.ts`, `cover-letter.ts`, `portfolio.ts`) to map or omit the field as appropriate.
6. **Tests**:
   - Update contract test suites in `apps/studio`, `apps/server`, and `apps/portfolio`.
7. **Deploy**:
   - **Deploy apps/server FIRST**, then deploy frontend apps (`apps/studio`, `apps/portfolio`).

---

## 4. How to Add a New Document Type (e.g. `LINK_IN_BIO`)

When creating a new document projection:

### Step 1: Create the Document Content Interface

Create `src/projections/link-in-bio-types.ts`:

```ts
export interface LinkInBioLink {
  id: string;
  title: string;
  url: string;
  highlighted: boolean;
}

export interface LinkInBioContent {
  schemaVersion: 1;
  identity: {
    name: string;
    avatarUrl: string | null;
    bio: string;
  };
  socialLinks: Array<{ type: string; url: string }>;
  links: LinkInBioLink[];
}
```

### Step 2: Implement Pure Projection

Create `src/projections/link-in-bio.ts`:

```ts
import type { MasterProfileData } from "../schema/types.js";
import type { LinkInBioContent } from "./link-in-bio-types.js";

export function projectToLinkInBio(master: MasterProfileData): LinkInBioContent {
  return {
    schemaVersion: 1,
    identity: {
      name: master.basics.fullName.trim(),
      avatarUrl: null,
      bio: master.basics.headline.trim() || master.summary.trim(),
    },
    socialLinks: master.links.items
      .filter((l) => Boolean(l.url.trim()))
      .map((l) => ({ type: l.type, url: l.url.trim() })),
    links: master.projects
      .filter((p) => Boolean(p.link.trim()))
      .map((p) => ({
        id: p.id,
        title: p.name,
        url: p.link,
        highlighted: false,
      })),
  };
}
```

### Step 3: Export from Projections Barrel

In `src/projections/index.ts`:

```ts
export * from "./link-in-bio-types.js";
export * from "./link-in-bio.js";
```

### Step 4: Add Purity & Contract Tests

Use `assertProjectionIsPure`:

```ts
import { assertProjectionIsPure } from "@veriworkly/profile-core";
import { projectToLinkInBio } from "@veriworkly/profile-core";

it("projects link-in-bio purely without mutating master profile", () => {
  const result = assertProjectionIsPure(projectToLinkInBio, fixture);
  expect(result.identity.name).toBe("Alex");
});
```

---

## 5. Projection Invariants

Every projection function in this package MUST satisfy these 5 invariants:

| Invariant         | Description                                                                                   |
| :---------------- | :-------------------------------------------------------------------------------------------- |
| **Pure**          | No network, database, or disk I/O. Relies only on passed arguments.                           |
| **Deterministic** | Calling with identical arguments (and `options.now` if timestamped) returns identical output. |
| **Deep-Cloned**   | Output must never share mutable object references with the input master profile.              |
| **Non-Mutating**  | The input master profile is never modified during or after execution.                         |
| **Total**         | Never throws an exception on valid master profile data.                                       |
