/**
 * Frontmatter dates are UTC midnight, so they are formatted in UTC: in the build host's own
 * time zone a host west of UTC would print the day before the `<time dateTime>` value.
 */
export function formatDate(value: string | Date, month: "short" | "long" = "short"): string {
  return new Date(value).toLocaleDateString("en-US", {
    month,
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
