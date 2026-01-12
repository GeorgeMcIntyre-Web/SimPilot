/**
 * BMW Tool List Schema Adapter
 *
 * Handles BMW J10735 tool lists where:
 * - Station column contains FULL (atomic) station name
 * - Many equipment/tooling fields may be blank
 * - Station strings use human formatting (spaces, mixed tokens)
 */

import {
  NormalizedToolRow,
  ToolEntity,
  ValidationReport,
  ValidationAnomaly,
  normalizeStr,
  normalizeCode,
  buildBMWCanonicalKey,
  buildDisplayCode
} from './normalizeToolListRow'
import { log } from '../../lib/log'

// ============================================================================
// TYPES
// ============================================================================

interface BMWRawRow {
  'Area Name'?: unknown
  'Station'?: unknown
  'Equipment Type'?: unknown
  'Equipment No'?: unknown
  'Tool'?: unknown
  'Tooling Number RH'?: unknown
  'Tooling Number LH'?: unknown
  [key: string]: unknown
}

// ============================================================================
// ADAPTER
// ============================================================================

/**
 * Normalize BMW raw row to standardized format
 */
export function normalizeBMWRow(
  raw: BMWRawRow,
  sourceFile: string,
  rowIndex: number
): NormalizedToolRow {
  const areaName = normalizeStr(raw['Area Name'])
  const station = normalizeStr(raw['Station'])
  const equipmentType = normalizeStr(raw['Equipment Type'])
  const equipmentNo = normalizeStr(raw['Equipment No'])
  const tool = normalizeStr(raw['Tool'])
  const toolingRH = normalizeStr(raw['Tooling Number RH'])
  const toolingLH = normalizeStr(raw['Tooling Number LH'])

  // BMW: station column IS the atomic station (no group concept)
  const stationGroup = station
  const stationAtomic = station

  return {
    sourceFile,
    projectHint: 'BMW_J10735',
    areaName,
    stationGroup,
    stationAtomic,
    equipmentType,
    equipmentNoShown: equipmentNo || tool,
    equipmentNoOpposite: '',
    toolingNumberRH: toolingRH,
    toolingNumberLH: toolingLH,
    toolingNumberOppositeRH: '',
    toolingNumberOppositeLH: '',
    toolingLR: '',
    toolingLROpposite: '',
    rawRowIndex: rowIndex,
    isDeleted: false,  // Will be set by adapter
    raw
  }
}

/**
 * Convert BMW normalized row to tool entities
 *
 * BMW may produce 1-3 entities depending on tooling numbers:
 * - If RH and LH tooling exist: 2 entities
 * - If only one tooling exists: 1 entity
 * - If no tooling but equipment no exists: 1 entity
 * - If only station+type: 1 entity (with row index in key)
 */
