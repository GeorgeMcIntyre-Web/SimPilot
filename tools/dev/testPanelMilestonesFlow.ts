/**
 * Test Panel Milestones End-to-End Flow
 *
 * This script validates that panel milestones flow correctly from:
 * Excel File → Vacuum Parser → Panel Milestones → CrossRef → UI-ready data
 *
 * Usage:
 *   npx tsx tools/dev/testPanelMilestonesFlow.ts "path/to/SimulationStatus.xlsx"
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

import { sheetToMatrix, findHeaderRow } from '../../src/ingestion/excelUtils'
import {
  vacuumParseSimulationSheet,
  convertVacuumRowsToPanelMilestones,
  VacuumParsedRow,
} from '../../src/ingestion/simulationStatusParser'
import {
  PanelType,
  PANEL_TYPE_TO_DISPLAY,
  PANEL_MILESTONE_DEFINITIONS,
} from '../../src/ingestion/simulationStatus/simulationStatusTypes'

// Required headers for finding the header row
const REQUIRED_HEADERS = ['STATION', 'ROBOT']

interface TestResult {
  sheetName: string
  vacuumRowCount: number
  stationsFound: string[]
  robotsFound: string[]
  metricsPerRow: number[]
  sampleMetrics: { label: string; percent: number | null }[]
}

interface PanelTestResult {
  panelType: PanelType
  displayName: string
  milestonesDefined: number
  milestonesWithValues: number
  completion: number
  sampleMilestones: { label: string; value: number | null }[]
}

function testSheetParsing(
  workbook: XLSX.WorkBook,
  sheetName: string,
  fileName: string
): TestResult | null {
  if (!workbook.SheetNames.includes(sheetName)) {
    console.log(`  Sheet "${sheetName}" not found, skipping.`)
    return null
  }

  const rows = sheetToMatrix(workbook, sheetName)
  const headerRowIndex = findHeaderRow(rows, REQUIRED_HEADERS)

  if (headerRowIndex === null) {
    console.log(`  Could not find header row in "${sheetName}", skipping.`)
    return null
  }

  const { rows: vacuumRows, warnings } = vacuumParseSimulationSheet(
    rows,
    headerRowIndex,
    fileName,
    sheetName
  )

  if (warnings.length > 0) {
    console.log(`  Warnings (${warnings.length}):`)
    warnings.slice(0, 3).forEach(w => console.log(`    - ${w.message}`))
    if (warnings.length > 3) {
      console.log(`    ... and ${warnings.length - 3} more`)
    }
  }

  const stations = [...new Set(vacuumRows.map(r => r.stationKey))]
  const robots = [...new Set(vacuumRows.filter(r => r.robotCaption).map(r => r.robotCaption!))]
  const metricsPerRow = vacuumRows.map(r => r.metrics.length)

  // Get sample metrics from first row with data
  const sampleRow = vacuumRows.find(r => r.metrics.length > 0)
  const sampleMetrics = sampleRow
    ? sampleRow.metrics.slice(0, 5).map(m => ({ label: m.label, percent: m.percent }))
    : []

  return {
    sheetName,
    vacuumRowCount: vacuumRows.length,
    stationsFound: stations.slice(0, 10),
    robotsFound: robots.slice(0, 10),
    metricsPerRow,
    sampleMetrics,
  }
}

function testPanelMilestones(
  vacuumRows: VacuumParsedRow[]
): { byStation: Map<string, PanelTestResult[]>; byRobot: Map<string, PanelTestResult[]> } {
  const panelMilestonesMap = convertVacuumRowsToPanelMilestones(vacuumRows)

  const byStation = new Map<string, PanelTestResult[]>()
  const byRobot = new Map<string, PanelTestResult[]>()

  for (const [key, panels] of panelMilestonesMap) {
    const isRobotKey = key.includes('::')
    const panelResults: PanelTestResult[] = []

    for (const [panelKey, panelData] of Object.entries(panels)) {
      const panelType = panelKey as PanelType
      const definitions = PANEL_MILESTONE_DEFINITIONS[panelType]
      const definedCount = Object.keys(definitions).length

      const milestonesWithValues = Object.values(panelData.milestones).filter(
        v => v !== null && v !== undefined
      ).length

      const sampleMilestones = Object.entries(panelData.milestones)
        .slice(0, 3)
        .map(([label, value]) => ({ label, value }))

      panelResults.push({
        panelType,
        displayName: PANEL_TYPE_TO_DISPLAY[panelType],
        milestonesDefined: definedCount,
        milestonesWithValues,
        completion: panelData.completion,
        sampleMilestones,
      })
    }

    if (isRobotKey) {
      byRobot.set(key, panelResults)
    } else {
      byStation.set(key, panelResults)
    }
  }

  return { byStation, byRobot }
}

async function main(): Promise<void> {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Usage: npx tsx tools/dev/testPanelMilestonesFlow.ts "path/to/file.xlsx"')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log('=' .repeat(80))
  console.log('PANEL MILESTONES END-TO-END FLOW TEST')
  console.log('=' .repeat(80))
  console.log(`File: ${path.basename(filePath)}`)

  const workbook = XLSX.readFile(filePath)
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`)

  // Test each simulation-related sheet
  const simulationSheets = ['SIMULATION', 'MRS_OLP', 'DOCUMENTATION', 'SAFETY_LAYOUT']
  const allVacuumRows: VacuumParsedRow[] = []

  console.log('\n' + '=' .repeat(80))
  console.log('PHASE 1: VACUUM PARSING')
  console.log('=' .repeat(80))

  for (const sheetName of simulationSheets) {
    console.log(`\n--- Sheet: ${sheetName} ---`)

    if (!workbook.SheetNames.includes(sheetName)) {
      console.log('  Not found, skipping.')
      continue
    }

    const rows = sheetToMatrix(workbook, sheetName)
    const headerRowIndex = findHeaderRow(rows, REQUIRED_HEADERS)

    if (headerRowIndex === null) {
      console.log('  Could not find header row, skipping.')
      continue
    }

    const { rows: vacuumRows, warnings } = vacuumParseSimulationSheet(
      rows,
      headerRowIndex,
      path.basename(filePath),
      sheetName
    )

    console.log(`  Vacuum rows parsed: ${vacuumRows.length}`)
    console.log(`  Warnings: ${warnings.length}`)

    if (vacuumRows.length > 0) {
      const stations = [...new Set(vacuumRows.map(r => r.stationKey))]
      const avgMetrics = vacuumRows.reduce((sum, r) => sum + r.metrics.length, 0) / vacuumRows.length

      console.log(`  Unique stations: ${stations.length}`)
      console.log(`  Avg metrics per row: ${avgMetrics.toFixed(1)}`)

      // Show sample metrics
      const sampleRow = vacuumRows[0]
      console.log(`  Sample station: ${sampleRow.stationKey}`)
      console.log(`  Sample robot: ${sampleRow.robotCaption || '(none)'}`)
      console.log(`  Sample metrics (first 5):`)
      sampleRow.metrics.slice(0, 5).forEach(m => {
        console.log(`    - "${m.label}": ${m.percent ?? 'null'}`)
      })

      allVacuumRows.push(...vacuumRows)
    }
  }

  console.log('\n' + '=' .repeat(80))
  console.log('PHASE 2: PANEL MILESTONE CONVERSION')
  console.log('=' .repeat(80))

  console.log(`\nTotal vacuum rows: ${allVacuumRows.length}`)

  const panelMilestonesMap = convertVacuumRowsToPanelMilestones(allVacuumRows)
  console.log(`Panel milestones map entries: ${panelMilestonesMap.size}`)

  // Separate station-level and robot-level entries
  const stationKeys = [...panelMilestonesMap.keys()].filter(k => !k.includes('::'))
  const robotKeys = [...panelMilestonesMap.keys()].filter(k => k.includes('::'))

  console.log(`  Station-level entries: ${stationKeys.length}`)
  console.log(`  Robot-level entries: ${robotKeys.length}`)

  // Test one station entry in detail
  if (stationKeys.length > 0) {
    const testStationKey = stationKeys[0]
    const testPanels = panelMilestonesMap.get(testStationKey)!

    console.log(`\n--- Sample Station: ${testStationKey} ---`)

    for (const [panelKey, panelData] of Object.entries(testPanels)) {
      const panelType = panelKey as PanelType
      const milestonesWithValues = Object.values(panelData.milestones).filter(
        v => v !== null && v !== undefined
      ).length
      const totalMilestones = Object.keys(panelData.milestones).length

      console.log(`  ${PANEL_TYPE_TO_DISPLAY[panelType]}:`)
      console.log(`    Milestones with values: ${milestonesWithValues}/${totalMilestones}`)
      console.log(`    Completion: ${panelData.completion}%`)

      // Show first 3 milestones with values
      const withValues = Object.entries(panelData.milestones)
        .filter(([, v]) => v !== null)
        .slice(0, 3)

      if (withValues.length > 0) {
        console.log(`    Sample values:`)
        withValues.forEach(([label, value]) => {
          console.log(`      - "${label}": ${value}%`)
        })
      }
    }
  }

  console.log('\n' + '=' .repeat(80))
  console.log('PHASE 3: SUMMARY')
  console.log('=' .repeat(80))

  // Calculate overall statistics
  let totalPanelsWithData = 0
  let totalMilestonesWithValues = 0
  let totalMilestonesDefined = 0

  for (const [, panels] of panelMilestonesMap) {
    for (const [panelKey, panelData] of Object.entries(panels)) {
      const panelType = panelKey as PanelType
      const definitions = PANEL_MILESTONE_DEFINITIONS[panelType]
      const definedCount = Object.keys(definitions).length
      const withValues = Object.values(panelData.milestones).filter(v => v !== null).length

      totalMilestonesDefined += definedCount
      totalMilestonesWithValues += withValues

      if (withValues > 0) {
        totalPanelsWithData++
      }
    }
  }

  console.log(`\nTotal entries in map: ${panelMilestonesMap.size}`)
  console.log(`  - Station-level: ${stationKeys.length}`)
  console.log(`  - Robot-level: ${robotKeys.length}`)
  console.log(`\nPanels with data: ${totalPanelsWithData} (across all entries)`)
  console.log(`Milestones with values: ${totalMilestonesWithValues} / ${totalMilestonesDefined}`)
  console.log(`Overall data coverage: ${((totalMilestonesWithValues / totalMilestonesDefined) * 100).toFixed(1)}%`)

  // Verify key format works for lookup
  console.log('\n--- Key Lookup Verification ---')

  if (stationKeys.length > 0) {
    const testKey = stationKeys[0]
    const found = panelMilestonesMap.get(testKey)
    console.log(`  Lookup by station key "${testKey}": ${found ? 'FOUND ✓' : 'NOT FOUND ✗'}`)
  }

  if (robotKeys.length > 0) {
    const testKey = robotKeys[0]
    const found = panelMilestonesMap.get(testKey)
    console.log(`  Lookup by robot key "${testKey}": ${found ? 'FOUND ✓' : 'NOT FOUND ✗'}`)
  }

  console.log('\n' + '=' .repeat(80))
  console.log('TEST COMPLETE')
  console.log('=' .repeat(80))
  console.log('\nNext step: Load this file in the app and verify panel milestones appear in the UI.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
