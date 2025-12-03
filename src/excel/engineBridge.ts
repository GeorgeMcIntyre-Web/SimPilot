// Engine Bridge
// Connects the new schema-agnostic engine to existing ingestion modules.
// Provides adapters and utilities for gradual migration.

import { ColumnProfile, profileColumn, RawColumnContext } from './columnProfiler'
import { SheetProfile, profileSheet, RawSheet } from './sheetProfiler'
import {
  FieldMatchResult,
  // matchFieldForColumn,
  matchAllColumns,
  // getBestFieldId,
  buildFieldToColumnMap
} from './fieldMatcher'
import {
  FieldId,
  // FieldDescriptor,
  // getAllFieldDescriptors,
  getFieldDescriptorById
} from './fieldRegistry'
import { ColumnRole } from '../ingestion/columnRoleDetector'
import { SheetCategory } from '../ingestion/sheetSniffer'

// ============================================================================
// FIELD ID TO COLUMN ROLE MAPPING
// ============================================================================

/**
 * Map from new FieldId to existing ColumnRole.
 * Allows gradual migration from old role system to new field system.
 */
const FIELD_TO_ROLE_MAP: Partial<Record<FieldId, ColumnRole>> = {
  // Identity columns
  tool_id: 'TOOL_ID',
  robot_id: 'ROBOT_ID',
  robot_number: 'ROBOT_ID',
  gun_number: 'GUN_NUMBER',
  device_name: 'DEVICE_NAME',
  serial_number: 'SERIAL_NUMBER',
  // Location columns
  area_name: 'AREA',
  station_name: 'STATION',
  assembly_line: 'LINE_CODE',
  zone: 'ZONE',
  cell_id: 'CELL',
  // Status columns
  reuse_status: 'REUSE_STATUS',
  sourcing: 'SOURCING',
  project_id: 'PROJECT',
  // Technical columns
  gun_force_kn: 'GUN_FORCE',
  gun_force_n: 'GUN_FORCE',
  oem_model: 'OEM_MODEL',
  model: 'OEM_MODEL',
  robot_type: 'ROBOT_TYPE',
  payload_kg: 'PAYLOAD',
  reach_mm: 'REACH',
  height_mm: 'HEIGHT',
  riser_height: 'HEIGHT',
  brand: 'BRAND',
  // Personnel columns
  person_responsible: 'ENGINEER',
  engineer: 'ENGINEER',
  sim_leader: 'SIM_LEADER',
  team_leader: 'TEAM_LEADER',
  // Date columns
  due_date: 'DUE_DATE',
  install_date: 'START_DATE',
  delivery_date: 'END_DATE',
  // Comments/Notes
  comment: 'COMMENTS',
  notes: 'COMMENTS',
  description: 'COMMENTS',
  // Metrics
  quantity: 'QUANTITY',
  reserve: 'RESERVE'
}

/**
 * Convert a FieldId to an existing ColumnRole.
 * Returns 'UNKNOWN' if no mapping exists.
 */
export function fieldIdToColumnRole(fieldId: FieldId): ColumnRole {
  return FIELD_TO_ROLE_MAP[fieldId] ?? 'UNKNOWN'
}

/**
 * Get all FieldIds that map to a given ColumnRole.
 */
export function columnRoleToFieldIds(role: ColumnRole): FieldId[] {
  const fieldIds: FieldId[] = []

  for (const [fieldId, mappedRole] of Object.entries(FIELD_TO_ROLE_MAP)) {
    if (mappedRole === role) {
      fieldIds.push(fieldId as FieldId)
    }
  }

  return fieldIds
}

// ============================================================================
// SHEET CATEGORY DETECTION ENHANCEMENT
// ============================================================================

/**
 * Signature patterns for sheet categories using the new field system.
 * Maps sheet categories to expected high-importance fields.
 */
const CATEGORY_FIELD_SIGNATURES: Record<Exclude<SheetCategory, 'UNKNOWN'>, FieldId[]> = {
  SIMULATION_STATUS: [
    'area_name',
    'station_name',
    'robot_name',
    'application_code',
    'stage_1_completion',
    'dcs_configured'
  ],
  IN_HOUSE_TOOLING: [
    'tool_id',
    'area_name',
    'station_name',
    'sim_leader',
    'due_date'
  ],
  ROBOT_SPECS: [
    'robot_id',
    'robot_number',
    'robot_type',
    'robot_order_code',
    'payload_kg',
    'reach_mm'
  ],
  REUSE_WELD_GUNS: [
    'device_name',
    'serial_number',
    'area_name',
    'reuse_status',
    'target_line'
  ],
  REUSE_RISERS: [
    'project_id',
    'area_name',
    'height_mm',
    'brand',
    'target_line'
  ],
  REUSE_TIP_DRESSERS: [
    'device_name',
    'robot_name',
    'target_line',
    'target_station'
  ],
  REUSE_ROBOTS: [
    'robot_number',
    'robot_type',
    'old_line',
    'target_line',
    'reuse_status'
  ],
  GUN_FORCE: [
    'gun_number',
    'gun_force_n',
    'gun_force_kn',
    'quantity',
    'reserve'
  ],
  METADATA: [
    'engineer',
    'supplier',
    'description'
  ]
}

/**
 * Score a sheet profile against category field signatures.
 * Returns scores for each category based on matched fields.
 */
