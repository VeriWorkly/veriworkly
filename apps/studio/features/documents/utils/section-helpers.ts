/**
 * Check if a section is visible in a document
 */
export function isSectionVisible(
  sections: Array<{ id: string; visible?: boolean }>,
  key: string,
): boolean {
  if (!sections || !Array.isArray(sections)) return true;
  const section = sections.find((item) => item.id === key);
  return section ? section.visible !== false : true;
}
