/**
 * Diagnostic Script: Milestone Column Mismatch Analysis
 *
 * This script reads the simulation status Excel file and compares
 * the actual column headers with what the code expects to find.
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import {
  SIMULATION_MILESTONES,
  ROBOT_SIMULATION_MILESTONES,
  SPOT_WELDING_MILESTONES,
  SEALER_MILESTONES,
  ALTERNATIVE_JOINING_MILESTONES,
  GRIPPER_MILESTONES,
  FIXTURE_MILESTONES,
} from '../../src/ingestion/simulationStatus/simulationStatusTypes'

// Path to test Excel file
const EXCEL_PATH = 'C:\\Users\\edwin.msakwa\\Desktop\\SIM-PILOT-TEST-DATA\\FORD\\P708_Docs\\Simulation\\FORD_P708_Underbody_8X-010-to-8Y-160_Simulation_Status.xlsx'

function main() {
  console.log('='.repeat(80))
  console.log('MILESTONE COLUMN DIAGNOSTIC REPORT')
  console.log('='.repeat(80))
  console.log(`\nExcel File: ${EXCEL_PATH}\n`)

  // Read the Excel file
  const buffer = fs.readFileSync(EXCEL_PATH)
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  console.log('Available sheets:', workbook.SheetNames.join(', '))
  console.log('')

  // Check SIMULATION sheet
  const simulationSheet = workbook.Sheets['SIMULATION']
  if (!simulationSheet) {
    console.log('ERROR: SIMULATION sheet not found!')
    return
  }

  // Get all data including headers
  const rawData: any[][] = XLSX.utils.sheet_to_json(simulationSheet, { header: 1, defval: '' })

  // Find header row
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const row = rawData[i] as any[]
    const rowStr = row.join('|').toLowerCase()
    if (rowStr.includes('station') && rowStr.includes('robot')) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    console.log('ERROR: Could not find header row!')
    return
  }

  console.log(`Header row found at index: ${headerRowIndex}`)
  console.log('')

  // Get actual headers from Excel
  const actualHeaders = (rawData[headerRowIndex] as string[]).map(h => String(h || '').trim())

  console.log('='.repeat(80))
  console.log('ACTUAL EXCEL HEADERS (in order)')
  console.log('='.repeat(80))
  actualHeaders.forEach((header, idx) => {
    if (header) {
      console.log(`  [${idx}] "${header}"`)
    }
  })

  console.log('')
  console.log('='.repeat(80))
  console.log('EXPECTED vs ACTUAL COMPARISON')
  console.log('='.repeat(80))

  // Compare SIMULATION_MILESTONES (legacy flat structure)
  console.log('\n--- SIMULATION_MILESTONES (Legacy) ---\n')

  for (const [key, expectedColumn] of Object.entries(SIMULATION_MILESTONES)) {
    const exactMatch = actualHeaders.includes(expectedColumn)
    const caseInsensitiveMatch = actualHeaders.some(h =>
      h.toUpperCase().trim() === expectedColumn.toUpperCase().trim()
    )
    const partialMatch = actualHeaders.find(h =>
      h.toUpperCase().includes(expectedColumn.toUpperCase().substring(0, 20))
    )

    if (exactMatch) {
      console.log(`  ✓ ${key}: "${expectedColumn}"`)
    } else if (caseInsensitiveMatch) {
      console.log(`  ~ ${key}: "${expectedColumn}" (case mismatch)`)
    } else if (partialMatch) {
      console.log(`  ? ${key}:`)
      console.log(`      Expected: "${expectedColumn}"`)
      console.log(`      Found:    "${partialMatch}"`)
    } else {
      console.log(`  ✗ ${key}: "${expectedColumn}" NOT FOUND`)
    }
  }

  // Compare panel-grouped milestones
  const panelMilestones = {
    'ROBOT_SIMULATION_MILESTONES': ROBOT_SIMULATION_MILESTONES,
    'SPOT_WELDING_MILESTONES': SPOT_WELDING_MILESTONES,
    'SEALER_MILESTONES': SEALER_MILESTONES,
    'ALTERNATIVE_JOINING_MILESTONES': ALTERNATIVE_JOINING_MILESTONES,
    'GRIPPER_MILESTONES': GRIPPER_MILESTONES,
    'FIXTURE_MILESTONES': FIXTURE_MILESTONES,
  }

  for (const [panelName, milestones] of Object.entries(panelMilestones)) {
    console.log(`\n--- ${panelName} ---\n`)

    for (const [key, expectedColumn] of Object.entries(milestones)) {
      const exactMatch = actualHeaders.includes(expectedColumn)
      const caseInsensitiveMatch = actualHeaders.some(h =>
        h.toUpperCase().trim() === expectedColumn.toUpperCase().trim()
      )
      const partialMatch = actualHeaders.find(h =>
        h.toUpperCase().includes(expectedColumn.toUpperCase().substring(0, 15)) ||
        expectedColumn.toUpperCase().includes(h.toUpperCase().substring(0, 15))
      )

      if (exactMatch) {
        console.log(`  ✓ ${key}: "${expectedColumn}"`)
      } else if (caseInsensitiveMatch) {
        console.log(`  ~ ${key}: "${expectedColumn}" (case mismatch)`)
      } else if (partialMatch) {
        console.log(`  ? ${key}:`)
        console.log(`      Expected: "${expectedColumn}"`)
        console.log(`      Found:    "${partialMatch}"`)
      } else {
        console.log(`  ✗ ${key}: "${expectedColumn}" NOT FOUND`)
      }
    }
  }

  // Show multiple data rows to understand the structure
  console.log('')
  console.log('='.repeat(80))
  console.log('FIRST 5 DATA ROWS')
  console.log('='.repeat(80))

  const dataWithHeaders = XLSX.utils.sheet_to_json(simulationSheet, { range: headerRowIndex })

  for (let i = 0; i < Math.min(5, dataWithHeaders.length); i++) {
    const row = dataWithHeaders[i] as Record<string, unknown>
    console.log(`\n--- Row ${i + 1} ---`)

    // Show key fields
    console.log(`  STATION: ${JSON.stringify(row['STATION'])}`)
    console.log(`  ROBOT: ${JSON.stringify(row['ROBOT'])}`)
    console.log(`  APPLICATION: ${JSON.stringify(row['APPLICATION'])}`)
    console.log(`  ROBOT POSITION - STAGE 1: ${JSON.stringify(row['ROBOT POSITION - STAGE 1'])}`)
    console.log(`  DCS CONFIGURED: ${JSON.stringify(row['DCS CONFIGURED'])}`)
    console.log(`  SPOT WELDS DISTRIBUTED + PROJECTED: ${JSON.stringify(row['SPOT WELDS DISTRIBUTED + PROJECTED'])}`)
  }

  // Show unmatched Excel headers (columns that exist but aren't mapped)
  console.log('')
  console.log('='.repeat(80))
  console.log('UNMATCHED EXCEL HEADERS')
  console.log('='.repeat(80))

  const allExpectedColumns = [
    ...Object.values(SIMULATION_MILESTONES),
    ...Object.values(ROBOT_SIMULATION_MILESTONES),
    ...Object.values(SPOT_WELDING_MILESTONES),
    ...Object.values(SEALER_MILESTONES),
    ...Object.values(ALTERNATIVE_JOINING_MILESTONES),
    ...Object.values(GRIPPER_MILESTONES),
    ...Object.values(FIXTURE_MILESTONES),
  ]

  const unmatchedHeaders = actualHeaders.filter(h => {
    if (!h || h.length < 3) return false
    const normalizedHeader = h.toUpperCase().trim()
    return !allExpectedColumns.some(expected =>
      expected.toUpperCase().trim() === normalizedHeader ||
      normalizedHeader.includes(expected.toUpperCase().trim()) ||
      expected.toUpperCase().trim().includes(normalizedHeader)
    )
  })

  console.log('\nExcel columns not matched to any expected milestone:')
  unmatchedHeaders.forEach(h => {
    console.log(`  - "${h}"`)
  })
}

main()
