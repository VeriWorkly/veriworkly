import { z } from "zod";

/**
 * Lenient field parsers for model output.
 *
 * Every field is nullable and optional and defaults to an empty value, so a model that leaves a
 * field out or answers `null` produces a sparse result rather than a failed request. Lengths and
 * counts stay bounded: an oversized reply is malformed, and failing it earns a retry.
 */

export const text = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .nullable()
    .optional()
    .transform((value) => value ?? "");

export const trimmedText = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .nullable()
    .optional()
    .transform((value) => value?.trim() ?? "");

export const flag = z
  .boolean()
  .nullable()
  .optional()
  .transform((value) => value ?? false);

export const list = <T extends z.ZodType>(item: T, maxItems: number) =>
  z
    .array(item)
    .max(maxItems)
    .nullable()
    .optional()
    .transform((value): z.output<T>[] => value ?? []);

export const textList = (maxLength: number, maxItems: number) => list(text(maxLength), maxItems);
