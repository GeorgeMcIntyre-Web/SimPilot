// Column Role Detector
// Robustly detects column roles across all known sheets
// Handles typos, variant names, and produces structured explanations

import { CellValue } from './excelUtils'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Semantic roles that columns can have across different sheet types
 */
export type ColumnRole =
  // Identity columns
  | 'TOOL_ID'
  | 'ROBOT_ID'
  | 'GUN_NUMBER'
  | 'DEVICE_NAME'
  | 'SERIAL_NUMBER'
  // Location columns
  | 'AREA'
  | 'STATION'
  | 'LINE_CODE'
  | 'ZONE'
  | 'CELL'
  // Status columns
  | 'REUSE_STATUS'
  | 'SOURCING'
  | 'PROJECT'
  // Technical columns
  | 'GUN_FORCE'
  | 'OEM_MODEL'
  | 'ROBOT_TYPE'
  | 'PAYLOAD'
  | 'REACH'
  | 'HEIGHT'
  | 'BRAND'
  // Personnel columns
  | 'ENGINEER'
  | 'SIM_LEADER'
  | 'TEAM_LEADER'
  // Date columns
  | 'DUE_DATE'
  | 'START_DATE'
  | 'END_DATE'
  // Comments/Notes
  | 'COMMENTS'
  // Metrics
  | 'QUANTITY'
  | 'RESERVE'
  // Unknown
  | 'UNKNOWN'

/**
 * Confidence level of a role detection
 */
export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

/**
 * Result of detecting a column's role
 */
export interface ColumnRoleDetection {
  columnIndex: number
  headerText: string
  normalizedHeader: string
  role: ColumnRole
  confidence: MatchConfidence
  matchedPattern: string
  explanation: string
}

/**
 * Full schema analysis for a sheet
 */
export interface SheetSchemaAnalysis {
  sheetName: string
  headerRowIndex: number
  headers: string[]
  columns: ColumnRoleDetection[]
  roleMap: Map<ColumnRole, number[]>
  unknownColumns: ColumnRoleDetection[]
  coverage: {
    total: number
    known: number
    unknown: number
    percentage: number
  }
}

/**
 * Row interpretation showing how raw values map to semantic roles
 */
export interface RowInterpretation {
  rowIndex: number
  rawValues: CellValue[]
  mappings: {
    role: ColumnRole
    columnIndex: number
    headerText: string
    rawValue: CellValue
    formattedValue: string
  }[]
  summary: string
}

// ============================================================================
// ROLE PATTERNS
// ============================================================================

/**
 * Pattern definition for matching column headers to roles.
 * Patterns are checked in order - first match wins.
 * Includes typos and variants from real-world Excel files.
 */
interface RolePattern {
  role: ColumnRole
  patterns: string[]
  confidence: MatchConfidence
}

/**
 * All known patterns for column role detection.
 * Order matters - more specific patterns should come first.
 * 
 * IMPORTANT: DO NOT "fix" typos - these match real-world headers exactly.
 */
