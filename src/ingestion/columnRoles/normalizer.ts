/**
 * Normalize header text for pattern matching.
 */
export function normalizeHeader(header: string | null | undefined): string {
  if (header === null || header === undefined) {
    return ''
  }

  return String(header)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .replace(/[_-]+/g, ' ')     // Replace underscores/hyphens with spaces
}
