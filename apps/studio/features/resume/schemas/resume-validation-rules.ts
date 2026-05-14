import { z } from "zod";

export const monthDatePattern = /^\d{4}-(0[1-9]|1[0-2])$/;
export const yearDatePattern = /^\d{4}$/;

export function countPhoneDigits(value: string) {
  return value.replace(/\D/g, "").length;
}

export function isTenDigitPhone(value: string) {
  return countPhoneDigits(value) === 10;
}

export function isHttpUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isMonthDate(value: string) {
  return !value || monthDatePattern.test(value);
}

export function isYearDate(value: string) {
  return !value || yearDatePattern.test(value);
}

export const phoneSchema = z
  .string()
  .max(24)
  .refine(isTenDigitPhone, "Phone number must have exactly 10 digits.");

export const phoneOrEmptySchema = z
  .string()
  .max(24)
  .refine((value) => !value || isTenDigitPhone(value), "Phone number must have exactly 10 digits.");

export const urlOrEmptySchema = z
  .string()
  .max(2048)
  .refine(isHttpUrl, "URL must start with http:// or https://.");

export const monthDateSchema = z.string().max(7).refine(isMonthDate, "Use YYYY-MM format.");

export const yearDateSchema = z.string().max(4).refine(isYearDate, "Use YYYY format.");
