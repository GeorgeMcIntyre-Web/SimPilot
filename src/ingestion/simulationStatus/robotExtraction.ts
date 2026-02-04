import type { IngestionWarning } from '../../domain/core'
import type { SimulationRobot, VacuumParsedRow } from './types'

/**
 * Extract unique robots from vacuum-parsed rows and detect duplicate station+robot combinations.
 *
 * Key insight: One station can have multiple robots, so duplicate station entries are expected.
 * Only if BOTH station AND robot are identical should we flag it as an error.
 */
export function extractRobotsFromVacuumRows(
  vacuumRows: VacuumParsedRow[],
  fileName: string,
  sheetName: string
): { robots: SimulationRobot[]; warnings: IngestionWarning[] } {
  const warnings: IngestionWarning[] = []
  const robots: SimulationRobot[] = []

  // Track seen station+robot combinations to detect true duplicates
  const seenCombinations = new Map<string, { rowIndex: number; robotCaption: string }>()

  for (const row of vacuumRows) {
    const robotCaption = row.robotCaption?.trim()

    // Skip rows without robot information
    if (!robotCaption) {
      continue
    }

    // Build composite key: station + robot (normalized)
    const stationKey = row.stationKey.toUpperCase().trim()
    const robotKey = robotCaption.toUpperCase().trim()
    const compositeKey = `${stationKey}::${robotKey}`

    const existingEntry = seenCombinations.get(compositeKey)

    if (existingEntry) {
      // TRUE DUPLICATE: Same station AND same robot - this is an error
      warnings.push({
        id: `dup-station-robot-${row.sourceRowIndex}`,
        kind: 'DUPLICATE_ENTRY',
        fileName,
        sheetName,
        rowIndex: row.sourceRowIndex + 1,
        message: `Duplicate entry: Station "${row.stationKey}" with Robot "${robotCaption}" already exists (first seen at row ${existingEntry.rowIndex + 1}). Each station+robot combination should be unique.`,
        createdAt: new Date().toISOString()
      })
      continue
    }

    // Record this combination
    seenCombinations.set(compositeKey, {
      rowIndex: row.sourceRowIndex,
      robotCaption
    })

    // Add to robots list
    robots.push({
      stationKey: row.stationKey,
      robotCaption,
      areaKey: row.areaCode, // Use areaCode as the key
      application: row.application,
      sourceRowIndex: row.sourceRowIndex
    })
  }

  return { robots, warnings }
}
