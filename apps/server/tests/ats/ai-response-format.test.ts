import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  CONVERTED_RESUME_JSON_SCHEMA,
  INSIGHTS_JSON_SCHEMA,
  jsonResponseFormat,
  providerRouting,
} from "#services/ats/aiResponseFormat";
import { convertedResumeSchema, insightsSchema } from "#services/ats/ai";

/**
 * The JSON Schemas we send to the provider are written by hand next to Zod schemas that parse
 * what comes back. Two hand-maintained descriptions of one shape drift, and the failure is
 * quiet: the model keeps returning valid JSON against a stale schema, and the field we stopped
 * asking for arrives empty rather than missing, because the Zod side defaults it. These tests
 * make that drift loud.
 */

/** Field names Zod will accept at a given path, recursed through the wrapper types. */
function zodKeys(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> | null {
  let current: z.ZodTypeAny = schema;
  for (;;) {
    if (current instanceof z.ZodObject) return current.shape as Record<string, z.ZodTypeAny>;
    if (current instanceof z.ZodArray) {
      current = current.element as z.ZodTypeAny;
      continue;
    }
    if (
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable ||
      current instanceof z.ZodEffects
    ) {
      current =
        current instanceof z.ZodEffects
          ? (current.innerType() as z.ZodTypeAny)
          : (current.unwrap() as z.ZodTypeAny);
      continue;
    }
    return null;
  }
}

type JsonSchemaNode = {
  type?: unknown;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchemaNode;
};

/** Property names the JSON Schema declares at a given path, stepping through array wrappers. */
function jsonKeys(node: JsonSchemaNode): Record<string, JsonSchemaNode> | null {
  if (node.properties) return node.properties;
  if (node.items) return jsonKeys(node.items);
  return null;
}

function assertSameShape(zodSchema: z.ZodTypeAny, node: JsonSchemaNode, path: string) {
  const shape = zodKeys(zodSchema);
  const properties = jsonKeys(node);

  if (!shape) {
    expect(properties, `${path}: JSON Schema has fields where Zod expects a leaf`).toBeNull();
    return;
  }

  expect(properties, `${path}: JSON Schema is missing an object Zod expects`).not.toBeNull();
  expect(Object.keys(properties!).sort(), `${path}: field names differ`).toEqual(
    Object.keys(shape).sort(),
  );

  for (const [key, child] of Object.entries(shape)) {
    assertSameShape(child, properties![key], `${path}.${key}`);
  }
}

/** Strict structured outputs reject a schema that omits either of these, at any depth. */
function assertStrictObjects(node: JsonSchemaNode, path: string) {
  if (node.properties) {
    expect(node.additionalProperties, `${path}: strict mode needs additionalProperties:false`).toBe(
      false,
    );
    expect(node.required?.slice().sort(), `${path}: strict mode requires every property`).toEqual(
      Object.keys(node.properties).sort(),
    );
    for (const [key, child] of Object.entries(node.properties)) {
      assertStrictObjects(child, `${path}.${key}`);
    }
  }
  if (node.items) assertStrictObjects(node.items, `${path}[]`);
}

describe("ATS AI response schemas", () => {
  it("insights JSON Schema matches the Zod schema field for field", () => {
    assertSameShape(insightsSchema, INSIGHTS_JSON_SCHEMA, "insights");
  });

  it("converted resume JSON Schema matches the Zod schema field for field", () => {
    assertSameShape(convertedResumeSchema, CONVERTED_RESUME_JSON_SCHEMA, "resume");
  });

  it("every object satisfies the strict structured-output subset", () => {
    assertStrictObjects(INSIGHTS_JSON_SCHEMA, "insights");
    assertStrictObjects(CONVERTED_RESUME_JSON_SCHEMA, "resume");
  });

  it("accepts an all-null response, so a sparse answer is not a failed request", () => {
    const allNull = {
      explanation: null,
      missingEvidence: null,
      keywordOpportunities: null,
      recommendedImprovements: null,
      priorityOrder: null,
    };
    expect(insightsSchema.parse(allNull)).toEqual({
      explanation: "",
      missingEvidence: [],
      keywordOpportunities: [],
      recommendedImprovements: [],
      priorityOrder: [],
    });
  });
});

describe("response format selection", () => {
  it("stays on json_object unless the model opts in", () => {
    expect(jsonResponseFormat(false, "ats_insights", INSIGHTS_JSON_SCHEMA)).toEqual({
      type: "json_object",
    });
  });

  it("sends a strict json_schema when the model opts in", () => {
    expect(jsonResponseFormat(true, "ats_insights", INSIGHTS_JSON_SCHEMA)).toEqual({
      type: "json_schema",
      json_schema: { name: "ats_insights", strict: true, schema: INSIGHTS_JSON_SCHEMA },
    });
  });

  it("pins routing to providers that honour the schema", () => {
    expect(providerRouting(true, undefined)).toEqual({ provider: { require_parameters: true } });
  });

  it("leaves provider options untouched when structured outputs are off", () => {
    expect(providerRouting(false, { provider: { order: ["x"] } })).toEqual({
      provider: { order: ["x"] },
    });
  });

  it("keeps a deployment's own provider routing alongside require_parameters", () => {
    expect(providerRouting(true, { provider: { order: ["x"] } })).toEqual({
      provider: { require_parameters: true, order: ["x"] },
    });
  });
});
