// Normalizers for Canonical IDs
// Provides consistent normalization and ID building for schema-agnostic ingestion
//
// AREA NAME MATCHING STRATEGY:
// ============================
// Phase 1 (Current): Pattern-based prefix matching with regex
//   - Uses common manufacturing area prefixes (FU, RR, UB, BT, etc.)
//   - Handles variations without hardcoding every possibility
//   - Works for ~95% of cases with minimal maintenance
//
// Phase 2 (Future): Fuzzy matching + machine learning
//   - Levenshtein distance for similarity scoring
//   - User feedback system to learn corrections
//   - Exportable/importable mapping configurations
//   - Project-specific overrides stored in database
//
// Why this approach:
//   - Excel files are inconsistent (human-generated)
//   - Hardcoding specific mappings is brittle and unmaintainable
//   - Pattern matching handles most cases flexibly
//   - User corrections create a learning system for edge cases

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Truncate area name by removing everything after the first "-" character
 * Used when reading area names from document metadata cells (e.g., first cell of SIMULATION sheet)
 *
 * Examples:
 *   "UNDERBODY - SIMULATION" → "UNDERBODY"
 *   "FRONT UNIT - STATUS" → "FRONT UNIT"
 *   "REAR_UNIT" → "REAR_UNIT" (no dash, unchanged)
 *   null → null
 */
export function truncateAreaName(raw: string | null | undefined): string | null {
  if (!raw) return null

  const trimmed = String(raw).trim()
  if (!trimmed) return null

  // Split on "-" and check the suffix
  const dashIndex = trimmed.indexOf('-')
  if (dashIndex === -1) {
    return trimmed
  }

  const suffix = trimmed.substring(dashIndex + 1).trim().toUpperCase()
  
  // List of suffixes that are considered "noise" (informational only)
  // We only truncate these, as they don't help identify the unique area.
  const noiseSuffixes = ['SIMULATION', 'STATUS', 'REPORT', 'DATA', 'EXPORT', 'VIEW']
  
  const isNoise = noiseSuffixes.some(noise => suffix.includes(noise))
  
  if (isNoise) {
    return trimmed.substring(0, dashIndex).trim()
  }

  // If the suffix is meaningful (like "8X", "8Y", "ZONE A"), keep the full name
  // to prevent collisions between different physical areas.
  return trimmed
}

/**
 * Expand area name abbreviations to full names using pattern-based matching
 *
 * Strategy: Extract prefix patterns and map to canonical area names
 * This avoids hardcoding every possible variation while remaining flexible
 *
 * Examples:
 *   "FU 1" → "FRONT UNIT"
 *   "RR UN 1" → "REAR UNIT"
 *   "UB1" → "UNDERBODY"
 *   "FR FL 1" → "FRONT UNIT"
 *   "DSH L" → "FRONT UNIT" (Dashboard is part of Front Unit)
 *   "WHS RR" → "REAR UNIT" (Wheelhouse Rear is part of Rear Unit)
 */