export function scoreSheetByFieldSignatures(
  matchResults: FieldMatchResult[]
): Map<SheetCategory, number> {
  const scores = new Map<SheetCategory, number>()

  // Get all matched field IDs
  const matchedFieldIds = new Set<FieldId>()
  for (const result of matchResults) {
    if (result.bestMatch !== undefined) {
      matchedFieldIds.add(result.bestMatch.fieldId)
    }
  }

  // Score each category
  const categories = Object.keys(CATEGORY_FIELD_SIGNATURES) as Array<Exclude<SheetCategory, 'UNKNOWN'>>

  for (const category of categories) {
    const signature = CATEGORY_FIELD_SIGNATURES[category]
    let score = 0

    for (const fieldId of signature) {
      if (matchedFieldIds.has(fieldId)) {
        const descriptor = getFieldDescriptorById(fieldId)
        const importanceBonus = descriptor?.importance === 'high' ? 2 : 1
        score += importanceBonus
      }
    }

    scores.set(category, score)
  }

  // Add UNKNOWN with score 0
  scores.set('UNKNOWN', 0)

  return scores
}

/**
 * Detect the most likely sheet category using field matching.
 * Enhanced detection that uses the new engine.
 */
export function detectCategoryByFields(
  matchResults: FieldMatchResult[],
  minimumScore: number = 3
): SheetCategory {
  const scores = scoreSheetByFieldSignatures(matchResults)

  let bestCategory: SheetCategory = 'UNKNOWN'
  let bestScore = 0

  for (const [category, score] of scores) {
    if (score > bestScore && score >= minimumScore) {
      bestScore = score
      bestCategory = category
    }
  }

  return bestCategory
}

// ============================================================================
// ADAPTER FUNCTIONS
// ============================================================================

/**
 * Convert a NormalizedSheet to RawSheet for the new engine.
 */
export function normalizedSheetToRawSheet(
  normalizedSheet: { sheetName: string; rows: unknown[][] },
  headerRowIndex?: number
): RawSheet {
  return {
    sheetName: normalizedSheet.sheetName,
    rows: normalizedSheet.rows,
    headerRowIndex
  }
}

/**
 * Profile a sheet and match all columns to fields.
 * Convenience function that combines profiling and matching.
 */
export function profileAndMatchSheet(
  sheet: RawSheet,
  workbookId: string,
  sheetIndex: number = 0
): {
  profile: SheetProfile
  matchResults: FieldMatchResult[]
  fieldMap: Map<FieldId, number[]>
} {
  const profile = profileSheet(sheet, workbookId, sheetIndex)
  const matchResults = matchAllColumns(profile)
  const fieldMap = buildFieldToColumnMap(matchResults)

  return { profile, matchResults, fieldMap }
}

/**
 * Get the column index for a specific field in match results.
 * Returns the first matched column or undefined.
 */
export function getColumnIndexForField(
  matchResults: FieldMatchResult[],
  fieldId: FieldId
): number | undefined {
  for (const result of matchResults) {
    if (result.bestMatch?.fieldId === fieldId) {
      return result.columnProfile.columnIndex
    }
  }

  return undefined
}

/**
 * Get multiple column indices for a field (when field appears multiple times).
 */
export function getColumnIndicesForField(
  matchResults: FieldMatchResult[],
  fieldId: FieldId
): number[] {
  const indices: number[] = []

  for (const result of matchResults) {
    if (result.bestMatch?.fieldId === fieldId) {
      indices.push(result.columnProfile.columnIndex)
    }
  }

  return indices
}

/**
 * Build a role map from match results (for compatibility with existing code).
 * Returns a map from ColumnRole to column indices.
 */
export function buildRoleMapFromMatchResults(
  matchResults: FieldMatchResult[]
): Map<ColumnRole, number[]> {
  const roleMap = new Map<ColumnRole, number[]>()

  for (const result of matchResults) {
    if (result.bestMatch === undefined) {
      continue
    }

    const role = fieldIdToColumnRole(result.bestMatch.fieldId)
    const columnIndex = result.columnProfile.columnIndex

    const existing = roleMap.get(role) ?? []
    existing.push(columnIndex)
    roleMap.set(role, existing)
  }

  return roleMap
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

/**
 * Generate a diagnostic report for sheet profiling and matching.
 */
export function generateDiagnosticReport(
  profile: SheetProfile,
  matchResults: FieldMatchResult[]
): string {
  const lines: string[] = []

  // Sheet overview
  lines.push(`=== Sheet Profile: ${profile.sheetName} ===`)
  lines.push(`Workbook: ${profile.workbookId}`)
  lines.push(`Dimensions: ${profile.rowCount} rows × ${profile.columnCount} columns`)
  lines.push(`Header Row: ${profile.headerRowIndex}`)
  lines.push(`Quality Score: ${profile.qualityMetrics.overallScore}/100`)
  lines.push('')

  // Column matches
  lines.push('=== Column Matches ===')

  for (const result of matchResults) {
    const { columnProfile, bestMatch } = result

    if (bestMatch === undefined) {
      lines.push(`  [${columnProfile.columnIndex}] "${columnProfile.headerRaw}" → UNMATCHED`)
      continue
    }

    const role = fieldIdToColumnRole(bestMatch.fieldId)
    lines.push(`  [${columnProfile.columnIndex}] "${columnProfile.headerRaw}" → ${bestMatch.fieldId} (${role}) score=${bestMatch.score}`)
  }

  lines.push('')

  // Category detection
  const detectedCategory = detectCategoryByFields(matchResults)
  lines.push(`=== Category Detection ===`)
  lines.push(`Detected: ${detectedCategory}`)

  const scores = scoreSheetByFieldSignatures(matchResults)
  lines.push('Category Scores:')
  for (const [category, score] of scores) {
    if (score > 0) {
      lines.push(`  ${category}: ${score}`)
    }
  }

  return lines.join('\n')
}
