/**
 * Normalized Tool List Row Types and Helpers
 *
 * Provides a unified row model that supports BMW, Ford (V801), and STLA tool lists.
 * Handles station groups vs atomic stations, mechanical vs electrical naming.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Project hint for schema selection
 */
export type ProjectHint = 'BMW_J10735' | 'FORD_V801' | 'STLA_S_ZAR' | 'UNKNOWN'

/**
 * Normalized tool list row - unified across all 3 project types
 *
 * BMW: stationGroup === stationAtomic (no group concept)
 * Ford/STLA: stationGroup from "Station" column, stationAtomic derived from tooling number
 */
export interface NormalizedToolRow {
  sourceFile: string
  projectHint: ProjectHint
  areaName: string
  stationGroup: string        // BMW: atomic station; Ford/STLA: group name
  stationAtomic: string       // BMW: same as group; Ford/STLA: derived from tooling
  equipmentType: string
  equipmentNoShown: string
  equipmentNoOpposite: string
  toolingNumberRH: string
  toolingNumberLH: string
  toolingNumberOppositeRH: string
  toolingNumberOppositeLH: string
  toolingLR: 'L' | 'R' | ''
  toolingLROpposite: 'L' | 'R' | ''
  rawRowIndex: number
  isDeleted: boolean          // Row marked as deleted (strike-through or hidden)
  raw: Record<string, unknown>
}

/**
 * Tool entity - one or more per row (RH/LH/opposite can produce multiple entities)
 */
export interface ToolEntity {
  canonicalKey: string
  displayCode: string         // Prefer tooling number, else equipment no, else station+type
  stationGroup: string
  stationAtomic: string
  areaName: string
  aliases: string[]
  source: {
    file: string
    row: number
    sheet: string
  }
  raw: Record<string, unknown>
}

/**
 * Validation report per file
 */
export interface ValidationReport {
  totalRowsRead: number
  totalNormalizedRows: number
  totalEntitiesProduced: number
  deletedRowsSkipped: number
  missingStationGroupCount: number
  missingToolingNumbersCount: number
  headerRowsSkippedCount: number
  duplicateCanonicalKeys: number
  anomalies: ValidationAnomaly[]
}

/**
 * Validation anomaly
 */
export interface ValidationAnomaly {
  type: 'TOOLING_PREFIX_MISMATCH' | 'TOOLING_STATION_MISMATCH' | 'EQUIPMENT_NO_BUT_NO_TOOLING' | 'DUPLICATE_CANONICAL_KEY' | 'DELETED_ROW' | 'POSSIBLE_SHAPE_REDACTION'
  row: number
  message: string
  data?: Record<string, unknown>
}

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

/**
 * Normalize string: trim, collapse whitespace, uppercase where appropriate
 */
export function normalizeStr(value: unknown, uppercase = false): string {
  if (value === null || value === undefined) {
    return ''
  }

  let str = String(value).trim()
  str = str.replace(/\s+/g, ' ')

  if (uppercase) {
    str = str.toUpperCase()
  }

  return str
}

/**
 * Normalize code: remove repeated dashes, normalize unicode hyphen, strip trailing/leading punctuation
 */
export function normalizeCode(value: unknown): string {
  let str = normalizeStr(value, true)

  // Replace unicode hyphens with ASCII
  str = str.replace(/[\u2010-\u2015]/g, '-')

  // Remove repeated dashes
  str = str.replace(/-+/g, '-')

  // Strip leading/trailing punctuation
  str = str.replace(/^[^\w]+/, '')
  str = str.replace(/[^\w]+$/, '')

  return str
}

/**
 * Coerce to string: numbers -> string WITHOUT scientific notation; preserve leading zeros
 */
export function coerceToString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    // Prevent scientific notation
    return value.toFixed(0)
  }

  return String(value)
}

/**
 * Extract L/R from tooling number (common suffixes: -R, -L, R-, L-, _R, _L, etc.)
 */
export function extractLR(toolingNumber: string): 'L' | 'R' | '' {
  const upper = toolingNumber.toUpperCase()

  if (upper.includes('-R') || upper.includes('_R') || upper.endsWith('R')) {
    return 'R'
  }

  if (upper.includes('-L') || upper.includes('_L') || upper.endsWith('L')) {
    return 'L'
  }

  return ''
}

