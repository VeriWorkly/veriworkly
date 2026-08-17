/**
 * `@veriworkly/profile-core` — the single definition of the Master Profile.
 *
 * Modular Architecture:
 * - `common/`: Primitives, international phone parser, sanitizers
 * - `schema/`: Zod schemas, TypeScript types, empty defaults
 * - `normalization/`: Master profile normalizer, legacy section unflattening
 * - `validation/`: Validation rules and diagnostic issue formatting
 * - `migrations/`: Schema versioning and migration pipeline
 * - `projections/`: Document projections (resume, cover letter, portfolio)
 * - `testing/`: Pure projection assertion testing helpers
 *
 * Consumed by apps/studio, apps/server, and apps/portfolio.
 */

// 1. Common primitives & utilities
export * from "./common/index.js";

// 2. Schema, types, defaults
export * from "./schema/index.js";

// 3. Normalization & legacy migration
export * from "./normalization/index.js";

// 4. Validation
export * from "./validation/index.js";

// 5. Version migrations
export * from "./migrations/index.js";

// 6. Projections
export * from "./projections/index.js";

// 7. Testing utilities
export * from "./testing/index.js";
