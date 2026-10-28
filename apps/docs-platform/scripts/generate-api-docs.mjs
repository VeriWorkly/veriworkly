/**
 * Builds the API reference from the modular OpenAPI spec, in two steps:
 *
 *   1. Bundle  `specs/openapi.yaml` (+ `specs/paths/*`, `specs/components/*`) -> `openapi.yaml`
 *   2. Generate the bundle -> `content/api-reference/**\/*.mdx`
 *
 * The bundle files (`openapi.yaml`, `public/openapi.{json,yaml}`) are written only after the pages
 * are generated, so a failed run changes nothing.
 *
 * Runs automatically before `dev` and `build` (see the `predev` / `prebuild` scripts), so the
 * published reference can never drift from the spec. Edit files under `specs/` — never the
 * bundled `openapi.yaml` or the generated `.mdx` pages, both of which are overwritten here.
 *
 * Step 1 replaces `npx @redocly/cli bundle`: it resolves every external `$ref` and rewrites
 * component pointers to local `#/components/{schemas,responses}/Name` form, which is byte-for-byte
 * what Redocly emitted, without requiring a network install.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";
import * as prettier from "prettier";
import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const specsDir = path.join(appRoot, "specs");
const bundlePath = path.join(appRoot, "openapi.yaml");
const outputDir = path.join(appRoot, "content/api-reference");

// Served at /openapi.json and /openapi.yaml, and advertised by `llms.txt` and the agent card.
// Written from the same bundle as the MDX pages — they were hand-maintained once and drifted.
// This is the only copy: the other apps redirect their /openapi.json here.
const publicJsonPath = path.join(appRoot, "public/openapi.json");
const publicYamlPath = path.join(appRoot, "public/openapi.yaml");

/* ------------------------------------------------------------------ bundle */

const cache = new Map();

function load(file) {
  const abs = path.resolve(file);
  if (!cache.has(abs)) cache.set(abs, YAML.parse(fs.readFileSync(abs, "utf8")));
  return cache.get(abs);
}

const unescapeSegment = (key) => key.replace(/~1/g, "/").replace(/~0/g, "~");

