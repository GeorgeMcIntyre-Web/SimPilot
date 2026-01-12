/**
 * V801 (Ford) Tool List Schema Adapter
 *
 * Handles Ford V801 tool lists where:
 * - Station column is a STATION GROUP (not atomic)
 * - Equipment No is mechanical (Fides) name
 * - Tooling Number RH/LH are electrical atomic names (per-side identifiers)
 * - Area Name propagates downward (section headers)
 * - Mechanical and electrical naming may have mismatches
 */

import {
  NormalizedToolRow,
  ToolEntity,
  ValidationReport,
  ValidationAnomaly,
  normalizeStr,
  normalizeCode,
  buildFordStyleCanonicalKey,
  buildDisplayCode,
  extractAreaPrefix,
  deriveAtomicStation,
  extractLR,
  checkToolingAreaMismatch,
  checkToolingStationMismatch
} from './normalizeToolListRow'
import { log } from '../../lib/log'

// ============================================================================
// TYPES
// ============================================================================

interface V801RawRow {
  'Area Name'?: unknown
  'Station'?: unknown
  'Equipment No'?: unknown
  'Tooling Number RH'?: unknown
  'Tooling Number LH'?: unknown
  'Equipment Type'?: unknown
  [key: string]: unknown
}

// ============================================================================
// ADAPTER
// ============================================================================

/**
 * Normalize V801 raw rows to standardized format
 *
 * IMPORTANT: V801 has section headers where Area Name exists but Station is empty.
 * These rows must be used to propagate currentArea to following rows.
 */
export function normalizeV801Rows(
  rawRows: V801RawRow[],
  sourceFile: string,
  startRowIndex: number
): NormalizedToolRow[] {
  const normalized: NormalizedToolRow[] = []
  let currentArea = ''

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i]
    const rowIndex = startRowIndex + i

    const areaNameCell = normalizeStr(raw['Area Name'])
    const station = normalizeStr(raw['Station'])

    // Section header row: Area Name exists but Station is empty
    if (areaNameCell && !station) {
      currentArea = areaNameCell
      continue
    }

    // Data row: Station exists
    if (!station) {
      continue
    }

    // Use currentArea if this row has no area name
    const areaName = areaNameCell || currentArea

    const equipmentNo = normalizeStr(raw['Equipment No'])
    const toolingRH = normalizeStr(raw['Tooling Number RH'])
    const toolingLH = normalizeStr(raw['Tooling Number LH'])
    const equipmentType = normalizeStr(raw['Equipment Type'])

    // Ford: station is group, atomic derived from tooling
    const stationGroup = station
    let stationAtomic = station

    if (toolingRH) {
      stationAtomic = deriveAtomicStation(toolingRH, station)
    } else if (toolingLH) {
      stationAtomic = deriveAtomicStation(toolingLH, station)
    }

    const lrRH = extractLR(toolingRH)
    const lrLH = extractLR(toolingLH)

    normalized.push({
      sourceFile,
      projectHint: 'FORD_V801',
      areaName,
      stationGroup,
      stationAtomic,
      equipmentType,
      equipmentNoShown: equipmentNo,
      equipmentNoOpposite: '',
      toolingNumberRH: toolingRH,
      toolingNumberLH: toolingLH,
      toolingNumberOppositeRH: '',
      toolingNumberOppositeLH: '',
      toolingLR: lrRH,
      toolingLROpposite: lrLH,
      rawRowIndex: rowIndex,
      isDeleted: false,  // Will be set by adapter
      raw
    })
  }

  return normalized
}

/**
 * Convert V801 normalized row to tool entities
 *
 * V801 produces 1 entity per row (not separate RH/LH entities):
 * - Equipment No = Mechanical identifier (FIDES)
 * - Tooling Numbers (RH/LH) = Electrical identifiers (used by other documents)
 * - Canonical key priority: Tooling RH > Tooling LH > Equipment No
 * - Count target: 784 = rows with Equipment No (includes redacted underscores)
 *
 * Strategy: Produce 1 entity per row that has Equipment No, using tooling as canonical key
 */