/**
 * Derive atomic station from Ford/STLA tooling number
 *
 * Examples:
 * - "7F-010R-H" => "7F-010R"
 * - "7F-010L-T1" => "7F-010L"
 * - "AL_010-010" => "AL_010"
 */
export function deriveAtomicStation(toolingNumber: string, fallback: string): string {
  if (!toolingNumber) {
    return fallback
  }

  const normalized = normalizeCode(toolingNumber)

  // Ford pattern: prefix-station-suffix (e.g., 7F-010R-H)
  const fordMatch = normalized.match(/^([A-Z0-9]+[-_][0-9]+[LR]?)/)
  if (fordMatch) {
    return fordMatch[1]
  }

  // STLA pattern: similar but may have more segments
  const stlaMatch = normalized.match(/^([A-Z]+[-_][0-9]+)/)
  if (stlaMatch) {
    return stlaMatch[1]
  }

  return fallback
}

/**
 * Extract area prefix from area name
 *
 * Examples:
 * - "7F - Final Assembly" => "7F"
 * - "7M - Main Line" => "7M"
 */
export function extractAreaPrefix(areaName: string): string {
  const match = areaName.match(/^([A-Z0-9]+)/)
  if (match) {
    return match[1]
  }
  return ''
}

/**
 * Build canonical key for BMW
 *
 * Priority:
 * 1. If tooling number exists: BMW|{tooling}
 * 2. If equipment no exists: BMW|{area}|{station}|{equipNo}
 * 3. Else: BMW|{area}|{station}|{equipType}|row:{rowIndex}
 */
export function buildBMWCanonicalKey(
  area: string,
  station: string,
  equipNo: string,
  toolingNumber: string,
  equipType: string,
  rowIndex: number
): string {
  if (toolingNumber) {
    return `BMW|${normalizeCode(toolingNumber)}`
  }

  if (equipNo) {
    return `BMW|${normalizeCode(area)}|${normalizeCode(station)}|${normalizeCode(equipNo)}`
  }

  return `BMW|${normalizeCode(area)}|${normalizeCode(station)}|${normalizeCode(equipType)}|row:${rowIndex}`
}

/**
 * Build canonical key for Ford/STLA
 *
 * Priority:
 * 1. If tooling number exists: FORD|{tooling} or STLA|{tooling}
 * 2. If equipment no exists: FORD|FIDES|{equipNo} or STLA|FIDES|{equipNo}
 * 3. Else: drop row (unresolvable)
 */
export function buildFordStyleCanonicalKey(
  projectPrefix: 'FORD' | 'STLA',
  toolingNumber: string,
  equipNo: string
): string | null {
  if (toolingNumber) {
    return `${projectPrefix}|${normalizeCode(toolingNumber)}`
  }

  if (equipNo) {
    return `${projectPrefix}|FIDES|${normalizeCode(equipNo)}`
  }

  return null
}

/**
 * Build display code (prefer tooling, else equipment, else station+type)
 */
export function buildDisplayCode(
  toolingNumber: string,
  equipNo: string,
  station: string,
  equipType: string
): string {
  if (toolingNumber) {
    return normalizeCode(toolingNumber)
  }

  if (equipNo) {
    return normalizeCode(equipNo)
  }

  return `${normalizeCode(station)}-${normalizeCode(equipType)}`
}

/**
 * Detect if tooling prefix matches area prefix
 */
export function checkToolingAreaMismatch(
  toolingNumber: string,
  areaName: string
): boolean {
  const toolingPrefix = toolingNumber.split(/[-_]/)[0]
  const areaPrefix = extractAreaPrefix(areaName)

  if (!toolingPrefix || !areaPrefix) {
    return false
  }

  return toolingPrefix !== areaPrefix
}

/**
 * Detect if tooling station does not start with station group
 */
export function checkToolingStationMismatch(
  toolingNumber: string,
  stationGroup: string
): boolean {
  if (!toolingNumber || !stationGroup) {
    return false
  }

  const atomicStation = deriveAtomicStation(toolingNumber, '')
  const normalizedGroup = normalizeCode(stationGroup)

  if (!atomicStation) {
    return false
  }

  return !atomicStation.startsWith(normalizedGroup)
}
