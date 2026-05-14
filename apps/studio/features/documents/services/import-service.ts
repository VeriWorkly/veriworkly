"use client";

export async function importDocumentFromFile<T>(
  file: File,
  parser: (content: unknown) => T | null,
  normalizer?: (data: T) => T,
) {
  const content = await file.text();
  const parsed = parser(JSON.parse(content));

  if (!parsed) {
    throw new Error("Invalid document JSON");
  }

  return normalizer ? normalizer(parsed) : parsed;
}
