import type { OpenAPIPageProps_Preloaded } from "fumadocs-openapi/ui";

import { createOpenAPI } from "fumadocs-openapi/server";

export const openapi = createOpenAPI({
  input: ["./openapi.yaml"],
  proxyUrl: "/api/proxy",
});

type Preloaded = OpenAPIPageProps_Preloaded["preloaded"];
type PageProps = Omit<OpenAPIPageProps_Preloaded, "preloaded">;
type Node = Record<string, unknown>;

const isObject = (value: unknown): value is Node => typeof value === "object" && value !== null;

/**
 * The preloaded spec cut down to what one page renders: its own operations and webhooks, every
 * node they `$ref`, and the top-level fields. `<OpenAPIPage />` is a client component, so whatever
 * it receives is serialised into the page's HTML; the whole spec would add ~380 KB to every page.
 */
export function slicePreloaded(preloaded: Preloaded, props: PageProps): Preloaded {
  const doc = preloaded.docs[props.document] as unknown as Node | undefined;
  if (!doc) return preloaded;

  const {
    paths = {},
    webhooks = {},
    components = {},
    ...top
  } = doc as {
    paths?: Record<string, Node>;
    webhooks?: Record<string, Node>;
    components?: Node;
  };

  // Security schemes are referenced by name, not `$ref`, so they all stay.
  const out: Node = { ...top, components: { securitySchemes: components.securitySchemes } };
  const queue: unknown[] = [top];

  function pick(
    group: "paths" | "webhooks",
    source: Record<string, Node>,
    key: string,
    method: string,
  ) {
    const item = source[key];
    if (!item) return;

    // The path item's shared fields (parameters, servers) plus only this method.
    const shared = Object.fromEntries(
      Object.entries(item).filter(([field]) => !HTTP_METHODS.has(field) || field === method),
    );
    const target = ((out[group] as Node | undefined) ??= {});
    target[key] = { ...(target[key] as Node | undefined), ...shared };
    queue.push(shared);
  }

  for (const { path, method } of props.operations ?? []) pick("paths", paths, path, method);
  for (const { name, method } of props.webhooks ?? []) pick("webhooks", webhooks, name, method);

  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const node = queue.pop();
    if (!isObject(node) || seen.has(node)) continue;
    seen.add(node);

    if (typeof node.$ref === "string" && node.$ref.startsWith("#/")) {
      const target = include(doc, out, node.$ref);
      if (target !== undefined) queue.push(target);
    }
    for (const value of Object.values(node)) queue.push(value);
  }

  return { ...preloaded, docs: { [props.document]: out as unknown as Preloaded["docs"][string] } };
}

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
  "query",
]);

/** Copies the node at a local JSON pointer from `doc` into `out` at the same place. */
function include(doc: Node, out: Node, ref: string): unknown {
  const keys = ref
    .slice(2)
    .split("/")
    .map((key) => decodeURIComponent(key).replace(/~1/g, "/").replace(/~0/g, "~"));

  let source: unknown = doc;
  let target = out;

  for (const [index, key] of keys.entries()) {
    if (!isObject(source)) return undefined;
    const next = source[key];

    if (index === keys.length - 1 || Array.isArray(next)) {
      target[key] = next;
      return next;
    }
    // Already copied whole: nothing to add.
    if (target[key] === next) return undefined;

    target = (target[key] ??= {}) as Node;
    source = next;
  }

  return undefined;
}
