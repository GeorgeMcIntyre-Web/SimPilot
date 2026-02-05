import type { IngestionWarning } from '../../domain/core'
import type { CellValue } from '../excelUtils'
import { isEffectivelyEmptyRow, isEmptyRow, isTotalRow } from '../excelUtils'
import { createMetric } from './percentNormalizer'
import { COLUMN_ALIASES } from './headerMapping'
import type { SimulationMetric, VacuumParsedRow } from './types'

/**
 * Vacuum-parse a simulation status sheet.
 *
 * Core fields are mapped to row properties.
 * All other columns are captured as metrics[].
 */
export function vacuumParseSimulationSheet(
  rows: CellValue[][],
  headerRowIndex: number,
  fileName: string,
  sheetName: string,
  globalAreaName?: string,
): { rows: VacuumParsedRow[]; warnings: IngestionWarning[] } {
  void fileName
  void sheetName

  const warnings: IngestionWarning[] = []
  const vacuumRows: VacuumParsedRow[] = []

  const headerRow = rows[headerRowIndex]

  if (!headerRow || headerRow.length === 0) {
    return { rows: [], warnings }
  }

  // Build column index map for core fields
  // Strategy: First pass looks for exact matches, second pass allows partial matches
  // This prevents "PERSONS RESPONSIBLE" from matching "AREA" due to includes() logic
  const coreIndices: Record<string, number> = {}

  // First pass: exact matches only, following alias priority
  for (const [coreField, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const aliasUpper = alias.toUpperCase()
      const index = headerRow.findIndex(
        (h) =>
          String(h || '')
            .toUpperCase()
            .trim() === aliasUpper,
      )

      if (index >= 0) {
        coreIndices[coreField] = index
        break // Found highest priority match for this field
      }
    }
  }

  // Second pass: partial matches for fields not yet found
  for (const [coreField, aliases] of Object.entries(COLUMN_ALIASES)) {
    // Skip if already found via exact match
    if (coreIndices[coreField] !== undefined) {
      continue
    }

    for (let i = 0; i < headerRow.length; i++) {
      // Skip columns already assigned to other core fields
      if (Object.values(coreIndices).includes(i)) {
        continue
      }

      const headerText = String(headerRow[i] || '')
        .toUpperCase()
        .trim()

      for (const alias of aliases) {
        if (headerText.includes(alias.toUpperCase())) {
          coreIndices[coreField] = i
          break
        }
      }

      if (coreIndices[coreField] !== undefined) {
        break
      }
    }
  }

  // Identify metric columns: everything not used by core fields
  const metricIndices: number[] = []
  const metricLabels: string[] = []

  for (let i = 0; i < headerRow.length; i++) {
    if (Object.values(coreIndices).includes(i)) {
      continue
    }

    const label = String(headerRow[i] || '').trim()

    // Skip empty headers (likely trailing columns)
    if (label === '') {
      continue
    }

    metricIndices.push(i)
    metricLabels.push(label)
  }

  // Parse each data row after the header
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]

    // Skip footer rows (totals/empty rows)
    if (
      !row ||
      row.length === 0 ||
      isEmptyRow(row) ||
      isTotalRow(row) ||
      isEffectivelyEmptyRow(row)
    ) {
      continue
    }

    // Extract core fields
    const areaCode = String(row[coreIndices['AREA_CODE'] ?? -1] || '').trim()
    const rawAreaName = String(row[coreIndices['AREA_NAME'] ?? -1] || globalAreaName || '').trim()
    const areaName = rawAreaName || areaCode || 'UNKNOWN AREA'
    const assemblyLine = String(row[coreIndices['ASSEMBLY LINE'] ?? -1] || '').trim()
    const stationKey = String(row[coreIndices['STATION'] ?? -1] || '').trim()
    const robotCaption = String(row[coreIndices['ROBOT'] ?? -1] || '').trim()
    const application = String(row[coreIndices['APPLICATION'] ?? -1] || '').trim() || undefined
    const personResponsible =
      String(row[coreIndices['PERSONS RESPONSIBLE'] ?? -1] || '').trim() || undefined

    // Skip rows without station or robot (not valid simulation entries)
    if (!stationKey && !robotCaption) {
      continue
    }

    // Vacuum up all metrics
    const metrics: SimulationMetric[] = []

    for (let j = 0; j < metricIndices.length; j++) {
      const colIndex = metricIndices[j]
      const label = metricLabels[j]
      const rawValue = row[colIndex] ?? null

      // Only include if there's a value
      if (rawValue !== null && rawValue !== '') {
        metrics.push(createMetric(label, rawValue))
      }
    }

    vacuumRows.push({
      areaCode,
      areaName,
      assemblyLine,
      stationKey,
      robotCaption,
      application,
      personResponsible,
      metrics,
      sourceRowIndex: i,
    })
  }

  return { rows: vacuumRows, warnings }
}
