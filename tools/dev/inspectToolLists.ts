/**
 * Tool List Inspector
 *
 * Loads Excel tool lists using schema adapters and prints comprehensive count report:
 * - Total raw rows read
 * - Total normalized rows produced
 * - Total tool entities produced
 * - Total entities skipped as deleted (strike-through)
 * - Duplicate canonical keys (and how they were disambiguated)
 * - Breakdown by project (BMW: by EquipmentType, V801/STLA: by side RH/LH, by area prefix)
 * - Top 20 "why skipped" samples (when --debug flag is used)
 *
 * Usage: npm run dev:inspect-tool-lists -- <path-to-xlsx> [--debug]
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { parseToolListWithSchema } from '../../src/ingestion/toolListSchemas/toolListSchemaAdapter'

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: npm run dev:inspect-tool-lists -- <path-to-xlsx> [--debug]')
    console.error('Example: npm run dev:inspect-tool-lists -- "C:\\path\\to\\tool list.xlsx"')
    process.exit(1)
  }

  const filePath = args.find(arg => !arg.startsWith('--'))
  const debug = args.includes('--debug')

  if (!filePath) {
    console.error('Error: No file path provided')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`)
    process.exit(1)
  }

  const report = await inspectToolList(filePath, debug)
  printReport(report, debug)
}

// ============================================================================
// INSPECTION
// ============================================================================

interface FileReport {
  filePath: string
  fileName: string
  sheetName: string
  projectHint: string
  totalRowsRead: number
  totalNormalizedRows: number
  totalEntitiesProduced: number
  deletedRowsSkipped: number
  duplicateCanonicalKeys: number
  missingStationGroupCount: number
  missingToolingNumbersCount: number
  anomalies: Array<{
    type: string
    row: number
    message: string
    data?: Record<string, unknown>
  }>
  entities: Array<{
    canonicalKey: string
    displayCode: string
    stationGroup: string
    stationAtomic: string
    areaName: string
    source: {
      file: string
      row: number
      sheet: string
    }
    raw: Record<string, unknown>
  }>
}

async function inspectToolList(filePath: string, debug: boolean): Promise<FileReport> {
  const fileName = path.basename(filePath)
  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellStyles: true  // Enable style parsing for strike-through detection
  })

  // Find sheet named "ToolList" or use first sheet
  let sheetName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes('toollist') ||
    name.toLowerCase().includes('tool list')
  )

  if (!sheetName) {
    sheetName = workbook.SheetNames[0]
  }

  // Use schema-aware parser
  const result = await parseToolListWithSchema(workbook, fileName, sheetName, debug)

  return {
    filePath,
    fileName,
    sheetName,
    projectHint: result.projectHint,
    totalRowsRead: result.validation.totalRowsRead,
    totalNormalizedRows: result.validation.totalNormalizedRows,
    totalEntitiesProduced: result.validation.totalEntitiesProduced,
    deletedRowsSkipped: result.validation.deletedRowsSkipped,
    duplicateCanonicalKeys: result.validation.duplicateCanonicalKeys,
    missingStationGroupCount: result.validation.missingStationGroupCount,
    missingToolingNumbersCount: result.validation.missingToolingNumbersCount,
    anomalies: result.validation.anomalies,
    entities: result.entities
  }
}

// ============================================================================
// REPORTING
// ============================================================================

function printReport(report: FileReport, debug: boolean): void {
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  TOOL LIST COUNT REPORT')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`File: ${report.fileName}`)
  console.log(`Project: ${report.projectHint}`)
  console.log(`Sheet: ${report.sheetName}`)
  console.log()
  console.log('───────────────────────────────────────────────────────────────')
  console.log('  ROW & ENTITY COUNTS')
  console.log('───────────────────────────────────────────────────────────────')
  console.log(`Total Raw Rows Read:            ${report.totalRowsRead}`)
  console.log(`Total Normalized Rows:          ${report.totalNormalizedRows}`)
  console.log(`Total Tool Entities Produced:   ${report.totalEntitiesProduced}`)
  console.log(`Entities Skipped (Deleted):     ${report.deletedRowsSkipped}`)
  console.log(`Duplicate Canonical Keys:       ${report.duplicateCanonicalKeys}`)
  console.log(`Missing Station Groups:         ${report.missingStationGroupCount}`)
  console.log(`Missing Tooling Numbers:        ${report.missingToolingNumbersCount}`)

  console.log('\n───────────────────────────────────────────────────────────────')
  console.log('  PROJECT-SPECIFIC BREAKDOWN')
  console.log('───────────────────────────────────────────────────────────────')

  if (report.projectHint === 'BMW_J10735') {
    printBMWBreakdown(report)
  } else if (report.projectHint === 'FORD_V801') {
    printV801Breakdown(report)
  } else if (report.projectHint === 'STLA_S_ZAR') {
    printSTLABreakdown(report)
  }

  // Print anomalies summary
  const anomalyTypes = new Map<string, number>()
  report.anomalies.forEach(anomaly => {
    anomalyTypes.set(anomaly.type, (anomalyTypes.get(anomaly.type) || 0) + 1)
  })

  if (anomalyTypes.size > 0) {
    console.log('\n───────────────────────────────────────────────────────────────')
    console.log('  ANOMALIES SUMMARY')
    console.log('───────────────────────────────────────────────────────────────')
    anomalyTypes.forEach((count, type) => {
      console.log(`${type.padEnd(35)} ${String(count).padStart(6)}`)
    })
  }

  // Print detailed anomalies in debug mode
  if (debug && report.anomalies.length > 0) {
    console.log('\n───────────────────────────────────────────────────────────────')
    console.log('  TOP 20 ANOMALIES (DEBUG MODE)')
    console.log('───────────────────────────────────────────────────────────────')
    const topAnomalies = report.anomalies.slice(0, 20)
    topAnomalies.forEach((anomaly, idx) => {
      console.log(`\n[${idx + 1}] Row ${anomaly.row} - ${anomaly.type}`)
      console.log(`    ${anomaly.message}`)
      if (anomaly.data) {
        console.log(`    Data: ${JSON.stringify(anomaly.data, null, 2).substring(0, 200)}...`)
      }
    })
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n')
}

function printBMWBreakdown(report: FileReport): void {
  console.log('BMW J10735 Breakdown:')

  // Count entities by Equipment Type
  const typeCount = new Map<string, number>()
  report.entities.forEach(entity => {
    const equipType = String(entity.raw['Equipment Type'] || 'UNKNOWN')
    typeCount.set(equipType, (typeCount.get(equipType) || 0) + 1)
  })

  console.log('\nEntities by Equipment Type (Top 10):')
  const sortedTypes = Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  sortedTypes.forEach(([type, count]) => {
    console.log(`  ${type.padEnd(30)} ${String(count).padStart(6)}`)
  })

  // Count entities by Area
  const areaCount = new Map<string, number>()
  report.entities.forEach(entity => {
    const area = entity.areaName || 'UNKNOWN'
    areaCount.set(area, (areaCount.get(area) || 0) + 1)
  })

  console.log('\nEntities by Area (Top 10):')
  const sortedAreas = Array.from(areaCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  sortedAreas.forEach(([area, count]) => {
    console.log(`  ${area.padEnd(30)} ${String(count).padStart(6)}`)
  })
}

function printV801Breakdown(report: FileReport): void {
  console.log('Ford V801 Breakdown:')

  // Count entities by side (RH/LH/opposite)
  let rhCount = 0
  let lhCount = 0
  let oppositeCount = 0

  report.entities.forEach(entity => {
    const key = entity.canonicalKey
    if (key.includes('-RH') || key.endsWith('R')) {
      rhCount++
    } else if (key.includes('-LH') || key.endsWith('L')) {
      lhCount++
    } else if (key.includes('OPPOSITE')) {
      oppositeCount++
    }
  })

  console.log('\nEntities by Side:')
  console.log(`  RH (Right Hand):                ${String(rhCount).padStart(6)}`)
  console.log(`  LH (Left Hand):                 ${String(lhCount).padStart(6)}`)
  console.log(`  Opposite:                       ${String(oppositeCount).padStart(6)}`)

  // Count entities by Area prefix
  const areaCount = new Map<string, number>()
  report.entities.forEach(entity => {
    const area = entity.areaName || 'UNKNOWN'
    const prefix = area.match(/^([A-Z0-9]+)/) ?.[1] || area
    areaCount.set(prefix, (areaCount.get(prefix) || 0) + 1)
  })

  console.log('\nEntities by Area Prefix (Top 10):')
  const sortedAreas = Array.from(areaCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  sortedAreas.forEach(([prefix, count]) => {
    console.log(`  ${prefix.padEnd(30)} ${String(count).padStart(6)}`)
  })
}

function printSTLABreakdown(report: FileReport): void {
  console.log('STLA S ZAR Breakdown:')

  // Count entities by side (RH/LH/opposite)
  let rhCount = 0
  let lhCount = 0
  let oppositeRHCount = 0
  let oppositeLHCount = 0

  report.entities.forEach(entity => {
    const key = entity.canonicalKey
    if (key.includes('OPPOSITE-RH')) {
      oppositeRHCount++
    } else if (key.includes('OPPOSITE-LH')) {
      oppositeLHCount++
    } else if (key.includes('-RH') || key.endsWith('R')) {
      rhCount++
    } else if (key.includes('-LH') || key.endsWith('L')) {
      lhCount++
    }
  })

  console.log('\nEntities by Side:')
  console.log(`  RH (Right Hand):                ${String(rhCount).padStart(6)}`)
  console.log(`  LH (Left Hand):                 ${String(lhCount).padStart(6)}`)
  console.log(`  Opposite RH:                    ${String(oppositeRHCount).padStart(6)}`)
  console.log(`  Opposite LH:                    ${String(oppositeLHCount).padStart(6)}`)

  // Count entities by SUB Area
  const areaCount = new Map<string, number>()
  report.entities.forEach(entity => {
    const area = entity.areaName || 'UNKNOWN'
    areaCount.set(area, (areaCount.get(area) || 0) + 1)
  })

  console.log('\nEntities by SUB Area (Top 10):')
  const sortedAreas = Array.from(areaCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  sortedAreas.forEach(([area, count]) => {
    console.log(`  ${area.padEnd(30)} ${String(count).padStart(6)}`)
  })
}

// ============================================================================
// RUN
// ============================================================================

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
