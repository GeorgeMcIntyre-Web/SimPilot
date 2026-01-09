/**
 * STLA Tool List Schema Adapter
 *
 * Handles STLA tool lists where:
 * - SUB Area Name (not "Area Name")
 * - Station column is group name
 * - Equipment No Shown + Equipment No Opposite
 * - Tooling Number RH/LH + opposite variants
 * - Can produce up to 4 tool entities per row (shown RH/LH + opposite RH/LH)
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

// ============================================================================
// TYPES
// ============================================================================

interface STLARawRow {
  'SUB Area Name'?: unknown
  'Station'?: unknown
  'Equipment No Shown'?: unknown
  'Equipment No Opposite'?: unknown
  'Tooling Number RH'?: unknown
  'Tooling Number LH'?: unknown
  'Tooling Number RH (Opposite)'?: unknown
  'Tooling Number LH (Opposite)'?: unknown
  'Equipment Type'?: unknown
  'SHOP'?: unknown
  'Work Cell / Station Group'?: unknown
  [key: string]: unknown
}

// ============================================================================
// ADAPTER
// ============================================================================

/**
 * Normalize STLA raw row to standardized format
 */
export function normalizeSTLARow(
  raw: STLARawRow,
  sourceFile: string,
  rowIndex: number
): NormalizedToolRow {
  const areaName = normalizeStr(raw['SUB Area Name'])
  const station = normalizeStr(raw['Station']) || normalizeStr(raw['Work Cell / Station Group'])
  const equipmentNoShown = normalizeStr(raw['Equipment No Shown'])
  const equipmentNoOpposite = normalizeStr(raw['Equipment No Opposite'])
  const toolingRH = normalizeStr(raw['Tooling Number RH'])
  const toolingLH = normalizeStr(raw['Tooling Number LH'])
  const toolingOppositeRH = normalizeStr(raw['Tooling Number RH (Opposite)'])
  const toolingOppositeLH = normalizeStr(raw['Tooling Number LH (Opposite)'])
  const equipmentType = normalizeStr(raw['Equipment Type'])

  // STLA: station is group, atomic derived from tooling
  const stationGroup = station
  let stationAtomic = station

  if (toolingRH) {
    stationAtomic = deriveAtomicStation(toolingRH, station)
  } else if (toolingLH) {
    stationAtomic = deriveAtomicStation(toolingLH, station)
  } else if (toolingOppositeRH) {
    stationAtomic = deriveAtomicStation(toolingOppositeRH, station)
  } else if (toolingOppositeLH) {
    stationAtomic = deriveAtomicStation(toolingOppositeLH, station)
  }

  const lrRH = extractLR(toolingRH)
  const lrOppositeRH = extractLR(toolingOppositeRH)
  const lrOppositeLH = extractLR(toolingOppositeLH)

  return {
    sourceFile,
    projectHint: 'STLA_S_ZAR',
    areaName,
    stationGroup,
    stationAtomic,
    equipmentType,
    equipmentNoShown,
    equipmentNoOpposite,
    toolingNumberRH: toolingRH,
    toolingNumberLH: toolingLH,
    toolingNumberOppositeRH: toolingOppositeRH,
    toolingNumberOppositeLH: toolingOppositeLH,
    toolingLR: lrRH,
    toolingLROpposite: lrOppositeRH || lrOppositeLH,
    rawRowIndex: rowIndex,
    isDeleted: false,  // Will be set by adapter
    raw
  }
}

/**
 * Convert STLA normalized row to tool entities
 *
 * STLA produces up to 4 entities:
 * - Shown RH (if toolingNumberRH exists)
 * - Shown LH (if toolingNumberLH exists)
 * - Opposite RH (if toolingNumberOppositeRH exists)
 * - Opposite LH (if toolingNumberOppositeLH exists)
 *
 * Fallback to FIDES keys if no tooling numbers exist.
 */
