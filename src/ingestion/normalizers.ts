// Normalizers for Canonical IDs
// Provides consistent normalization and ID building for schema-agnostic ingestion

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalize area name to consistent format
 * Examples:
 *   "RR UN 1" → "RR UN 1"
 *   "  fr   fl  1  " → "FR FL 1"
 *   null → null
 */
export function normalizeAreaName(raw: string | null | undefined): string | null {
  if (!raw) return null

  const trimmed = String(raw).trim()
  if (!trimmed) return null

  return trimmed
    .toUpperCase()
    .replace(/\s+/g, ' ')  // collapse multiple spaces
}

/**
 * Normalize station code to consistent format
 * Examples:
 *   "CA008" → "CA8"
 *   "010" → "10"
 *   "OP010" → "10"
 *   "ST-020" → "20"
 *   "STATION 030" → "30"
 *   null → null
 */
export function normalizeStationCode(raw: string | null | undefined): string | null {
  if (!raw) return null

  let normalized = String(raw).trim()
  if (!normalized) return null

  // Remove common prefixes - try STATION first (longest match)
  normalized = normalized.replace(/^STATION\s*[-_]?/i, '')
  normalized = normalized.replace(/^OP\s*[-_]?/i, '')
  normalized = normalized.replace(/^ST\s*[-_]?/i, '')

  // Strip leading zeros from numeric parts
  // For codes like "CA008" → "CA8", for "010" → "10"
  normalized = normalized.replace(/(\d+)/g, (match) => {
    const num = parseInt(match, 10)
    return num.toString()
  })

  return normalized.toUpperCase()
}

/**
 * Normalize robot caption for IDs
 * Examples:
 *   "R01" → "R01"
 *   "  r02  " → "R02"
 *   "Robot 03" → "ROBOT 03"
 */
function normalizeRobotCaption(raw: string | null | undefined): string | null {
  if (!raw) return null

  const trimmed = String(raw).trim()
  if (!trimmed) return null

  return trimmed.toUpperCase()
}

/**
 * Normalize tool code for IDs
 * Examples:
 *   "T01" → "T01"
 *   "  gjr 10  " → "GJR 10"
 */
function normalizeToolCode(raw: string | null | undefined): string | null {
  if (!raw) return null

  const trimmed = String(raw).trim()
  if (!trimmed) return null

  return trimmed.toUpperCase()
}

// ============================================================================
// AREA INFERENCE (for Assemblies Lists and Tool Lists)
// ============================================================================

/**
 * Infer area name from filename and optional workbook metadata
 * Used by Assemblies Lists and Tool Lists which lack explicit area columns
 *
 * Examples:
 *   "J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm" → "FRONT UNIT"
 *   "STLA_S_REAR_UNIT_Assemblies_List.xlsm" → "REAR UNIT"
 *   "STLA_S_UNDERBODY_Assemblies_List.xlsm" → "UNDERBODY"
 *
 * Note: This returns a generic area (e.g., "FRONT UNIT") which may not match
 * the more specific sub-areas in Simulation Status (e.g., "Front Rail LH").
 * This is a data limitation, not a code issue.
 */
export function inferAssembliesAreaName(args: {
  filename: string
  workbookAreaCell?: string | null
}): string | null {
  // Try workbook metadata first
  if (args.workbookAreaCell) {
    const normalized = normalizeAreaName(args.workbookAreaCell)
    if (normalized) return normalized
  }

  // Inspect filename
  const upper = args.filename.toUpperCase()

  if (upper.includes('FRONT_UNIT') || upper.includes('FRONT UNIT')) {
    return normalizeAreaName('FRONT UNIT')
  }

  if (upper.includes('REAR_UNIT') || upper.includes('REAR UNIT')) {
    return normalizeAreaName('REAR UNIT')
  }

  if (upper.includes('UNDERBODY')) {
    return normalizeAreaName('UNDERBODY')
  }

  if (upper.includes('BOTTOM_TRAY') || upper.includes('BOTTOM TRAY')) {
    return normalizeAreaName('BOTTOM TRAY')
  }

  return null
}

