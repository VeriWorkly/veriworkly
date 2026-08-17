import { z } from "zod";

import { isValidPhoneValue } from "./phone.js";

/**
 * Field-level rules shared by every consumer of the master profile.
 *
 * The messages are constants rather than strings written at each call site so the studio's
 * inline errors and the server's 4xx bodies describe the same problem in the same words.
 */
export const monthDatePattern = /^\d{4}-(0[1-9]|1[0-2])$/;
export const yearDatePattern = /^\d{4}$/;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const VALIDATION_MESSAGES = {
  email: "Enter a valid email address.",
  phone: "Enter a valid phone number, including country code.",
  url: "Use a valid URL starting with http:// or https://.",
} as const;

/** Strict: a blank string is not a valid address. For fields the UI requires. */
export function isEmail(value: string): boolean {
  return emailPattern.test(value);
}

/** Empty is valid: an optional email that has not been filled in is not an error. */
export function isEmailOrEmpty(value: string): boolean {
  return !value || emailPattern.test(value);
}

/** Import-side normalization for emails: returns valid lowercase email or empty string. */
export function sanitizeImportedEmail(email?: string | null): string {
  if (!email) return "";
  const trimmed = email.trim().toLowerCase();
  return isEmail(trimmed) ? trimmed : "";
}

/** Empty is valid: these are optional fields, and a blank one is not an error. */
export function isHttpUrl(value: string): boolean {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Strict counterpart to {@link isHttpUrl}: blank is not a URL. */
export function isValidAbsoluteUrl(value: string): boolean {
  if (!value) return false;
  return isHttpUrl(value);
}

/**
 * Users type "veriworkly.com"; anchors need a scheme. Protocol-relative and already-schemed
 * values are left alone so this is safe to run on every save.
 */
export function normalizeAbsoluteUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function isMonthDate(value: string): boolean {
  return !value || monthDatePattern.test(value);
}

export function isYearDate(value: string): boolean {
  return !value || yearDatePattern.test(value);
}

/**
 * `max(24)` is input headroom, not the storage ceiling — it leaves room for the spaces,
 * dashes and parentheses people type before the value is folded down to E.164, which tops
 * out at 16 characters.
 */
export const phoneSchema = z.string().max(24).refine(isValidPhoneValue, VALIDATION_MESSAGES.phone);

/** Blank is storable. Blocking a save on an empty optional field is a UI concern. */
export const emailOrEmptySchema = z
  .string()
  .max(200)
  .refine(isEmailOrEmpty, VALIDATION_MESSAGES.email);

export const urlOrEmptySchema = z
  .string()
  .max(2048)
  .refine(isHttpUrl, "URL must start with http:// or https://.");

export const monthDateSchema = z.string().max(7).refine(isMonthDate, "Use YYYY-MM format.");

export const yearDateSchema = z.string().max(4).refine(isYearDate, "Use YYYY format.");

/**
 * Generic ID generator for master profile and projection items.
 */
export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Type-safe deep clone helper.
 */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
