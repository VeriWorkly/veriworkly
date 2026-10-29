/** An absolute http(s) URL from the API, or undefined: backend text must never become a javascript: or data: href. */
export function httpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:" ? value : undefined;
  } catch {
    return undefined;
  }
}