export function stlaRowToToolEntities(
  normalized: NormalizedToolRow,
  sheetName: string,
  anomalies: ValidationAnomaly[],
  debug = false
): ToolEntity[] {
  const entities: ToolEntity[] = []

  const hasShownRH = normalized.toolingNumberRH.length > 0
  const hasShownLH = normalized.toolingNumberLH.length > 0
  const hasOppositeRH = normalized.toolingNumberOppositeRH.length > 0
  const hasOppositeLH = normalized.toolingNumberOppositeLH.length > 0

  const hasEquipNoShown = normalized.equipmentNoShown.length > 0
  const hasEquipNoOpposite = normalized.equipmentNoOpposite.length > 0

  // Check for anomalies for each tooling number
  const checkAnomalies = (toolingNumber: string) => {
    if (!toolingNumber) return

    if (checkToolingAreaMismatch(toolingNumber, normalized.areaName)) {
      anomalies.push({
        type: 'TOOLING_PREFIX_MISMATCH',
        row: normalized.rawRowIndex,
        message: `Tooling prefix does not match area prefix: tooling=${toolingNumber}, area=${normalized.areaName}`,
        data: { tooling: toolingNumber, area: normalized.areaName }
      })
    }

    if (checkToolingStationMismatch(toolingNumber, normalized.stationGroup)) {
      anomalies.push({
        type: 'TOOLING_STATION_MISMATCH',
        row: normalized.rawRowIndex,
        message: `Tooling station does not start with station group: tooling=${toolingNumber}, station=${normalized.stationGroup}`,
        data: { tooling: toolingNumber, station: normalized.stationGroup }
      })
    }
  }

  checkAnomalies(normalized.toolingNumberRH)
  checkAnomalies(normalized.toolingNumberLH)
  checkAnomalies(normalized.toolingNumberOppositeRH)
  checkAnomalies(normalized.toolingNumberOppositeLH)

  // Create shown RH entity
  if (hasShownRH) {
    const canonicalKey = buildFordStyleCanonicalKey('STLA', normalized.toolingNumberRH, '')

    if (canonicalKey) {
      entities.push(createEntity(
        canonicalKey,
        normalized.toolingNumberRH,
        normalized.equipmentNoShown,
        normalized,
        sheetName
      ))
    }
  }

  // Create shown LH entity
  if (hasShownLH) {
    const canonicalKey = buildFordStyleCanonicalKey('STLA', normalized.toolingNumberLH, '')

    if (canonicalKey) {
      entities.push(createEntity(
        canonicalKey,
        normalized.toolingNumberLH,
        normalized.equipmentNoShown,
        normalized,
        sheetName
      ))
    }
  }

  // Create opposite RH entity
  if (hasOppositeRH) {
    const canonicalKey = buildFordStyleCanonicalKey('STLA', normalized.toolingNumberOppositeRH, '')

    if (canonicalKey) {
      entities.push(createEntity(
        canonicalKey,
        normalized.toolingNumberOppositeRH,
        normalized.equipmentNoOpposite,
        normalized,
        sheetName
      ))
    }
  }

  // Create opposite LH entity
  if (hasOppositeLH) {
    const canonicalKey = buildFordStyleCanonicalKey('STLA', normalized.toolingNumberOppositeLH, '')

    if (canonicalKey) {
      entities.push(createEntity(
        canonicalKey,
        normalized.toolingNumberOppositeLH,
        normalized.equipmentNoOpposite,
        normalized,
        sheetName
      ))
    }
  }

  // No tooling numbers: create FIDES entities
  if (!hasShownRH && !hasShownLH && !hasOppositeRH && !hasOppositeLH) {
    if (hasEquipNoShown) {
      const canonicalKey = buildFordStyleCanonicalKey('STLA', '', normalized.equipmentNoShown)

      if (canonicalKey) {
        entities.push(createEntity(
          canonicalKey,
          '',
          normalized.equipmentNoShown,
          normalized,
          sheetName
        ))
      }

      anomalies.push({
        type: 'EQUIPMENT_NO_BUT_NO_TOOLING',
        row: normalized.rawRowIndex,
        message: `Equipment No Shown present but no tooling numbers: equipNo=${normalized.equipmentNoShown}`,
        data: { equipNo: normalized.equipmentNoShown }
      })
    }

    if (hasEquipNoOpposite) {
      const canonicalKey = buildFordStyleCanonicalKey('STLA', '', normalized.equipmentNoOpposite)

      if (canonicalKey) {
        entities.push(createEntity(
          canonicalKey,
          '',
          normalized.equipmentNoOpposite,
          normalized,
          sheetName
        ))
      }

      anomalies.push({
        type: 'EQUIPMENT_NO_BUT_NO_TOOLING',
        row: normalized.rawRowIndex,
        message: `Equipment No Opposite present but no tooling numbers: equipNo=${normalized.equipmentNoOpposite}`,
        data: { equipNo: normalized.equipmentNoOpposite }
      })
    }
  }

  if (debug && entities.length > 0) {
    console.log(`[STLA] Row ${normalized.rawRowIndex} produced ${entities.length} entities`)
    entities.forEach(e => {
      console.log(`  - canonicalKey: ${e.canonicalKey}`)
      console.log(`    displayCode: ${e.displayCode}`)
    })
  }

  return entities
}

// ============================================================================
// HELPERS
// ============================================================================

function createEntity(
  canonicalKey: string,
  toolingNumber: string,
  equipNo: string,
  normalized: NormalizedToolRow,
  sheetName: string
): ToolEntity {
  const displayCode = buildDisplayCode(
    toolingNumber,
    equipNo,
    normalized.stationAtomic,
    normalized.equipmentType
  )

  const aliases = buildAliases(
    equipNo,
    normalized.stationGroup,
    normalized.areaName
  )

  return {
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
  }
}

function buildAliases(equipNo: string, stationGroup: string, areaName: string): string[] {
  const aliases: string[] = []

  if (equipNo) {
    aliases.push(normalizeCode(equipNo))
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
 * Validate STLA tool entities and produce report
 */
export function validateSTLAEntities(
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
