const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Document colours are interpolated into the exported HTML's `<style>` and into PDF
 * styles, so anything but a plain hex colour — a half-typed value, or one from an
 * imported or hand-edited file — is refused rather than escaped.
 */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value.trim());
}

/** The colour if it is a plain hex colour, else `fallback`. */
export function toSafeHexColor(value: unknown, fallback: string): string {
  return isHexColor(value) ? value.trim() : fallback;
}
