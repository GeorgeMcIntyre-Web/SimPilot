/**
 * Debug Robot Simulation Panel Data Flow
 *
 * This script traces exactly where Robot Simulation panel data comes from
 * and why it might not be showing in the UI.
 *
 * Usage:
 *   npx tsx tools/dev/debugRobotSimulationPanel.ts "path/to/SimulationStatus.xlsx"
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
  ROBOT_SIMULATION_MILESTONES,
} from '../../src/ingestion/simulationStatus/simulationStatusTypes'

const REQUIRED_HEADERS = ['STATION', 'ROBOT']

async function main(): Promise<void> {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Usage: npx tsx tools/dev/debugRobotSimulationPanel.ts "path/to/file.xlsx"')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const fileName = path.basename(filePath)
  console.log('=' .repeat(80))
  console.log('DEBUG: Robot Simulation Panel Data Flow')
  console.log('=' .repeat(80))
  console.log(`File: ${fileName}`)

  const workbook = XLSX.readFile(filePath)

  // STEP 1: Show expected milestone columns
  console.log('\n--- STEP 1: Expected Robot Simulation Milestones ---')
  const expectedMilestones = Object.values(ROBOT_SIMULATION_MILESTONES)
  expectedMilestones.forEach((m, i) => {
    console.log(`  ${i + 1}. "${m}"`)
  })

  // STEP 2: Parse SIMULATION sheet and show what columns are found
  console.log('\n--- STEP 2: Parse SIMULATION Sheet ---')

  if (!workbook.SheetNames.includes('SIMULATION')) {
    console.error('ERROR: SIMULATION sheet not found!')
    process.exit(1)
  }

  const rows = sheetToMatrix(workbook, 'SIMULATION')
  const headerRowIndex = findHeaderRow(rows, REQUIRED_HEADERS)

  if (headerRowIndex === null) {
    console.error('ERROR: Could not find header row in SIMULATION sheet!')
    process.exit(1)
  }

  console.log(`Header row index: ${headerRowIndex}`)

  // Show headers
  const headerRow = rows[headerRowIndex]
  console.log('\nAll column headers found:')
  headerRow.forEach((h, i) => {
    const header = String(h || '').trim()
    if (header) {
      console.log(`  [${i}] "${header}"`)
    }
  })

  // STEP 3: Parse vacuum rows
  console.log('\n--- STEP 3: Vacuum Parse Results ---')

  const { rows: vacuumRows, warnings } = vacuumParseSimulationSheet(
    rows,
    headerRowIndex,
    fileName,
    'SIMULATION'
  )

  console.log(`Vacuum rows parsed: ${vacuumRows.length}`)
  console.log(`Warnings: ${warnings.length}`)

  if (vacuumRows.length > 0) {
    const sampleRow = vacuumRows[0]
    console.log(`\nSample vacuum row:`)
    console.log(`  stationKey: "${sampleRow.stationKey}"`)
    console.log(`  robotCaption: "${sampleRow.robotCaption}"`)
    console.log(`  metrics count: ${sampleRow.metrics.length}`)

    console.log('\n  All metrics in sample row:')
    sampleRow.metrics.forEach((m, i) => {
      console.log(`    ${i + 1}. "${m.label}" = ${m.percent}`)
    })

    // Check which Robot Simulation milestones are in the metrics
    console.log('\n  Robot Simulation milestone matching:')
    for (const milestone of expectedMilestones) {
      const found = sampleRow.metrics.find(m => {
        const normMetric = m.label.trim().toUpperCase()
        const normMilestone = milestone.trim().toUpperCase()
        return normMetric === normMilestone
      })
      if (found) {
        console.log(`    ✓ "${milestone}" = ${found.percent}`)
      } else {
        console.log(`    ✗ "${milestone}" NOT FOUND`)
      }
    }
  }

  // STEP 4: Convert to panel milestones
  console.log('\n--- STEP 4: Panel Milestones Conversion ---')

  const panelMilestonesMap = convertVacuumRowsToPanelMilestones(vacuumRows)

  console.log(`Panel milestones map size: ${panelMilestonesMap.size}`)

  // Get first station-level entry
  const stationKeys = [...panelMilestonesMap.keys()].filter(k => !k.includes('::'))

  if (stationKeys.length > 0) {
    const sampleKey = stationKeys[0]
    const panels = panelMilestonesMap.get(sampleKey)!

    console.log(`\nSample station: "${sampleKey}"`)
    console.log(`\nRobot Simulation panel data:`)
    console.log(`  completion: ${panels.robotSimulation.completion}%`)
    console.log(`  milestones:`)

    for (const [label, value] of Object.entries(panels.robotSimulation.milestones)) {
      console.log(`    "${label}": ${value}`)
    }
  }

  console.log('\n' + '=' .repeat(80))
  console.log('DEBUG COMPLETE')
  console.log('=' .repeat(80))
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