/**
 * Extract raw station code from Assemblies List station labels
 * Assemblies "Station" cells contain compound labels like:
 *   "S010 GJR 02 - 03" → extract "S010"
 *   "BN010 TT1" → extract "BN010"
 *   "010" → extract "010"
 *
 * Returns the raw station code (before normalization)
 */
export function extractRawStationCodeFromAssembliesLabel(
  label: string | null | undefined
): string | null {
  if (!label) return null

  const trimmed = String(label).trim()
  if (!trimmed) return null

  // Try alphanumeric pattern first (e.g., "S010", "BN010", "CA008")
  const alphaNumMatch = trimmed.match(/^([A-Z]{1,2}\d{1,4})\b/i)
  if (alphaNumMatch) {
    return alphaNumMatch[1].toUpperCase()
  }

  // Try numeric pattern (e.g., "010", "20")
  const numMatch = trimmed.match(/^(\d{1,4})\b/)
  if (numMatch) {
    return numMatch[1]
  }

  return null
}

// ============================================================================
// CANONICAL ID BUILDERS
// ============================================================================

/**
 * Build canonical station ID from area and station
 *
 * Rules:
 * - Both present: "AREA|STATION"
 * - Only station: "__GLOBAL__|STATION"
 * - Only area: "AREA|__NO_STATION__"
 * - Neither: null
 *
 * Examples:
 *   ("RR UN 1", "CA008") → "RR UN 1|CA8"
 *   (null, "010") → "__GLOBAL__|10"
 *   ("RR UN 1", null) → "RR UN 1|__NO_STATION__"
 */
export function buildStationId(
  area: string | null | undefined,
  station: string | null | undefined
): string | null {
  const normalizedArea = normalizeAreaName(area)
  const normalizedStation = normalizeStationCode(station)

  // Guard: both missing
  if (!normalizedArea && !normalizedStation) {
    return null
  }

  // Both present
  if (normalizedArea && normalizedStation) {
    return `${normalizedArea}|${normalizedStation}`
  }

  // Only station
  if (normalizedStation) {
    return `__GLOBAL__|${normalizedStation}`
  }

  // Only area
  return `${normalizedArea}|__NO_STATION__`
}

/**
 * Build canonical robot ID from station ID and robot caption
 *
 * Format: "STATION_ID|R:CAPTION"
 *
 * Examples:
 *   ("RR UN 1|CA8", "R01") → "RR UN 1|CA8|R:R01"
 *   (null, "R01") → null
 *   ("RR UN 1|CA8", null) → null
 */
export function buildRobotId(
  stationId: string | null | undefined,
  robotCaption: string | null | undefined
): string | null {
  if (!stationId) return null

  const normalizedCaption = normalizeRobotCaption(robotCaption)
  if (!normalizedCaption) return null

  return `${stationId}|R:${normalizedCaption}`
}

/**
 * Build canonical tool ID from station ID and tool code
 *
 * Format: "STATION_ID|T:TOOL_CODE"
 * Fallback: use fallbackKey if toolCode is missing
 *
 * Examples:
 *   ("RR UN 1|CA8", "GJR 10", null) → "RR UN 1|CA8|T:GJR 10"
 *   ("RR UN 1|CA8", null, "BN010 GJR 10") → "RR UN 1|CA8|T:BN010 GJR 10"
 *   (null, "GJR 10", null) → null
 */
export function buildToolId(
  stationId: string | null | undefined,
  toolCode: string | null | undefined,
  fallbackKey?: string | null | undefined
): string | null {
  if (!stationId) return null

  const normalizedTool = normalizeToolCode(toolCode)
  if (normalizedTool) {
    return `${stationId}|T:${normalizedTool}`
  }

  // Try fallback
  const normalizedFallback = normalizeToolCode(fallbackKey)
  if (normalizedFallback) {
    return `${stationId}|T:${normalizedFallback}`
  }

  return null
}