const ROLE_PATTERNS: RolePattern[] = [
  // -------------------------------------------------------------------------
  // Identity Columns (HIGH priority)
  // -------------------------------------------------------------------------
  {
    role: 'GUN_NUMBER',
    patterns: [
      'gun number',
      'gun no',
      'gun id',
      'gun #',
      'gun',
      'wg number',
      'wg id',
      'welding gun'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'DEVICE_NAME',
    patterns: [
      'device name',
      'device id',
      'device',
      'asset description',
      'equipment name',
      'equipment id'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'SERIAL_NUMBER',
    patterns: [
      'serial number complete wg',
      'serial number',
      'serial no',
      'serial #',
      's/n'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'TOOL_ID',
    patterns: [
      'tool id',
      'tool name',
      'tool number',
      'tool no',
      'tool #',
      'tool'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'ROBOT_ID',
    patterns: [
      'robotnumber',
      'robot number',
      'robot id',
      'robot name',
      'robot no',
      'robot #',
      'robot caption',
      'robotnumber (e-number)',
      'robot'
    ],
    confidence: 'HIGH'
  },

  // -------------------------------------------------------------------------
  // Location Columns
  // -------------------------------------------------------------------------
  {
    role: 'AREA',
    patterns: [
      'area name',
      'area code',
      'area'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'STATION',
    patterns: [
      'station code',
      'station number',
      'station no',
      'station',
      'new station',
      'old station',
      'station #'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'LINE_CODE',
    patterns: [
      'assembly line',
      'line code',
      'line',
      'new line',
      'old line'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'ZONE',
    patterns: [
      'zone',
      'location',
      'position'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'CELL',
    patterns: [
      'cell code',
      'cell name',
      'cell'
    ],
    confidence: 'MEDIUM'
  },

  // -------------------------------------------------------------------------
  // Status & Sourcing Columns
  // -------------------------------------------------------------------------
  {
    role: 'REUSE_STATUS',
    patterns: [
      'refresment ok',      // Keep typo from real files!
      'refreshment ok',
      'reuse status',
      'reuse',
      'carry over',
      'carryover'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'SOURCING',
    patterns: [
      'supply',
      'sourcing',
      'source',
      'procurement'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'PROJECT',
    patterns: [
      'proyect',            // Keep typo from real files!
      'project name',
      'project',
      'program'
    ],
    confidence: 'HIGH'
  },

  // -------------------------------------------------------------------------
  // Technical Columns
  // -------------------------------------------------------------------------
  {
    role: 'GUN_FORCE',
    patterns: [
      'gun force [n]',
      'gun force',
      'force [n]',
      'force',
      'max force'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'OEM_MODEL',
    patterns: [
      'robot w/ j1-j3 dress pack (order code)',
      'fanuc order code',
      'oem model',
      'model',
      'manufacturer',
      'supplier'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'ROBOT_TYPE',
    patterns: [
      'robot type',
      'type',
      'category'
    ],
    confidence: 'LOW'
  },
  {
    role: 'PAYLOAD',
    patterns: [
      'payload',
      'capacity',
      'load'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'REACH',
    patterns: [
      'reach (mm)',
      'reach',
      'arm length'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'HEIGHT',
    patterns: [
      'height',
      'riser height',
      'stand height'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'BRAND',
    patterns: [
      'brand',
      'make',
      'vendor'
    ],
    confidence: 'MEDIUM'
  },

  // -------------------------------------------------------------------------
  // Personnel Columns
  // -------------------------------------------------------------------------
  {
    role: 'ENGINEER',
    patterns: [
      'persons responsible',
      'responsible',
      'engineer',
      'assigned to',
      'owner'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'SIM_LEADER',
    patterns: [
      'sim. leader',
      'sim leader',
      'simulation leader'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'TEAM_LEADER',
    patterns: [
      'team leader',
      'lead',
      'manager'
    ],
    confidence: 'MEDIUM'
  },

  // -------------------------------------------------------------------------
  // Date Columns
  // -------------------------------------------------------------------------
  {
    role: 'DUE_DATE',
    patterns: [
      'sim. due date (yyyy/mm/dd)',
      'sim. due date',
      'due date',
      'deadline',
      'target date'
    ],
    confidence: 'HIGH'
  },
  {
    role: 'START_DATE',
    patterns: [
      'start date',
      'begin date',
      'start'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'END_DATE',
    patterns: [
      'end date',
      'finish date',
      'completion date'
    ],
    confidence: 'MEDIUM'
  },

  // -------------------------------------------------------------------------
  // Comments & Notes
  // -------------------------------------------------------------------------
  {
    role: 'COMMENTS',
    patterns: [
      'coments',            // Keep typo from real files!
      'comments',
      'comment',
      'notes',
      'remarks',
      'description'
    ],
    confidence: 'MEDIUM'
  },

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------
  {
    role: 'QUANTITY',
    patterns: [
      'quantity',
      'qty',
      'count',
      'amount'
    ],
    confidence: 'MEDIUM'
  },
  {
    role: 'RESERVE',
    patterns: [
      'reserve',
      'spare',
      'backup'
    ],
    confidence: 'LOW'
  }
]

// ============================================================================
// MAIN DETECTION FUNCTIONS
// ============================================================================

/**
 * Normalize header text for pattern matching
 */
function normalizeHeader(header: string | null | undefined): string {
  if (header === null || header === undefined) {
    return ''
  }

  return String(header)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .replace(/[_-]+/g, ' ')     // Replace underscores/hyphens with spaces
}

/**
 * Detect the role of a single column header
 */
export function detectColumnRole(header: string): ColumnRoleDetection {
  const normalizedHeader = normalizeHeader(header)
  const headerText = String(header ?? '').trim()

  // Empty headers are always unknown
  if (normalizedHeader === '') {
    return {
      columnIndex: -1,
      headerText,
      normalizedHeader,
      role: 'UNKNOWN',
      confidence: 'LOW',
      matchedPattern: '',
      explanation: 'Empty header'
    }
  }

  // Check each pattern set
  for (const patternSet of ROLE_PATTERNS) {
    for (const pattern of patternSet.patterns) {
      // Exact match
      if (normalizedHeader === pattern) {
        return {
          columnIndex: -1,
          headerText,
          normalizedHeader,
          role: patternSet.role,
          confidence: patternSet.confidence,
          matchedPattern: pattern,
          explanation: `Exact match: "${pattern}"`
        }
      }

      // Contains match (less confident)
      if (normalizedHeader.includes(pattern)) {
        const adjustedConfidence: MatchConfidence =
          patternSet.confidence === 'HIGH' ? 'MEDIUM' : 'LOW'

        return {
          columnIndex: -1,
          headerText,
          normalizedHeader,
          role: patternSet.role,
          confidence: adjustedConfidence,
          matchedPattern: pattern,
          explanation: `Contains: "${pattern}"`
        }
      }
    }
  }

  // No match found
  return {
    columnIndex: -1,
    headerText,
    normalizedHeader,
    role: 'UNKNOWN',
    confidence: 'LOW',
    matchedPattern: '',
    explanation: 'No matching pattern found'
  }
}

/**
 * Analyze a full header row and detect all column roles
 */
export function analyzeHeaderRow(
  headers: CellValue[],
  sheetName: string = 'Sheet',
  headerRowIndex: number = 0
): SheetSchemaAnalysis {
  const columns: ColumnRoleDetection[] = []
  const roleMap = new Map<ColumnRole, number[]>()
  const unknownColumns: ColumnRoleDetection[] = []

  // Process each header
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    const detection = detectColumnRole(String(header ?? ''))

    // Set column index
    detection.columnIndex = i

    columns.push(detection)

    // Track by role
    const existingIndices = roleMap.get(detection.role) ?? []
    existingIndices.push(i)
    roleMap.set(detection.role, existingIndices)

    // Track unknowns separately
    if (detection.role === 'UNKNOWN' && detection.headerText !== '') {
      unknownColumns.push(detection)
    }
  }

  // Calculate coverage stats
  const total = columns.filter(c => c.headerText !== '').length
  const known = total - unknownColumns.length
  const percentage = total > 0 ? Math.round((known / total) * 100) : 0

  return {
    sheetName,
    headerRowIndex,
    headers: headers.map(h => String(h ?? '')),
    columns,
    roleMap,
    unknownColumns,
    coverage: {
      total,
      known,
      unknown: unknownColumns.length,
      percentage
    }
  }
}

// ============================================================================
// ROW INTERPRETATION
// ============================================================================

/**
 * Interpret a data row using the schema analysis
 */
export function interpretRow(
  row: CellValue[],
  rowIndex: number,
  schema: SheetSchemaAnalysis
): RowInterpretation {
  const mappings: RowInterpretation['mappings'] = []

  // Map each known column
  for (const column of schema.columns) {
    if (column.role === 'UNKNOWN') {
      continue
    }

    const rawValue = row[column.columnIndex] ?? null
    const formattedValue = formatCellForDisplay(rawValue)

    mappings.push({
      role: column.role,
      columnIndex: column.columnIndex,
      headerText: column.headerText,
      rawValue,
      formattedValue
    })
  }

  // Build summary string
  const summary = buildRowSummary(mappings)

  return {
    rowIndex,
    rawValues: row,
    mappings,
    summary
  }
}

/**
 * Format a cell value for display
 */
function formatCellForDisplay(value: CellValue): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    // Format numbers nicely
    if (Number.isInteger(value)) {
      return String(value)
    }
    return value.toFixed(2)
  }

  return String(value).trim()
}

/**
 * Build a human-readable summary of a row interpretation
 */
function buildRowSummary(mappings: RowInterpretation['mappings']): string {
  const parts: string[] = []

  // Find identity
  const identity = mappings.find(m =>
    m.role === 'TOOL_ID' ||
    m.role === 'ROBOT_ID' ||
    m.role === 'GUN_NUMBER' ||
    m.role === 'DEVICE_NAME'
  )
  if (identity && identity.formattedValue) {
    parts.push(`ID: ${identity.formattedValue}`)
  }

  // Find location
  const station = mappings.find(m => m.role === 'STATION')
  if (station && station.formattedValue) {
    parts.push(`Station: ${station.formattedValue}`)
  }

  const area = mappings.find(m => m.role === 'AREA')
  if (area && area.formattedValue) {
    parts.push(`Area: ${area.formattedValue}`)
  }

  // Find sourcing
  const reuse = mappings.find(m => m.role === 'REUSE_STATUS')
  if (reuse && reuse.formattedValue) {
    parts.push(`Reuse: ${reuse.formattedValue}`)
  }

  // Find force (for guns)
  const force = mappings.find(m => m.role === 'GUN_FORCE')
  if (force && force.formattedValue) {
    parts.push(`Force: ${force.formattedValue}N`)
  }

  if (parts.length === 0) {
    return 'No mapped values'
  }

  return parts.join(' | ')
}

// ============================================================================
// ROLE UTILITIES
// ============================================================================

/**
 * Get the first column index for a given role
 */
export function getColumnForRole(
  schema: SheetSchemaAnalysis,
  role: ColumnRole
): number | null {
  const indices = schema.roleMap.get(role)

  if (indices === undefined || indices.length === 0) {
    return null
  }

  return indices[0]
}

/**
 * Get cell value by role from a row
 */
export function getValueByRole(
  row: CellValue[],
  schema: SheetSchemaAnalysis,
  role: ColumnRole
): CellValue {
  const columnIndex = getColumnForRole(schema, role)

  if (columnIndex === null) {
    return null
  }

  return row[columnIndex] ?? null
}

/**
 * Get cell value as string by role
 */
export function getStringByRole(
  row: CellValue[],
  schema: SheetSchemaAnalysis,
  role: ColumnRole
): string {
  const value = getValueByRole(row, schema, role)
  return formatCellForDisplay(value)
}

/**
 * Check if schema has a given role
 */
export function hasRole(schema: SheetSchemaAnalysis, role: ColumnRole): boolean {
  return schema.roleMap.has(role) && (schema.roleMap.get(role)?.length ?? 0) > 0
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: ColumnRole): string {
  const displayNames: Record<ColumnRole, string> = {
    TOOL_ID: 'Tool ID',
    ROBOT_ID: 'Robot ID',
    GUN_NUMBER: 'Gun Number',
    DEVICE_NAME: 'Device Name',
    SERIAL_NUMBER: 'Serial Number',
    AREA: 'Area',
    STATION: 'Station',
    LINE_CODE: 'Line Code',
    ZONE: 'Zone',
    CELL: 'Cell',
    REUSE_STATUS: 'Reuse Status',
    SOURCING: 'Sourcing',
    PROJECT: 'Project',
    GUN_FORCE: 'Gun Force',
    OEM_MODEL: 'OEM Model',
    ROBOT_TYPE: 'Robot Type',
    PAYLOAD: 'Payload',
    REACH: 'Reach',
    HEIGHT: 'Height',
    BRAND: 'Brand',
    ENGINEER: 'Engineer',
    SIM_LEADER: 'Sim Leader',
    TEAM_LEADER: 'Team Leader',
    DUE_DATE: 'Due Date',
    START_DATE: 'Start Date',
    END_DATE: 'End Date',
    COMMENTS: 'Comments',
    QUANTITY: 'Quantity',
    RESERVE: 'Reserve',
    UNKNOWN: 'Unknown'
  }

  return displayNames[role] ?? role
}

/**
 * Get color class for a role (for UI display)
 */
export function getRoleColorClass(role: ColumnRole): string {
  // Identity columns - blue
  if (['TOOL_ID', 'ROBOT_ID', 'GUN_NUMBER', 'DEVICE_NAME', 'SERIAL_NUMBER'].includes(role)) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  }

  // Location columns - green
  if (['AREA', 'STATION', 'LINE_CODE', 'ZONE', 'CELL'].includes(role)) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  }

  // Status columns - orange
  if (['REUSE_STATUS', 'SOURCING', 'PROJECT'].includes(role)) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  }

  // Technical columns - purple
  if (['GUN_FORCE', 'OEM_MODEL', 'ROBOT_TYPE', 'PAYLOAD', 'REACH', 'HEIGHT', 'BRAND'].includes(role)) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  }

  // Personnel columns - teal
  if (['ENGINEER', 'SIM_LEADER', 'TEAM_LEADER'].includes(role)) {
    return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
  }

  // Date columns - indigo
  if (['DUE_DATE', 'START_DATE', 'END_DATE'].includes(role)) {
    return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
  }

  // Comments - gray
  if (role === 'COMMENTS') {
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  // Unknown - yellow/warning
  if (role === 'UNKNOWN') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  }

  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

/**
 * Get confidence color class
 */
export function getConfidenceColorClass(confidence: MatchConfidence): string {
  switch (confidence) {
    case 'HIGH':
      return 'text-green-600 dark:text-green-400'
    case 'MEDIUM':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'LOW':
      return 'text-red-600 dark:text-red-400'
  }
}
