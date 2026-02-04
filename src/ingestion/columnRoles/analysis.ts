import type { CellValue } from '../excelUtils'
import type { ColumnRole, ColumnRoleDetection, SheetSchemaAnalysis } from './types'
import { detectColumnRole } from './detector'

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

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    const detection = detectColumnRole(String(header ?? ''))

    detection.columnIndex = i
    columns.push(detection)

    const existingIndices = roleMap.get(detection.role) ?? []
    existingIndices.push(i)
    roleMap.set(detection.role, existingIndices)

    if (detection.role === 'UNKNOWN' && detection.headerText !== '') {
      unknownColumns.push(detection)
    }
  }

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
