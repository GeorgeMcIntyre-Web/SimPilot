/**
 * Normalize station code for fuzzy matching.
 *
 * Examples:
 * - "010" → "10"
 * - "OP-20" → "20"
 * - "Station 030" → "30"
 * - "UB_040" → "ub040"
 */
export function normalizeStation(code: string | undefined): string {
  if (code === undefined || code === null) {
    return ''
  }

  const str = String(code).toLowerCase().trim()

  const withoutPrefix = str
    .replace(/^(op|station|st|cell)[-_.\s]*/i, '')
    .replace(/[-_.\s]/g, '')

  if (/^\d+$/.test(withoutPrefix)) {
    return withoutPrefix.replace(/^0+/, '') || '0'
  }

  return withoutPrefix
}

/**
 * Normalize area name for fuzzy matching.
 *
 * Examples:
 * - "Underbody" → "underbody"
 * - "UNDER_BODY" → "underbody"
 * - "UB LH" → "ublh"
 */
export function normalizeArea(name: string | undefined): string {
  if (name === undefined || name === null) {
    return ''
  }

  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[-_.\s]/g, '')
}

/**
 * Normalize line code for matching.
 */
export function normalizeLine(code: string | undefined): string {
  if (code === undefined || code === null) {
    return ''
  }

  return String(code)
    .toLowerCase()
    .trim()
    .replace(/[-_.\s]/g, '')
}

/**
 * Normalize robot/device name for matching.
 */
export function normalizeAssetName(name: string | undefined): string {
  if (name === undefined || name === null) {
    return ''
  }

  return String(name)
    .toLowerCase()
    .trim()
    .replace(/^(robot|device|gun|tool)[-_.\s]*/i, '')
    .replace(/[-_.\s]/g, '')
}