function pointer(doc, fragment) {
  const trimmed = (fragment ?? "").replace(/^#/, "").replace(/^\//, "");
  if (!trimmed) return doc;

  return trimmed.split("/").reduce((acc, key) => {
    const name = unescapeSegment(key);
    const next = acc == null ? undefined : acc[name];

    // A missing last segment used to return undefined, which dropped the whole path from the
    // bundle and then deleted its page, with no error.
    if (next === undefined) throw new Error(`Unresolvable $ref "${fragment}": no "${name}"`);
    return next;
  }, doc);
}

/** Component refs already warned about, so each is reported once. */
const unknownComponentRefs = new Set();

/** Rewrites a cross-file component `$ref` into the local pointer the bundle uses. */
function localRef(target) {
  const [file, fragment] = target.split("#");
  const name = (fragment ?? "").replace(/^\//, "");

  // No fragment means "inline this whole file" — that is how `components.schemas` is wired.
  if (!name) return null;

  const base = path.basename(file);
  if (base === "schemas.yaml") return `#/components/schemas/${name}`;
  if (base === "responses.yaml") return `#/components/responses/${name}`;

  // Any other file under `components/` is inlined at every use instead of shared as a component,
  // which is rarely what was meant. Say so. To share it, wire it up like schemas and responses.
  if (path.basename(path.dirname(file)) === "components" && !unknownComponentRefs.has(target)) {
    unknownComponentRefs.add(target);
    console.warn(
      `[api-docs] WARNING: "${target}" points into a component file the bundler does not map to #/components/*, so it is inlined, not referenced`,
    );
  }
  return null;
}

/** Keys OpenAPI allows next to a `$ref`. Any other key would silently override the target. */
const REF_SIBLINGS = new Set(["summary", "description"]);

/** The component namespace a file's own `#/Name` refs belong to once inlined. */
function selfPrefixFor(file) {
  const base = path.basename(file);
  if (base === "schemas.yaml") return "#/components/schemas/";
  if (base === "responses.yaml") return "#/components/responses/";
  return null;
}

/** `file#fragment` keys currently being inlined, to turn a circular inline into a clear error. */
const inlining = [];

function resolve(node, baseDir, selfPrefix) {
  if (Array.isArray(node)) return node.map((item) => resolve(item, baseDir, selfPrefix));
  if (node === null || typeof node !== "object") return node;

  const keys = Object.keys(node);
  const siblings = () =>
    resolve(
      Object.fromEntries(keys.filter((k) => k !== "$ref").map((k) => [k, node[k]])),
      baseDir,
      selfPrefix,
    );

  if (typeof node.$ref === "string") {
    const stray = keys.filter((k) => k !== "$ref" && !REF_SIBLINGS.has(k));
    if (stray.length > 0) {
      throw new Error(
        `$ref "${node.$ref}" (in ${baseDir}) has sibling key(s) ${stray.join(", ")}. Only summary and description may sit next to a $ref.`,
      );
    }

    // A file-internal ref inside an inlined component file must be re-namespaced.
    if (node.$ref.startsWith("#")) {
      if (!selfPrefix) {
        return Object.fromEntries(keys.map((k) => [k, resolve(node[k], baseDir, selfPrefix)]));
      }
      return { $ref: selfPrefix + node.$ref.replace(/^#\/?/, ""), ...siblings() };
    }

    const rewritten = localRef(node.$ref);
    if (rewritten) return { $ref: rewritten, ...siblings() };

    // Anything else (a path entry, or a whole component file) is inlined.
    const [file, fragment] = node.$ref.split("#");
    const abs = path.resolve(baseDir, file);
    const key = `${abs}#${fragment ?? ""}`;

    if (inlining.includes(key)) {
      throw new Error(`Circular $ref while inlining: ${[...inlining, key].join(" -> ")}`);
    }

    // Resolved before the key goes on the stack, so a sibling that points at the same target is not
    // mistaken for a cycle.
    const extra = siblings();

    inlining.push(key);
    try {
      const inlined = resolve(pointer(load(abs), fragment), path.dirname(abs), selfPrefixFor(abs));

      // A summary or description written next to the $ref belongs to the referencing file; keep it.
      return Object.keys(extra).length > 0 && inlined && typeof inlined === "object"
        ? { ...inlined, ...extra }
        : inlined;
    } finally {
      inlining.pop();
    }
  }

  return Object.fromEntries(keys.map((key) => [key, resolve(node[key], baseDir, selfPrefix)]));
}

/** Fails loudly rather than shipping a reference with dangling pointers. */
function assertRefsResolve(document) {
  const dangling = [];

  (function walk(node, at) {
    if (Array.isArray(node)) return node.forEach((item, i) => walk(item, `${at}/${i}`));
    if (!node || typeof node !== "object") return;

    if (typeof node.$ref === "string") {
      if (!node.$ref.startsWith("#")) {
        dangling.push(`${at} -> ${node.$ref} (unresolved external ref)`);
        return;
      }
      let cursor = document;
      for (const segment of node.$ref.slice(2).split("/"))
        cursor = cursor?.[unescapeSegment(segment)];
      if (cursor === undefined) dangling.push(`${at} -> ${node.$ref}`);
      return;
    }

    for (const key of Object.keys(node)) walk(node[key], `${at}/${key}`);
  })(document, "");

  if (dangling.length > 0) {
    throw new Error(
      `Bundled spec has ${dangling.length} broken $ref(s):\n  ${dangling.join("\n  ")}`,
    );
  }
}

/* ------------------------------------------------- request schemas (zod) */

// Request shapes come from the server's zod validators (IMPROVEMENTS 14): the server writes
// `specs/generated/requests.json` (`npm run generate:openapi -w @veriworkly/server`), and it is
// merged here over the hand-written spec. The generated JSON Schema supplies types, constraints,
// enums and `required`; the hand-written spec keeps summaries, descriptions, examples, responses
// and any `default` the code applies. A documented field the validator does not accept fails the
// build, so the reference can no longer promise a parameter or body field the server drops.
const generatedRequestsPath = path.join(specsDir, "generated/requests.json");

const HTTP_METHODS = ["get", "put", "post", "patch", "delete"];
const ANNOTATIONS = ["title", "description", "example", "examples", "deprecated", "externalDocs"];

/** Hand-written component refs kept as written inside generated request schemas. */
const keptRequestRefs = new Set();

/** A schema that accepts anything: the hand-written one says more, so it is kept. */
const acceptsAnything = (schema) =>
  Object.keys(schema).every((key) => ANNOTATIONS.includes(key) || key === "default");

const withoutAnnotations = (schema) =>
  Object.fromEntries(Object.entries(schema).filter(([key]) => !ANNOTATIONS.includes(key)));

function mergeSchema(generated, written, at, problems, readOutside = []) {
  if (!written || typeof written !== "object") return generated;

  // A shared component (the master profile, the ATS resume) is also used by responses, so it
  // stays hand-written rather than being replaced by one route's input shape.
  if (written.$ref || written.allOf) {
    keptRequestRefs.add(`${at} -> ${written.$ref ?? "allOf"}`);
    return written;
  }

  if (acceptsAnything(generated)) return written;

  const merged = { ...generated };
  for (const key of ANNOTATIONS) if (written[key] !== undefined) merged[key] = written[key];
  if (merged.default === undefined && written.default !== undefined) {
    merged.default = written.default;
  }

  if (generated.properties) {
    const writtenProperties = written.properties ?? {};
    merged.properties = {};

    for (const [name, schema] of Object.entries(generated.properties)) {
      merged.properties[name] = mergeSchema(
        schema,
        writtenProperties[name],
        `${at}.${name}`,
        problems,
      );
    }

    for (const [name, schema] of Object.entries(writtenProperties)) {
      if (name in generated.properties) continue;
      if (readOutside.includes(name)) merged.properties[name] = schema;
      else problems.push(`${at}.${name} is documented, but the zod schema does not accept it`);
    }
  }

  if (generated.items && written.items) {
    merged.items = mergeSchema(generated.items, written.items, `${at}[]`, problems);
  }

  if (
    typeof generated.additionalProperties === "object" &&
    typeof written.additionalProperties === "object"
  ) {
    merged.additionalProperties = mergeSchema(
      generated.additionalProperties,
      written.additionalProperties,
      `${at}{}`,
      problems,
    );
  }

  if (Array.isArray(generated.anyOf)) {
    const writtenBranches = written.anyOf ?? written.oneOf;
    const pairwise = writtenBranches?.length === generated.anyOf.length;

    merged.anyOf = generated.anyOf.map((branch, index) => {
      if (pairwise) return mergeSchema(branch, writtenBranches[index], `${at}|${index}`, problems);
      // `nullable` / single-type docs describe the non-null branch of the same type.
      if (branch.type && branch.type !== "null" && branch.type === written.type) {
        return mergeSchema(branch, withoutAnnotations(written), `${at}|${index}`, problems);
      }
      return branch;
    });
  }

  // Keep the hand-written key and property order, so the reference reads as it was written.
  if (merged.properties && written.properties) {
    merged.properties = inWrittenOrder(merged.properties, written.properties);
  }
  return inWrittenOrder(merged, written);
}

function inWrittenOrder(merged, written) {
  const keys = [
    ...Object.keys(written).filter((key) => key in merged),
    ...Object.keys(merged).filter((key) => !(key in written)),
  ];
  return Object.fromEntries(keys.map((key) => [key, merged[key]]));
}

function applyGeneratedRequests(document) {
  const generated = JSON.parse(fs.readFileSync(generatedRequestsPath, "utf8"));
  const problems = [];
  const replacedComponents = new Map();

  const documented = new Map();
  for (const [route, item] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (item[method]) documented.set(`${method.toUpperCase()} ${route}`, item[method]);
    }
  }

  for (const [key, entry] of Object.entries(generated.operations)) {
    const operation = documented.get(key);
    if (!operation) {
      problems.push(`${key} is in the server's request registry but not in specs/paths`);
      continue;
    }

    if (entry.parameters) {
      operation.parameters ??= [];

      for (const parameter of entry.parameters) {
        const written = operation.parameters.find(
          (candidate) => candidate.name === parameter.name && candidate.in === parameter.in,
        );

        if (written) {
          written.required = parameter.required;
          written.schema = mergeSchema(
            parameter.schema,
            written.schema,
            `${key} ${parameter.in}:${parameter.name}`,
            problems,
          );
        } else {
          operation.parameters.push({ ...parameter });
        }
      }

      const covered = new Set(entry.parameters.map((parameter) => parameter.in));
      const outside = entry.readOutsideSchema?.query ?? [];
      for (const written of operation.parameters) {
        const known = entry.parameters.some(
          (parameter) => parameter.name === written.name && parameter.in === written.in,
        );
        if (covered.has(written.in) && !known && !outside.includes(written.name)) {
          problems.push(
            `${key} ${written.in}:${written.name} is documented, but the zod schema does not accept it`,
          );
        }
      }
    }

    if (entry.requestBody) {
      const media = operation.requestBody?.content?.["application/json"];
      const outside = entry.readOutsideSchema?.body ?? [];

      if (!media) {
        problems.push(`${key} validates a JSON body that the spec does not document`);
      } else if (typeof media.schema?.$ref === "string") {
        const name = media.schema.$ref.split("/").pop();
        const component = document.components?.schemas?.[name];

        if (replacedComponents.has(name)) {
          problems.push(
            `${key} and ${replacedComponents.get(name)} share request component ${name}`,
          );
        } else {
          replacedComponents.set(name, key);
          document.components.schemas[name] = mergeSchema(
            entry.requestBody.schema,
            component,
            name,
            problems,
            outside,
          );
        }
      } else {
        media.schema = mergeSchema(
          entry.requestBody.schema,
          media.schema,
          `${key} body`,
          problems,
          outside,
        );
      }
    }
  }

  for (const [key, operation] of documented) {
    if (key in generated.operations || key in generated.handWritten) continue;

    const hasQuery = (operation.parameters ?? []).some((parameter) => parameter.in === "query");
    if (hasQuery || operation.requestBody?.content?.["application/json"]) {
      problems.push(
        `${key} documents query parameters or a JSON body but is in neither OPENAPI_REQUEST_REGISTRY nor HAND_WRITTEN_REQUESTS (apps/server/src/openapi/registry.ts)`,
      );
    }
  }

  for (const key of Object.keys(generated.handWritten)) {
    if (!documented.has(key))
      problems.push(`${key} is listed as hand-written but not in specs/paths`);
  }

  if (problems.length > 0) {
    throw new Error(
      `The spec and the server's zod validators disagree (${problems.length}):\n  ${problems.join("\n  ")}`,
    );
  }

  return Object.keys(generated.operations).length;
}

const bundled = resolve(load(path.join(specsDir, "openapi.yaml")), specsDir, null);
const zodOperationCount = applyGeneratedRequests(bundled);
assertRefsResolve(bundled);

const bundledYaml = YAML.stringify(bundled, { lineWidth: 0 });

// Everything this script writes is committed, so it all goes through Prettier — otherwise a build
// leaves the working tree failing the repo-wide `npm run format` check in CI.
const prettierConfig = await prettier.resolveConfig(publicJsonPath);
const bundledJson = await prettier.format(JSON.stringify(bundled), {
  ...prettierConfig,
  filepath: publicJsonPath,
});

/** Writes only when the content differs, so an unchanged spec leaves every file untouched. */
function writeIfChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === text) return false;
  fs.writeFileSync(file, text, "utf8");
  return true;
}

// The three spec files are written only after the pages are generated (see the end of this file).
// Written first, a failed generation left the served spec ahead of the pages, and the re-run saw no
// diff in the spec and kept that partial state.
const specOutputs = [
  [bundlePath, bundledYaml],
  [publicYamlPath, bundledYaml],
  [publicJsonPath, bundledJson],
];

const pathCount = Object.keys(bundled.paths ?? {}).length;
const schemaCount = Object.keys(bundled.components?.schemas ?? {}).length;
console.log(`[api-docs] bundled ${pathCount} paths and ${schemaCount} schemas from specs/`);
console.log(
  `[api-docs] request schemas of ${zodOperationCount} operations taken from the server's zod validators` +
    (keptRequestRefs.size > 0
      ? `; hand-written components kept inside them: ${[...keptRequestRefs].join(", ")}`
      : ""),
);

/* ---------------------------------------------------------------- generate */

// Pages are built in a temporary folder and copied over only when they differ. A failed generation
// leaves the existing pages alone, and an unchanged spec touches no file. The hand-written
// `overview.mdx` files and the `meta.json` navigation are authored by us and are never written
// or deleted here.

// Run from the app root and reference the schema exactly as `lib/openapi.ts` does. Generated pages
// record this string in `_openapi.preload`, and the runtime looks documents up by that same key —
// an absolute path here would not match the `["./openapi.yaml"]` registered at render time.
process.chdir(appRoot);

const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-docs-"));

/** Generated pages under `dir`, relative to it. `overview.mdx` files are hand-written. */
function generatedPages(dir, prefix = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) return generatedPages(path.join(dir, entry.name), relative);
    return entry.name.endsWith(".mdx") && entry.name !== "overview.mdx" ? [relative] : [];
  });
}