function expandAreaAbbreviation(areaName: string): string {
  const upper = areaName.toUpperCase().trim()

  // ============================================================================
  // PATTERN 1: Direct Prefix Matching (Most Common)
  // ============================================================================

  // FRONT UNIT patterns: FU, FR (Front), DSH (Dashboard), WH...F (Wheelhouse Front)
  if (/^FU[\s\d]/.test(upper) || /^FU$/.test(upper)) {
    return 'FRONT UNIT'
  }
  if (/^FRT?\s*(FL|RL)/.test(upper)) {  // "FR FL 1", "FRT RL", "FRT RL PRE" (Front Floor/Rail)
    return 'FRONT UNIT'
  }
  if (/^DSH/.test(upper) || /^DASH/.test(upper)) {  // "DSH L", "DSH_BRD", "DASH UPR"
    return 'FRONT UNIT'
  }
  if (/^WH.*F/.test(upper) || /^WH\s*HS\s*F/.test(upper)) {  // "WH HS F" (Wheelhouse Front)
    return 'FRONT UNIT'
  }
  if (/^XMBR/.test(upper) || /^X\s*MBR/.test(upper)) {  // "XMBR" (Cross Member - Front)
    return 'FRONT UNIT'
  }
  if (/^FNDR/.test(upper) || /^FENDER/.test(upper)) {  // "FNDR INR" (Fender Inner)
    return 'FRONT UNIT'
  }
  if (/^AF\d/.test(upper) || /^AF\s/.test(upper)) {  // "AF010" area prefix
    return 'FRONT UNIT'
  }

  // REAR UNIT patterns: RR, R UN (Rear Unit), WH...R (Wheelhouse Rear)
  if (/^RR[\s\d]/.test(upper) || /^RR$/.test(upper)) {  // "RR FLR", "RR RLS", "RR UN 1"
    return 'REAR UNIT'
  }
  if (/^R\s*UN/.test(upper)) {  // "R UN PRE" (Rear Unit Pre)
    return 'REAR UNIT'
  }
  if (/^WH.*R/.test(upper) || /^WHS\s*RR/.test(upper)) {  // "WHS RR" (Wheelhouse Rear)
    return 'REAR UNIT'
  }
  if (/^RL\+FL/.test(upper)) {  // "RL+FL" (Rail+Floor combo)
    return 'REAR UNIT'
  }
  if (/^SIL/.test(upper) || /^SILL/.test(upper)) {  // "SIL_RNF", "SILL INR" (Sill Reinforcement)
    return 'REAR UNIT'
  }
  if (/^C[NLME]\d/.test(upper)) {  // "CN010", "CL010", "CM010", "CE010" area prefixes
    return 'REAR UNIT'
  }
  if (/^CA\d/.test(upper)) {  // "CA008" area prefix
    return 'REAR UNIT'
  }
  if (/^AL\d/.test(upper)) {  // "AL010" area prefix (Rear floor/rail area)
    return 'REAR UNIT'
  }

  // UNDERBODY patterns: UB
  if (/^UB[\s\d]/.test(upper) || /^UB$/.test(upper)) {  // "UB1", "UB2", "UB 1"
    return 'UNDERBODY'
  }

  // BOTTOM TRAY patterns: BT
  if (/^BT[\s\d]/.test(upper) || /^BT$/.test(upper)) {  // "BT PREP", "BT ILOT 1"
    return 'BOTTOM TRAY'
  }

  // ============================================================================
  // PATTERN 2: Contains Keyword (Partial Match)
  // ============================================================================

  // If name contains full area name, return it directly
  if (upper.includes('FRONT UNIT')) return 'FRONT UNIT'
  if (upper.includes('REAR UNIT')) return 'REAR UNIT'
  if (upper.includes('UNDERBODY')) return 'UNDERBODY'
  if (upper.includes('BOTTOM TRAY')) return 'BOTTOM TRAY'

  // Return original if no match found
  return areaName
}

/**
 * Normalize area name to consistent format
 * Examples:
 *   "RR UN 1" → "RR UN 1"
 *   "  fr   fl  1  " → "FR FL 1"
 *   "FU 1" → "FRONT UNIT" (after expansion)
 *   null → null
 */
