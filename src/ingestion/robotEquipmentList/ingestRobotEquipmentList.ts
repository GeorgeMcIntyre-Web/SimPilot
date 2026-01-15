/**
 * Robot Equipment List Ingestion Script
 *
 * Ingests Ford V801 Robot Equipment List Excel files into the domain store.
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import {
  RobotEquipmentEntity,
  RobotEquipmentRawRow,
  RobotEquipmentValidationAnomaly,
  RobotEquipmentValidationReport,
} from './robotEquipmentListTypes.js'
import {
  normalizeRobotEquipmentRows,
  robotEquipmentRowToEntity,
  validateRobotEquipmentEntities,
} from './robotEquipmentListParser.js'

// ============================================================================
// INGESTION FUNCTION
// ============================================================================

export interface RobotEquipmentListIngestionOptions {
  sheetName?: string         // Default: "V801N_Robot_Equipment_List 26.9"
  headerRowIndex?: number    // Default: 1 (0-based) - Row 1 has column group headers
  dataStartRow?: number      // Default: 4 (0-based, skip header + metadata rows)
  verbose?: boolean
}

export interface RobotEquipmentListIngestionResult {
  entities: RobotEquipmentEntity[]
  validationReport: RobotEquipmentValidationReport
  stats: {
    totalRowsRead: number
    entitiesProduced: number
    skippedRows: number
    duplicates: number
    errors: number
  }
}

/**
 * Ingest Robot Equipment List Excel file
 */
export function ingestRobotEquipmentList(
  filePath: string,
  options: RobotEquipmentListIngestionOptions = {}
): RobotEquipmentListIngestionResult {
  const {
    sheetName = 'V801N_Robot_Equipment_List 26.9',
    headerRowIndex = 1,  // Row 1 (0-indexed) contains column group headers
    dataStartRow = 4,
    verbose = false,
  } = options

  if (verbose) {
    console.log(`\n═══════════════════════════════════════════════════════════════`)
    console.log(`  ROBOT EQUIPMENT LIST INGESTION`)
    console.log(`═══════════════════════════════════════════════════════════════\n`)
    console.log(`File: ${filePath}`)
    console.log(`Sheet: ${sheetName}`)
    console.log(`Header Row: ${headerRowIndex}`)
    console.log(`Data Start Row: ${dataStartRow}\n`)
  }

  // Read Excel file with cell styles to detect strikethrough
  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true })

  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found in workbook. Available: ${workbook.SheetNames.join(', ')}`)
  }

  const sheet = workbook.Sheets[sheetName]

  // Parse header row to get column names
  const headerData: any[] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: headerRowIndex,
    defval: '',
  })

  if (headerData.length === 0) {
    throw new Error(`No header row found at row ${headerRowIndex}`)
  }

  const headerRow = headerData[0] as string[]

  // Parse data rows starting from dataStartRow
  // Object-based rows using headers as keys
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: headerRow,
    range: dataStartRow,
    defval: '',
  })

  // Also read as raw arrays to access Column 0 (area group) which has no header
  const rawArrayData: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,  // Return arrays, not objects
    range: dataStartRow,
    defval: '',
  })

  const totalRowsRead = rawData.length

  if (verbose) {
    console.log(`Total rows read: ${totalRowsRead}`)
    console.log(`Processing data...\n`)
  }

  // Normalize rows
  const normalizedRows = normalizeRobotEquipmentRows(
    rawData as RobotEquipmentRawRow[],
    rawArrayData,
    filePath,
    headerRowIndex
  )

  if (verbose) {
    console.log(`Normalized rows: ${normalizedRows.length}`)
  }

  // Convert to entities
  const anomalies: RobotEquipmentValidationAnomaly[] = []
  const entities: RobotEquipmentEntity[] = []

  for (const row of normalizedRows) {
    const entity = robotEquipmentRowToEntity(row, sheetName, filePath, anomalies)
    if (entity) {
      entities.push(entity)
    }
  }

  if (verbose) {
    console.log(`Entities created: ${entities.length}\n`)
  }

  // Detect struck-through (removed) robots
  const robotIdColumnIndex = 9  // "Robo No. New" is in column 9
  let removedCount = 0

  for (const entity of entities) {
    const rowIndex = entity.source.row
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: robotIdColumnIndex })
    const cell = sheet[cellAddress]

    if (cell && cell.s && cell.s.font && cell.s.font.strike) {
      entity.isRemoved = true
      removedCount++
    }
  }

  if (verbose && removedCount > 0) {
    console.log(`Detected ${removedCount} removed (struck-through) robots\n`)
  }

  // Validate
  const validationReport = validateRobotEquipmentEntities(
    entities,
    totalRowsRead,
    anomalies
  )

  if (verbose) {
    console.log(`Validation Complete:`)
    console.log(`  - Total Entities: ${validationReport.totalEntitiesProduced}`)
    console.log(`  - Duplicates: ${validationReport.duplicateRobotCount}`)
    console.log(`  - Missing Robot IDs: ${validationReport.missingRobotIdCount}`)
    console.log(`  - Missing Stations: ${validationReport.missingStationCount}`)
    console.log(`  - Invalid Formats: ${validationReport.invalidFormatCount}`)
    console.log(`  - Total Anomalies: ${validationReport.anomalies.length}\n`)

    if (validationReport.anomalies.length > 0) {
      console.log(`Anomalies:`)
      for (const anomaly of validationReport.anomalies.slice(0, 10)) {
        console.log(`  [${anomaly.type}] Row ${anomaly.row}: ${anomaly.message}`)
      }
      if (validationReport.anomalies.length > 10) {
        console.log(`  ... and ${validationReport.anomalies.length - 10} more`)
      }
      console.log()
    }
  }

  const stats = {
    totalRowsRead,
    entitiesProduced: entities.length,
    skippedRows: totalRowsRead - normalizedRows.length,
    duplicates: validationReport.duplicateRobotCount,
    errors: validationReport.anomalies.length,
  }

  if (verbose) {
    console.log(`═══════════════════════════════════════════════════════════════\n`)
  }

  return {
    entities,
    validationReport,
    stats,
  }
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

// Check if running as main module (ESM compatible)
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`

if (isMainModule) {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Usage: tsx ingestRobotEquipmentList.ts <path-to-excel-file>')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  try {
    const result = ingestRobotEquipmentList(filePath, { verbose: true })

    // Print summary
    console.log(`\n✓ Ingestion Complete`)
    console.log(`  Total Robots: ${result.stats.entitiesProduced}`)
    console.log(`  Skipped Rows: ${result.stats.skippedRows}`)
    console.log(`  Errors: ${result.stats.errors}`)

    // Sample entities
    if (result.entities.length > 0) {
      console.log(`\n  Sample Robots:`)
      for (const entity of result.entities.slice(0, 5)) {
        console.log(`    - ${entity.robotId} (${entity.station}) - ${entity.robotType} - ${entity.application}`)
        console.log(`      Serial: ${entity.serialNumber || 'N/A'}, Status: ${entity.installStatus || 'N/A'}`)
      }
    }

    process.exit(0)
  } catch (error) {
    console.error(`\n✗ Ingestion Failed:`, (error as Error).message)
    process.exit(1)
  }
}
