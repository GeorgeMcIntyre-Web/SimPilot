import type { CellValue } from '../excelUtils'
import {
  profileSheet,
  matchAllColumns,
  fieldIdToColumnRole,
  type RawSheet,
  type FieldMatchResult,
} from '../../excel'
import type { ColumnRole, ColumnRoleDetection, MatchConfidence, SheetSchemaAnalysis } from './types'

export function analyzeHeaderRowV2(
  headers: CellValue[],
  sheetName: string = 'Sheet',
  headerRowIndex: number = 0,
): SheetSchemaAnalysis {
  const rows: unknown[][] = [headers]

  const rawSheet: RawSheet = {
    sheetName,
    rows,
    headerRowIndex: 0,
  }

  const profile = profileSheet(rawSheet, 'inline-analysis', 0)
  const matchResults = matchAllColumns(profile)

  const columns: ColumnRoleDetection[] = []
  const roleMap = new Map<ColumnRole, number[]>()
  const unknownColumns: ColumnRoleDetection[] = []

  for (const result of matchResults) {
    const { columnProfile, bestMatch } = result
    const role: ColumnRole =
      bestMatch !== undefined ? fieldIdToColumnRole(bestMatch.fieldId) : 'UNKNOWN'

    const confidence: MatchConfidence =
      bestMatch !== undefined ? scoreToConfidence(bestMatch.score) : 'LOW'

    const detection: ColumnRoleDetection = {
      columnIndex: columnProfile.columnIndex,
      headerText: columnProfile.headerRaw,
      normalizedHeader: columnProfile.headerNormalized,
      role,
      confidence,
      matchedPattern: bestMatch?.fieldId ?? '',
      explanation:
        bestMatch !== undefined
          ? `Matched ${bestMatch.fieldId} (score: ${bestMatch.score})`
          : 'No match found',
    }

    columns.push(detection)

    const existingIndices = roleMap.get(role) ?? []
    existingIndices.push(columnProfile.columnIndex)
    roleMap.set(role, existingIndices)

    if (role === 'UNKNOWN' && columnProfile.headerRaw.trim() !== '') {
      unknownColumns.push(detection)
    }
  }

  const total = columns.filter((c) => c.headerText !== '').length
  const known = total - unknownColumns.length
  const percentage = total > 0 ? Math.round((known / total) * 100) : 0

  return {
    sheetName,
    headerRowIndex,
    headers: headers.map((h) => String(h ?? '')),
    columns,
    roleMap,
    unknownColumns,
    coverage: {
      total,
      known,
      unknown: unknownColumns.length,
      percentage,
    },
  }
}

export function getFieldMatchResults(
  headers: CellValue[],
  sheetName: string = 'Sheet',
): FieldMatchResult[] {
  const rows: unknown[][] = [headers]

  const rawSheet: RawSheet = {
    sheetName,
    rows,
    headerRowIndex: 0,
  }

  const profile = profileSheet(rawSheet, 'inline-analysis', 0)
  return matchAllColumns(profile)
}

function scoreToConfidence(score: number): MatchConfidence {
  if (score >= 40) {
    return 'HIGH'
  }

  if (score >= 25) {
    return 'MEDIUM'
  }

  return 'LOW'
}