// The page copy of the spec. An operation with no description gets its summary as one, so its page
// still has a meta description. The served spec is left exactly as written.
const pageDocument = YAML.parse(bundledYaml);
const undescribed = [];
for (const [route, item] of Object.entries(pageDocument.paths ?? {})) {
  for (const method of HTTP_METHODS) {
    const operation = item[method];
    if (!operation || operation.description || item.description) continue;

    undescribed.push(`${method.toUpperCase()} ${route}`);
    if (operation.summary) operation.description = operation.summary;
  }
}
if (undescribed.length > 0) {
  console.warn(
    `[api-docs] WARNING: ${undescribed.length} operation(s) have no description; their pages use the summary as the meta description. Add one in specs/paths:\n  ${undescribed.join("\n  ")}`,
  );
}

try {
  await generateFiles({
    // Keyed by the same "./openapi.yaml" string `lib/openapi.ts` registers, so the pages' preload
    // keys still match at runtime. The bundle is passed in memory because the file on disk is only
    // updated once generation has succeeded.
    input: createOpenAPI({
      input: { "./openapi.yaml": () => pageDocument },
      proxyUrl: "/api/proxy",
    }),
    output: stagingDir,
    per: "operation",
    groupBy: "tag",
  });

  const pages = generatedPages(stagingDir);
  const formatted = new Map();
  let updated = 0;
  let removed = 0;

  // `fumadocs-openapi` does not emit Prettier-formatted MDX, and these pages are committed. Without
  // formatting, any build leaves a tree that fails the repo-wide `npm run format` check in CI.
  await Promise.all(
    pages.map(async (relative) => {
      const destination = path.join(outputDir, relative);
      const source = fs.readFileSync(path.join(stagingDir, relative), "utf8");

      formatted.set(
        relative,
        await prettier.format(source, {
          ...(await prettier.resolveConfig(destination)),
          filepath: destination,
        }),
      );
    }),
  );

  // Swept before writing: on a case-insensitive disk a page renamed only in case is written through
  // the old file name, and a sweep after the write would delete it. The sweep walks folders as deep
  // as the staging does; files at the top level (the hand-written `index.mdx`) are never generated.
  const keep = new Set(pages);
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    for (const relative of generatedPages(path.join(outputDir, entry.name), entry.name)) {
      if (!keep.has(relative)) {
        fs.rmSync(path.join(outputDir, relative));
        removed++;
      }
    }
  }

  for (const [relative, text] of formatted) {
    const destination = path.join(outputDir, relative);

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (writeIfChanged(destination, text)) updated++;
  }

  console.log(
    `[api-docs] ${pages.length} MDX pages in content/api-reference (${updated} written, ${removed} removed)`,
  );

  // Last, so the served spec never runs ahead of the pages.
  const specsWritten = specOutputs.filter(([file, text]) => writeIfChanged(file, text)).length;
  console.log(
    `[api-docs] openapi.yaml, public/openapi.{json,yaml}: ${specsWritten} of ${specOutputs.length} written`,
  );

  // Sidebar order lives in each folder's hand-written `meta.json`, so a new operation gets a page
  // that no menu links to until someone lists it there. Say so instead of shipping it silently.
  const unlisted = [];
  for (const folder of new Set(pages.map((relative) => path.dirname(relative)))) {
    if (folder === ".") continue;

    const metaPath = path.join(outputDir, folder, "meta.json");
    const listed = fs.existsSync(metaPath)
      ? new Set(JSON.parse(fs.readFileSync(metaPath, "utf8")).pages ?? [])
      : new Set();

    for (const relative of pages.filter((page) => path.dirname(page) === folder)) {
      const name = path.basename(relative, ".mdx");
      if (!listed.has(name)) unlisted.push(`${folder}/${name}`);
    }
  }

  if (unlisted.length > 0) {
    const list = unlisted.map((page) => `  ${page}`).join("\n");
    console.warn(
      `[api-docs] WARNING: ${unlisted.length} page(s) are missing from their folder's meta.json and will not appear in the sidebar:\n${list}`,
    );

    // Strict only in the CI drift check: a hosted docs build must not fail over navigation.
    if (process.env.API_DOCS_STRICT) process.exitCode = 1;
  }
} finally {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
