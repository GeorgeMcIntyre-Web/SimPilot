export const normalizeRobotNumber = (value: string | null | undefined) =>
  (value ?? '')
    .toString()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

export const coerceRobotLabel = (value: unknown, fallback: string): string => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'boolean') return fallback
  const text = String(value).trim()
  if (text.length === 0) return fallback
  return text
}