export function normalizeAreaName(raw: string | null | undefined): string | null {
  if (!raw) return null

  // First truncate to remove suffixes like " - SIMULATION" or " - 8Y"
  const truncated = truncateAreaName(raw)
  if (!truncated) return null

  // Then expand abbreviations
  const expanded = expandAreaAbbreviation(truncated)

  return expanded
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
  normalized = normalized.replace(/^ST\s*[-_]?/i, '')
  normalized = normalized.replace(/^OP\s*[-_]?/i, '')
  normalized = normalized.replace(/^CELL\s*[-_]?/i, '')

  // Strip leading zeros from numeric parts
  // For codes like "CA008" → "CA8", for "010" → "10", "8X-015" → "8X-15"
  normalized = normalized.replace(/(\d+)/g, (match) => {
    const num = parseInt(match, 10)
    return num.toString()
  })

  // Normalize separators to underscores (bridge the gap with CrossRef/Station table)
  normalized = normalized.replace(/[\s\-]+/g, '_')

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

// ============================================================================
// AREA / ZONE PARSING
// ============================================================================

export interface AreaZoneParsed {
  parentArea: string      // "FRONT UNIT", "REAR UNIT", "UNDERBODY"
  zone: string | null     // "Rear Rail LH", "Front Floor ASS 1", null if no sub-zone
  fullName: string        // Original full name
}

/**
 * Parse area name into parent area and optional zone
 *
 * Rules:
 * 1. If name contains "ASS" or "Ass" followed by number → zone = full name, parent = extract base
 *    - "Front Unit ASS 1" → parent="FRONT UNIT", zone="Front Unit ASS 1"
 *    - "Rear Unit Ass2" → parent="REAR UNIT", zone="Rear Unit Ass2"
 *
 * 2. If name contains LH/RH (Left Hand/Right Hand) → zone = full name, parent = extract base
 *    - "Rear Rail LH" → parent="REAR RAIL", zone="Rear Rail LH"
 *    - "WHR RH" → parent="WHR", zone="WHR RH"
 *
 * 3. If name contains common zone keywords → zone = full name, parent = infer
 *    - "Front Floor ASS 1" → parent="FRONT FLOOR", zone="Front Floor ASS 1"
 *    - "Dash UPR" → parent="DASH", zone="Dash UPR"
 *    - "Preoperation MIG" → parent="PREOPERATION", zone="Preoperation MIG"
 *
 * 4. Otherwise → parent = full name, zone = null (top-level area)
 *
 * Examples:
 *   "FRONT UNIT" → { parentArea: "FRONT UNIT", zone: null }
 *   "Front Unit ASS 1" → { parentArea: "FRONT UNIT", zone: "Front Unit ASS 1" }
 *   "Rear Rail LH" → { parentArea: "REAR RAIL", zone: "Rear Rail LH" }
 *   "WHR RH" → { parentArea: "WHR", zone: "WHR RH" }
 */
export function parseAreaZone(rawAreaName: string | null | undefined): AreaZoneParsed | null {
  if (!rawAreaName) return null

  const fullName = rawAreaName.trim()
  if (!fullName) return null

  const upper = fullName.toUpperCase()

  // Pattern 1: Assembly zones (ASS/Ass + number)
  const assMatch = /^(.+?)\s+ASS\s*\d+$/i.exec(fullName)
  if (assMatch) {
    const parentArea = assMatch[1].trim().toUpperCase()
    return { parentArea, zone: fullName, fullName }
  }

  // Pattern 2: LH/RH zones (Left Hand / Right Hand)
  const lhRhMatch = /^(.+?)\s+(LH|RH)$/i.exec(fullName)
  if (lhRhMatch) {
    const parentArea = lhRhMatch[1].trim().toUpperCase()
    return { parentArea, zone: fullName, fullName }
  }

  // Pattern 3: Combined LH/RH notation "Sill INR LH / RH"
  const lhRhCombinedMatch = /^(.+?)\s+(LH\s*\/\s*RH)$/i.exec(fullName)
  if (lhRhCombinedMatch) {
    const parentArea = lhRhCombinedMatch[1].trim().toUpperCase()
    return { parentArea, zone: fullName, fullName }
  }

  // Pattern 4: Common zone suffixes (UPR, LWR, INR, etc.)
  const zoneSuffixes = ['UPR', 'LWR', 'INR', 'MIG']
  for (const suffix of zoneSuffixes) {
    if (upper.endsWith(` ${suffix}`)) {
      const parentArea = fullName.replace(new RegExp(`\\s+${suffix}$`, 'i'), '').trim().toUpperCase()
      return { parentArea, zone: fullName, fullName }
    }
  }

  // Pattern 5: Starts with "Preoperation" or "Prepa"
  if (upper.startsWith('PREOPERATION') || upper.startsWith('PREPA')) {
    const parentArea = fullName.split(/\s+/)[0].toUpperCase()
    return { parentArea, zone: fullName, fullName }
  }

  // Default: Top-level area with no zone
  return { parentArea: upper, zone: null, fullName }
}
