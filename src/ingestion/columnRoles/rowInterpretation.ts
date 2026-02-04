import type { CellValue } from '../excelUtils'
import type { ColumnRole, RowInterpretation, SheetSchemaAnalysis, MatchConfidence } from './types'

/**
 * Interpret a data row using the schema analysis
 */
export function interpretRow(
  row: CellValue[],
  rowIndex: number,
  schema: SheetSchemaAnalysis
): RowInterpretation {
  const mappings: RowInterpretation['mappings'] = []

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

  const summary = buildRowSummary(mappings)

  return {
    rowIndex,
    rawValues: row,
    mappings,
    summary
  }
}

function formatCellForDisplay(value: CellValue): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return String(value)
    }
    return value.toFixed(2)
  }

  return String(value).trim()
}

function buildRowSummary(mappings: RowInterpretation['mappings']): string {
  const parts: string[] = []

  const identity = mappings.find(m =>
    m.role === 'TOOL_ID' ||
    m.role === 'ROBOT_ID' ||
    m.role === 'GUN_NUMBER' ||
    m.role === 'DEVICE_NAME'
  )
  if (identity && identity.formattedValue) {
    parts.push(`ID: ${identity.formattedValue}`)
  }

  const station = mappings.find(m => m.role === 'STATION')
  if (station && station.formattedValue) {
    parts.push(`Station: ${station.formattedValue}`)
  }

  const area = mappings.find(m => m.role === 'AREA')
  if (area && area.formattedValue) {
    parts.push(`Area: ${area.formattedValue}`)
  }

  const reuse = mappings.find(m => m.role === 'REUSE_STATUS')
  if (reuse && reuse.formattedValue) {
    parts.push(`Reuse: ${reuse.formattedValue}`)
  }

  const force = mappings.find(m => m.role === 'GUN_FORCE')
  if (force && force.formattedValue) {
    parts.push(`Force: ${force.formattedValue}N`)
  }

  if (parts.length === 0) {
    return 'No mapped values'
  }

  return parts.join(' | ')
}

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

export function getStringByRole(
  row: CellValue[],
  schema: SheetSchemaAnalysis,
  role: ColumnRole
): string {
  const value = getValueByRole(row, schema, role)
  return formatCellForDisplay(value)
}

export function hasRole(schema: SheetSchemaAnalysis, role: ColumnRole): boolean {
  return schema.roleMap.has(role) && (schema.roleMap.get(role)?.length ?? 0) > 0
}

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

export function getRoleColorClass(role: ColumnRole): string {
  if (['TOOL_ID', 'ROBOT_ID', 'GUN_NUMBER', 'DEVICE_NAME', 'SERIAL_NUMBER'].includes(role)) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  }

  if (['AREA', 'STATION', 'LINE_CODE', 'ZONE', 'CELL'].includes(role)) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  }

  if (['REUSE_STATUS', 'SOURCING', 'PROJECT'].includes(role)) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  }

  if (['GUN_FORCE', 'OEM_MODEL', 'ROBOT_TYPE', 'PAYLOAD', 'REACH', 'HEIGHT', 'BRAND'].includes(role)) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  }

  if (['ENGINEER', 'SIM_LEADER', 'TEAM_LEADER'].includes(role)) {
    return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
  }

  if (['DUE_DATE', 'START_DATE', 'END_DATE'].includes(role)) {
    return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
  }

  if (role === 'COMMENTS') {
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  if (role === 'UNKNOWN') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  }

  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

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