export function bmwRowToToolEntities(
  normalized: NormalizedToolRow,
  sheetName: string,
  debug = false
): ToolEntity[] {
  const entities: ToolEntity[] = []

  const hasRH = normalized.toolingNumberRH.length > 0
  const hasLH = normalized.toolingNumberLH.length > 0

  if (hasRH) {
    const canonicalKey = buildBMWCanonicalKey(
      normalized.areaName,
      normalized.stationAtomic,
      normalized.equipmentNoShown,
      normalized.toolingNumberRH,
      normalized.equipmentType,
      normalized.rawRowIndex
    )

    const displayCode = buildDisplayCode(
      normalized.toolingNumberRH,
      normalized.equipmentNoShown,
      normalized.stationAtomic,
      normalized.equipmentType
    )

    const aliases = buildAliases(
      normalized.areaName,
      normalized.stationAtomic,
      normalized.equipmentNoShown
    )

    entities.push({
      canonicalKey,
      displayCode,
      stationGroup: normalized.stationGroup,
      stationAtomic: normalized.stationAtomic,
      areaName: normalized.areaName,
      aliases,
      source: {
        file: normalized.sourceFile,
        row: normalized.rawRowIndex,
        sheet: sheetName
      },
      raw: normalized.raw
    })
  }

  if (hasLH) {
    const canonicalKey = buildBMWCanonicalKey(
      normalized.areaName,
      normalized.stationAtomic,
      normalized.equipmentNoShown,
      normalized.toolingNumberLH,
      normalized.equipmentType,
      normalized.rawRowIndex
    )

    const displayCode = buildDisplayCode(
      normalized.toolingNumberLH,
      normalized.equipmentNoShown,
      normalized.stationAtomic,
      normalized.equipmentType
    )

    const aliases = buildAliases(
      normalized.areaName,
      normalized.stationAtomic,
      normalized.equipmentNoShown
    )

    entities.push({
      canonicalKey,
      displayCode,
      stationGroup: normalized.stationGroup,
      stationAtomic: normalized.stationAtomic,
      areaName: normalized.areaName,
      aliases,
      source: {
        file: normalized.sourceFile,
        row: normalized.rawRowIndex,
        sheet: sheetName
      },
      raw: normalized.raw
    })
  }

  // No tooling numbers: create single entity with equipment no or station+type
  if (!hasRH && !hasLH) {
    const canonicalKey = buildBMWCanonicalKey(
      normalized.areaName,
      normalized.stationAtomic,
      normalized.equipmentNoShown,
      '',
      normalized.equipmentType,
      normalized.rawRowIndex
    )

    const displayCode = buildDisplayCode(
      '',
      normalized.equipmentNoShown,
      normalized.stationAtomic,
      normalized.equipmentType
    )

    const aliases = buildAliases(
      normalized.areaName,
      normalized.stationAtomic,
      normalized.equipmentNoShown
    )

    entities.push({
      canonicalKey,
      displayCode,
      stationGroup: normalized.stationGroup,
      stationAtomic: normalized.stationAtomic,
      areaName: normalized.areaName,
      aliases,
      source: {
        file: normalized.sourceFile,
        row: normalized.rawRowIndex,
        sheet: sheetName
      },
      raw: normalized.raw
    })
  }

  if (debug && entities.length > 0) {
    log.debug(`[BMW] Row ${normalized.rawRowIndex} produced ${entities.length} entities`)
    entities.forEach(e => {
      log.debug(`  - canonicalKey: ${e.canonicalKey}`)
      log.debug(`    displayCode: ${e.displayCode}`)
    })
  }

  return entities
}

// ============================================================================
// HELPERS
// ============================================================================

function buildAliases(areaName: string, station: string, equipNo: string): string[] {
  const aliases: string[] = []

  if (equipNo) {
    aliases.push(normalizeCode(equipNo))
  }

  if (station) {
    aliases.push(normalizeCode(station))
  }

  if (areaName && station) {
    aliases.push(`${normalizeCode(areaName)}|${normalizeCode(station)}`)
  }

  return aliases
}

/**
 * Validate BMW tool entities and produce report
 */
export function validateBMWEntities(
  entities: ToolEntity[],
  totalRowsRead: number,
  existingAnomalies: ValidationAnomaly[]
): ValidationReport {
  const anomalies: ValidationAnomaly[] = [...existingAnomalies]
  const canonicalKeys = new Set<string>()
  let missingStationGroupCount = 0
  let missingToolingNumbersCount = 0
  let duplicateCanonicalKeys = 0

  entities.forEach(entity => {
    // Check for missing station
    if (!entity.stationGroup) {
      missingStationGroupCount++
    }

    // Check for duplicate canonical keys
    if (canonicalKeys.has(entity.canonicalKey)) {
      duplicateCanonicalKeys++
      anomalies.push({
        type: 'DUPLICATE_CANONICAL_KEY',
        row: entity.source.row,
        message: `Duplicate canonical key: ${entity.canonicalKey}`,
        data: { canonicalKey: entity.canonicalKey }
      })
    }
    canonicalKeys.add(entity.canonicalKey)

    // Count entities without tooling numbers
    if (!entity.displayCode.includes('|row:')) {
      // Has proper tooling or equipment number
    } else {
      missingToolingNumbersCount++
    }
  })

  // Count deleted rows from anomalies
  const deletedRowsSkipped = anomalies.filter(a => a.type === 'DELETED_ROW').length

  return {
    totalRowsRead,
    totalNormalizedRows: totalRowsRead,
    totalEntitiesProduced: entities.length,
    deletedRowsSkipped,
    missingStationGroupCount,
    missingToolingNumbersCount,
    headerRowsSkippedCount: 0,
    duplicateCanonicalKeys,
    anomalies
  }
}