export function v801RowToToolEntities(
  normalized: NormalizedToolRow,
  sheetName: string,
  anomalies: ValidationAnomaly[],
  debug = false
): ToolEntity[] {
  const entities: ToolEntity[] = []

  const hasRH = normalized.toolingNumberRH.length > 0
  const hasLH = normalized.toolingNumberLH.length > 0
  const hasEquipNo = normalized.equipmentNoShown.length > 0

  // Check for anomalies (validation only, doesn't affect entity generation)
  if (hasRH) {
    if (checkToolingAreaMismatch(normalized.toolingNumberRH, normalized.areaName)) {
      anomalies.push({
        type: 'TOOLING_PREFIX_MISMATCH',
        row: normalized.rawRowIndex,
        message: `Tooling prefix does not match area prefix: tooling=${normalized.toolingNumberRH}, area=${normalized.areaName}`,
        data: { tooling: normalized.toolingNumberRH, area: normalized.areaName }
      })
    }

    if (checkToolingStationMismatch(normalized.toolingNumberRH, normalized.stationGroup)) {
      anomalies.push({
        type: 'TOOLING_STATION_MISMATCH',
        row: normalized.rawRowIndex,
        message: `Tooling station does not start with station group: tooling=${normalized.toolingNumberRH}, station=${normalized.stationGroup}`,
        data: { tooling: normalized.toolingNumberRH, station: normalized.stationGroup }
      })
    }
  }

  if (hasLH) {
    if (checkToolingAreaMismatch(normalized.toolingNumberLH, normalized.areaName)) {
      anomalies.push({
        type: 'TOOLING_PREFIX_MISMATCH',
        row: normalized.rawRowIndex,
        message: `Tooling prefix does not match area prefix: tooling=${normalized.toolingNumberLH}, area=${normalized.areaName}`,
        data: { tooling: normalized.toolingNumberLH, area: normalized.areaName }
      })
    }

    if (checkToolingStationMismatch(normalized.toolingNumberLH, normalized.stationGroup)) {
      anomalies.push({
        type: 'TOOLING_STATION_MISMATCH',
        row: normalized.rawRowIndex,
        message: `Tooling station does not start with station group: tooling=${normalized.toolingNumberLH}, station=${normalized.stationGroup}`,
        data: { tooling: normalized.toolingNumberLH, station: normalized.stationGroup }
      })
    }
  }

  if (hasEquipNo && !hasRH && !hasLH) {
    anomalies.push({
      type: 'EQUIPMENT_NO_BUT_NO_TOOLING',
      row: normalized.rawRowIndex,
      message: `Equipment No present but no tooling numbers: equipNo=${normalized.equipmentNoShown}`,
      data: { equipNo: normalized.equipmentNoShown }
    })
  }

  // Only produce entities for rows with Equipment No (includes redacted underscores)
  // This gives us the 784 count target
  if (!hasEquipNo) {
    return entities
  }

  // Create separate entities for RH and LH when both are present
  if (hasRH && hasLH) {
    // Create RH entity
    const rhCanonicalKey = buildFordStyleCanonicalKey('FORD', normalized.toolingNumberRH, '') || ''
    const rhDisplayCode = buildDisplayCode(
      normalized.toolingNumberRH,
      normalized.equipmentNoShown,
      normalized.stationAtomic,
      normalized.equipmentType
    )
    const rhAliases = buildAliases(
      normalized.equipmentNoShown,
      normalized.toolingNumberRH,
      '',
      normalized.stationGroup,
      normalized.areaName
    )
    entities.push({
      canonicalKey: rhCanonicalKey,
      displayCode: rhDisplayCode,
      stationGroup: normalized.stationGroup,
      stationAtomic: normalized.stationAtomic,
      areaName: normalized.areaName,
      aliases: rhAliases,
      source: {
        file: normalized.sourceFile,
        row: normalized.rawRowIndex,
        sheet: sheetName
      },
      raw: normalized.raw
    })

    // Create LH entity
    const lhCanonicalKey = buildFordStyleCanonicalKey('FORD', normalized.toolingNumberLH, '') || ''
    const lhDisplayCode = buildDisplayCode(
      normalized.toolingNumberLH,
      normalized.equipmentNoShown,
      normalized.stationAtomic,
      normalized.equipmentType
    )
    const lhAliases = buildAliases(
      normalized.equipmentNoShown,
      '',
      normalized.toolingNumberLH,
      normalized.stationGroup,
      normalized.areaName
    )
    entities.push({
      canonicalKey: lhCanonicalKey,
      displayCode: lhDisplayCode,
      stationGroup: normalized.stationGroup,
      stationAtomic: normalized.stationAtomic,
      areaName: normalized.areaName,
      aliases: lhAliases,
      source: {
        file: normalized.sourceFile,
        row: normalized.rawRowIndex,
        sheet: sheetName
      },
      raw: normalized.raw
    })

    if (debug && entities.length > 0) {
      log.debug(`[V801] Row ${normalized.rawRowIndex} produced ${entities.length} entities (RH + LH)`)
      entities.forEach(e => {
        log.debug(`  - canonicalKey: ${e.canonicalKey}`)
        log.debug(`    displayCode: ${e.displayCode}`)
      })
    }

    return entities
  }

  // Build canonical key preferring electrical identifiers (Tooling) over mechanical (Equipment No)
  let canonicalKey: string | null = null
  let primaryIdentifier = ''

  if (hasRH) {
    canonicalKey = buildFordStyleCanonicalKey('FORD', normalized.toolingNumberRH, '')
    primaryIdentifier = normalized.toolingNumberRH
  } else if (hasLH) {
    canonicalKey = buildFordStyleCanonicalKey('FORD', normalized.toolingNumberLH, '')
    primaryIdentifier = normalized.toolingNumberLH
  } else if (hasEquipNo) {
    canonicalKey = buildFordStyleCanonicalKey('FORD', '', normalized.equipmentNoShown)
    primaryIdentifier = normalized.equipmentNoShown
  }

  if (!canonicalKey) {
    return entities
  }

  // Build display code preferring tooling RH, then LH, then equipment no
  const displayCode = buildDisplayCode(
    normalized.toolingNumberRH || normalized.toolingNumberLH,
    normalized.equipmentNoShown,
    normalized.stationAtomic,
    normalized.equipmentType
  )

  const aliases = buildAliases(
    normalized.equipmentNoShown,
    normalized.toolingNumberRH,
    normalized.toolingNumberLH,
    normalized.stationGroup,
    normalized.areaName
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

  if (debug && entities.length > 0) {
    log.debug(`[V801] Row ${normalized.rawRowIndex} produced ${entities.length} entity`)
    entities.forEach(e => {
      log.debug(`  - canonicalKey: ${e.canonicalKey}`)
      log.debug(`    displayCode: ${e.displayCode}`)
      log.debug(`    primaryId: ${primaryIdentifier}`)
    })
  }

  return entities
}

// ============================================================================
// HELPERS
// ============================================================================

function buildAliases(
  equipNo: string,
  toolingRH: string,
  toolingLH: string,
  stationGroup: string,
  areaName: string
): string[] {
  const aliases: string[] = []

  if (equipNo) {
    aliases.push(normalizeCode(equipNo))
  }

  if (toolingRH) {
    aliases.push(normalizeCode(toolingRH))
  }

  if (toolingLH) {
    aliases.push(normalizeCode(toolingLH))
  }

  if (stationGroup) {
    aliases.push(normalizeCode(stationGroup))
  }

  const areaPrefix = extractAreaPrefix(areaName)
  if (areaPrefix) {
    aliases.push(areaPrefix)
  }

  return aliases
}

/**
 * Validate V801 tool entities and produce report
 */
export function validateV801Entities(
  entities: ToolEntity[],
  totalRowsRead: number,
  anomalies: ValidationAnomaly[]
): ValidationReport {
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

    // Count entities without tooling numbers (FIDES-only)
    if (entity.canonicalKey.includes('FIDES')) {
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
