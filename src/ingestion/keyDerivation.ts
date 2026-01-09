// Canonical Key Derivation
// Deterministic functions to build keys from Excel columns
// Keys are LABELS (can change), UIDs are IDENTITIES (stable)

import { StationLabels, ToolLabels, RobotLabels } from '../domain/uidTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface StationKeyResult {
  key: string
  labels: StationLabels
  strategy: 'line_bay_station' | 'area_station' | 'fullLabel'
}

export interface ToolKeyResult {
  key: string
  labels: ToolLabels
  stationKey: string
}

export interface RobotKeyResult {
  key: string
  labels: RobotLabels
  stationKey: string
}

export interface KeyDerivationError {
  code: 'MISSING_COLUMNS' | 'INVALID_FORMAT' | 'AMBIGUOUS_INPUT'
  message: string
  receivedFields: Record<string, any>
}

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

function normalizeForKey(value: string | null | undefined): string | undefined {
  if (!value) return undefined

  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .replace(/[^\w\s-]/g, '') // Remove special chars except dash
    .trim()
}

function normalizeStationNumber(value: string | null | undefined): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()

  // Strip common prefixes
  const withoutPrefix = trimmed
    .replace(/^(OP|ST|STATION|STA)\s*/i, '')
    .trim()

  // Extract numeric part
  const match = withoutPrefix.match(/\d+/)
  if (!match) return undefined

  const num = parseInt(match[0], 10)

  // Format as 3-digit: "10" → "010"
  return num.toString().padStart(3, '0')
}

function normalizeLineOrBay(value: string | null | undefined): string | undefined {
  if (!value) return undefined

  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

// ============================================================================
// STATION KEY DERIVATION
// ============================================================================

/**
 * Build canonical station key from Excel row fields
 *
 * Strategy priority:
 * 1. Line + Bay + StationNo (most specific)
 * 2. Area + StationNo
 * 3. FullLabel (fallback)
 *
 * @param rawRow - Object with potential station identifier fields
 * @returns StationKeyResult or KeyDerivationError
 */
export function buildStationKey(
  rawRow: Record<string, any>
): StationKeyResult | KeyDerivationError {
  const labels: StationLabels = {
    line: normalizeLineOrBay(rawRow.line || rawRow.LINE || rawRow.Line),
    bay: normalizeLineOrBay(rawRow.bay || rawRow.BAY || rawRow.Bay),
    stationNo: normalizeStationNumber(
      rawRow.station || rawRow.STATION || rawRow.Station ||
      rawRow.stationNo || rawRow['Station No'] || rawRow['STATION NO']
    ),
    area: normalizeForKey(
      rawRow.area || rawRow.AREA || rawRow.Area ||
      rawRow.areaName || rawRow['Area Name']
    ),
    fullLabel: normalizeForKey(
      rawRow.stationLabel || rawRow['Station Label'] ||
      rawRow.stationId || rawRow['Station ID']
    )
  }

  // Strategy 1: Line + Bay + StationNo
  if (labels.line && labels.bay && labels.stationNo) {
    const key = `${labels.line}_${labels.bay}-${labels.stationNo}`
    return {
      key,
      labels,
      strategy: 'line_bay_station'
    }
  }

  // Strategy 2: Area + StationNo
  if (labels.area && labels.stationNo) {
    const key = `${labels.area}|${labels.stationNo}`
    return {
      key,
      labels,
      strategy: 'area_station'
    }
  }

  // Strategy 3: FullLabel fallback
  if (labels.fullLabel) {
    return {
      key: labels.fullLabel,
      labels,
      strategy: 'fullLabel'
    }
  }

  // ERROR: Insufficient data
  return {
    code: 'MISSING_COLUMNS',
    message: 'Cannot derive station key: missing required fields (line+bay+station OR area+station OR stationLabel)',
    receivedFields: {
      line: rawRow.line,
      bay: rawRow.bay,
      station: rawRow.station,
      area: rawRow.area,
      stationLabel: rawRow.stationLabel
    }
  }
}

// ============================================================================
// TOOL KEY DERIVATION
// ============================================================================

/**
 * Build canonical tool key from Excel row fields
 *
 * Format: "${stationKey}::${toolCode}"
 *
 * @param rawRow - Object with tool and station fields
 * @param stationKey - Pre-derived station key (required)
 * @returns ToolKeyResult or KeyDerivationError
 */
export function buildToolKey(
  rawRow: Record<string, any>,
  stationKey: string
): ToolKeyResult | KeyDerivationError {
  const labels: ToolLabels = {
    toolCode: normalizeForKey(
      rawRow.tool || rawRow.TOOL || rawRow['Tool Code'] ||
      rawRow.gun || rawRow.GUN || rawRow['Gun Number'] ||
      rawRow.equipment || rawRow.EQUIPMENT
    ),
    toolName: normalizeForKey(
      rawRow.toolName || rawRow['Tool Name'] ||
      rawRow.name || rawRow.NAME
    ),
    gunNumber: normalizeForKey(
      rawRow.gunNumber || rawRow['Gun Number'] ||
      rawRow.gun || rawRow.GUN
    )
  }

  // Prefer toolCode, fallback to gunNumber, fallback to toolName
  const identifier = labels.toolCode || labels.gunNumber || labels.toolName

  if (!identifier) {
    return {
      code: 'MISSING_COLUMNS',
      message: 'Cannot derive tool key: missing tool identifier (toolCode, gunNumber, or toolName)',
      receivedFields: {
        tool: rawRow.tool,
        gun: rawRow.gun,
        toolName: rawRow.toolName
      }
    }
  }

  const key = `${stationKey}::${identifier}`

  return {
    key,
    labels,
    stationKey
  }
}

// ============================================================================
// ROBOT KEY DERIVATION
// ============================================================================

/**
 * Build canonical robot key from Excel row fields
 *
 * Format: "${stationKey}::R:${robotCaption}"
 *
 * @param rawRow - Object with robot and station fields
 * @param stationKey - Pre-derived station key (required)
 * @returns RobotKeyResult or KeyDerivationError
 */
export function buildRobotKey(
  rawRow: Record<string, any>,
  stationKey: string
): RobotKeyResult | KeyDerivationError {
  const labels: RobotLabels = {
    robotCaption: normalizeForKey(
      rawRow.robot || rawRow.ROBOT || rawRow['Robot Caption'] ||
      rawRow.robotName || rawRow['Robot Name']
    ),
    robotName: normalizeForKey(
      rawRow.robotName || rawRow['Robot Name'] ||
      rawRow.name || rawRow.NAME
    ),
    eNumber: normalizeForKey(
      rawRow.eNumber || rawRow['E-Number'] || rawRow['E Number']
    )
  }

  // Prefer robotCaption, fallback to robotName
  const identifier = labels.robotCaption || labels.robotName

  if (!identifier) {
    return {
      code: 'MISSING_COLUMNS',
      message: 'Cannot derive robot key: missing robot identifier (robotCaption or robotName)',
      receivedFields: {
        robot: rawRow.robot,
        robotName: rawRow.robotName
      }
    }
  }

  const key = `${stationKey}::R:${identifier}`

  return {
    key,
    labels,
    stationKey
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isKeyDerivationError(
  result: StationKeyResult | ToolKeyResult | RobotKeyResult | KeyDerivationError
): result is KeyDerivationError {
  return 'code' in result
}
