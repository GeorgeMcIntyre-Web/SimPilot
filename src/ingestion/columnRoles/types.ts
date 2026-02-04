import type { CellValue } from '../excelUtils'

// Semantic roles that columns can have across different sheet types
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

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ColumnRoleDetection {
  columnIndex: number
  headerText: string
  normalizedHeader: string
  role: ColumnRole
  confidence: MatchConfidence
  matchedPattern: string
  explanation: string
}

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

// Pattern definition for matching column headers to roles.
// Patterns are checked in order - first match wins.
// Includes typos and variants from real-world Excel files.
export interface RolePattern {
  role: ColumnRole
  patterns: string[]
  confidence: MatchConfidence
}
