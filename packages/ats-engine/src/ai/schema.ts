import { z } from "zod";

/**
 * The JSON Schema a task asks the model for, derived from the zod schema that parses the reply.
 *
 * The two are not the same shape and cannot be. The parse schema is lenient — every field
 * nullable and optional, so a model that omits half its output still parses into empty values —
 * while strict structured outputs require every property in `required`, forbid extra properties,
 * and reject length and range constraints. So the request schema is generated from the parse
 * schema and then tightened:
 *
 * - every object lists all its properties as required and sets `additionalProperties: false`;
 * - optionality is carried by `null`, written as `type: [X, "null"]`;
 * - array items are asked for as non-null — tolerating a null item is the parser's leniency, not
 *   something to invite;
 * - length, size and range keywords are dropped; the parse schema still enforces them.
 *
 * Generating it means a field added to the parse schema is asked for without anyone editing a
 * second copy. It used to be a hand-written twin held in step by a test.
 */

type Node = Record<string, unknown>;

const CONSTRAINTS = [
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "pattern",
  "format",
  "default",
];

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withoutNull(node: Node): Node {
  const type = node.type;
  if (!Array.isArray(type)) return node;
  const rest = type.filter((entry) => entry !== "null");
  return { ...node, type: rest.length === 1 ? rest[0] : rest };
}

function tighten(input: Node): Node {
  const node: Node = { ...input };
  for (const key of CONSTRAINTS) delete node[key];

  // `anyOf: [X, { type: "null" }]` → X with "null" added to its type.
  const anyOf = node.anyOf;
  if (Array.isArray(anyOf) && anyOf.length === 2 && anyOf.every(isNode)) {
    const nullIndex = anyOf.findIndex((branch) => branch.type === "null");
    const other = anyOf[1 - nullIndex];
    if (nullIndex !== -1 && typeof other.type === "string") {
      delete node.anyOf;
      return { ...node, ...tighten(other), type: [other.type, "null"] };
    }
  }

  if (isNode(node.properties)) {
    const properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, child]) => [key, tighten(child as Node)]),
    );
    node.properties = properties;
    node.required = Object.keys(properties);
    node.additionalProperties = false;
  }
  if (isNode(node.items)) node.items = withoutNull(tighten(node.items));
  return node;
}

export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Node;
  delete generated.$schema;
  return tighten(generated);
}
