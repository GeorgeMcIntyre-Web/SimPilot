/**
 * Analyze Simulation Status Excel File Columns
 *
 * This tool extracts all column headers from each sheet in a Simulation Status Excel file
 * and compares them against the defined milestone definitions.
 *
 * Usage:
 *   npx tsx tools/dev/analyzeSimulationStatusColumns.ts "path/to/file.xlsx"
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

import {
  ROBOT_SIMULATION_MILESTONES,
  SPOT_WELDING_MILESTONES,
  SEALER_MILESTONES,
  ALTERNATIVE_JOINING_MILESTONES,
  GRIPPER_MILESTONES,
  FIXTURE_MILESTONES,
  MRS_MILESTONES,
  OLP_MILESTONES,
  DOCUMENTATION_MILESTONES,
  LAYOUT_MILESTONES,
  SAFETY_MILESTONES,
  SHEET_TO_PANELS,
  PANEL_TYPE_TO_DISPLAY,
  PanelType,
} from '../../src/ingestion/simulationStatus/simulationStatusTypes'

// Panel to milestone definitions mapping
const PANEL_TO_MILESTONES: Record<PanelType, Record<string, string>> = {
  robotSimulation: ROBOT_SIMULATION_MILESTONES,
  spotWelding: SPOT_WELDING_MILESTONES,
  sealer: SEALER_MILESTONES,
  alternativeJoining: ALTERNATIVE_JOINING_MILESTONES,
  gripper: GRIPPER_MILESTONES,
  fixture: FIXTURE_MILESTONES,
  mrs: MRS_MILESTONES,
  olp: OLP_MILESTONES,
  documentation: DOCUMENTATION_MILESTONES,
  layout: LAYOUT_MILESTONES,
  safety: SAFETY_MILESTONES,
}

// Core fields that are not milestones
const CORE_FIELDS = [
  'AREA', 'AREA CODE', 'ZONE', 'SHORT NAME',
  'AREA NAME', 'AREA DESCRIPTION', 'FULL NAME',
  'ASSEMBLY LINE', 'LINE', 'LINE CODE',
  'STATION NO. NEW', 'STATION', 'STATION CODE', 'STATION KEY', 'STATION NO.',
  'ROBOT', 'ROBOT CAPTION', 'ROBOT NAME',
  'APPLICATION', 'APP',
  'PERSONS RESPONSIBLE', 'PERSON RESPONSIBLE', 'ENGINEER', 'RESPONSIBLE',
  'PERS. RESPONSIBLE'
]

interface SheetAnalysis {
  sheetName: string
  rowCount: number
  columnCount: number
  headerRowIndex: number
  headers: string[]
  expectedPanels: PanelType[]
  milestoneMatches: {
    panel: PanelType
    definedMilestones: string[]
    matchedMilestones: { defined: string; found: string }[]
    unmatchedDefined: string[]
  }[]
  unmatchedHeaders: string[]
}

function normalizeHeader(header: string): string {
  return header.trim().toUpperCase().replace(/\s+/g, ' ')
}

function headersMatch(excelHeader: string, definedMilestone: string): boolean {
  const normExcel = normalizeHeader(excelHeader)
  const normDefined = normalizeHeader(definedMilestone)

  // Exact match (after normalization)
  if (normExcel === normDefined) return true

  // Handle trailing space difference
  if (normExcel.trim() === normDefined.trim()) return true

  return false
}

function findHeaderRow(rows: unknown[][], requiredHeaders: string[]): number {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    if (!row) continue

    const headerTexts = row.map(cell => normalizeHeader(String(cell || '')))
    const matchCount = requiredHeaders.filter(req =>
      headerTexts.some(h => h.includes(req.toUpperCase()))
    ).length

    if (matchCount >= 2) {
      return i
    }
  }
  return 0
}

function analyzeSheet(workbook: XLSX.WorkBook, sheetName: string): SheetAnalysis | null {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return null

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 2) return null

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headerRowIndex = findHeaderRow(rows, ['STATION', 'ROBOT'])
  const headerRow = rows[headerRowIndex] as string[]

  const headers = headerRow
    .map(cell => String(cell || '').trim())
    .filter(h => h.length > 0)

  // Determine expected panels for this sheet
  const sheetUpper = sheetName.toUpperCase()
  let expectedPanels: PanelType[] = []

  for (const [sheetKey, panels] of Object.entries(SHEET_TO_PANELS)) {
    if (sheetUpper.includes(sheetKey) || sheetKey.includes(sheetUpper)) {
      expectedPanels = panels
      break
    }
  }

  // If no match found, try partial matching
  if (expectedPanels.length === 0) {
    if (sheetUpper.includes('SIMULATION')) {
      expectedPanels = SHEET_TO_PANELS['SIMULATION']
    } else if (sheetUpper.includes('MRS') || sheetUpper.includes('OLP')) {
      expectedPanels = SHEET_TO_PANELS['MRS_OLP']
    } else if (sheetUpper.includes('DOC')) {
      expectedPanels = SHEET_TO_PANELS['DOCUMENTATION']
    } else if (sheetUpper.includes('SAFETY') || sheetUpper.includes('LAYOUT')) {
      expectedPanels = SHEET_TO_PANELS['SAFETY_LAYOUT']
    }
  }

  // Analyze milestone matches
  const milestoneMatches: SheetAnalysis['milestoneMatches'] = []
  const allMatchedHeaders = new Set<string>()

  for (const panelType of expectedPanels) {
    const milestones = PANEL_TO_MILESTONES[panelType]
    const definedMilestones = Object.values(milestones)
    const matched: { defined: string; found: string }[] = []
    const unmatched: string[] = []

    for (const defined of definedMilestones) {
      const normalizedDefined = normalizeHeader(defined)

      // Find matching header - use strict matching
      const foundHeader = headers.find(h => headersMatch(h, defined))

      if (foundHeader) {
        matched.push({ defined, found: foundHeader })
        allMatchedHeaders.add(foundHeader)
      } else {
        unmatched.push(defined)
      }
    }

    milestoneMatches.push({
      panel: panelType,
      definedMilestones,
      matchedMilestones: matched,
      unmatchedDefined: unmatched,
    })
  }

  // Find headers that didn't match any milestone (excluding core fields)
  const unmatchedHeaders = headers.filter(h => {
    if (allMatchedHeaders.has(h)) return false
    const normalized = normalizeHeader(h)
    return !CORE_FIELDS.some(cf => normalized.includes(cf.toUpperCase()))
  })

  return {
    sheetName,
    rowCount: range.e.r + 1,
    columnCount: range.e.c + 1,
    headerRowIndex,
    headers,
    expectedPanels,
    milestoneMatches,
    unmatchedHeaders,
  }
}

function printAnalysis(analysis: SheetAnalysis): void {
  console.log('\n' + '='.repeat(80))
  console.log(`SHEET: ${analysis.sheetName}`)
  console.log('='.repeat(80))
  console.log(`Rows: ${analysis.rowCount}, Columns: ${analysis.columnCount}`)
  console.log(`Header Row Index: ${analysis.headerRowIndex}`)
  console.log(`Expected Panels: ${analysis.expectedPanels.map(p => PANEL_TYPE_TO_DISPLAY[p]).join(', ') || 'None'}`)

  console.log('\n--- All Headers ---')
  analysis.headers.forEach((h, i) => {
    console.log(`  [${i}] ${h}`)
  })

  for (const match of analysis.milestoneMatches) {
    console.log(`\n--- Panel: ${PANEL_TYPE_TO_DISPLAY[match.panel]} ---`)
    console.log(`  Defined: ${match.definedMilestones.length}, Matched: ${match.matchedMilestones.length}, Unmatched: ${match.unmatchedDefined.length}`)

    if (match.matchedMilestones.length > 0) {
      console.log('  Matched:')
      match.matchedMilestones.forEach(m => {
        if (m.defined === m.found) {
          console.log(`    ✓ "${m.defined}"`)
        } else {
          console.log(`    ~ "${m.defined}" → "${m.found}"`)
        }
      })
    }

    if (match.unmatchedDefined.length > 0) {
      console.log('  NOT FOUND in Excel:')
      match.unmatchedDefined.forEach(u => {
        console.log(`    ✗ "${u}"`)
      })
    }
  }

  if (analysis.unmatchedHeaders.length > 0) {
    console.log('\n--- Unmatched Headers (potential new milestones) ---')
    analysis.unmatchedHeaders.forEach(h => {
      console.log(`  ? "${h}"`)
    })
  }
}

function generateReport(analyses: SheetAnalysis[]): void {
  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY REPORT')
  console.log('='.repeat(80))

  let totalDefined = 0
  let totalMatched = 0
  let totalUnmatched = 0
  const allUnmatchedDefined: { panel: string; milestone: string }[] = []
  const allUnmatchedHeaders: string[] = []

  for (const analysis of analyses) {
    for (const match of analysis.milestoneMatches) {
      totalDefined += match.definedMilestones.length
      totalMatched += match.matchedMilestones.length
      totalUnmatched += match.unmatchedDefined.length

      match.unmatchedDefined.forEach(u => {
        allUnmatchedDefined.push({ panel: PANEL_TYPE_TO_DISPLAY[match.panel], milestone: u })
      })
    }
    allUnmatchedHeaders.push(...analysis.unmatchedHeaders)
  }

  console.log(`\nTotal Milestones Defined: ${totalDefined}`)
  console.log(`Total Matched: ${totalMatched} (${Math.round(totalMatched / totalDefined * 100)}%)`)
  console.log(`Total Unmatched: ${totalUnmatched}`)

  if (allUnmatchedDefined.length > 0) {
    console.log('\n--- All Unmatched Defined Milestones ---')
    console.log('(These are defined in code but NOT found in Excel)')
    allUnmatchedDefined.forEach(u => {
      console.log(`  [${u.panel}] "${u.milestone}"`)
    })
  }

  if (allUnmatchedHeaders.length > 0) {
    console.log('\n--- All Unmatched Excel Headers ---')
    console.log('(These are in Excel but NOT defined in code)')
    const unique = [...new Set(allUnmatchedHeaders)]
    unique.forEach(h => {
      console.log(`  "${h}"`)
    })
  }
}

// Main execution
async function main(): Promise<void> {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Usage: npx tsx tools/dev/analyzeSimulationStatusColumns.ts "path/to/file.xlsx"')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`Analyzing: ${path.basename(filePath)}`)
  console.log(`Full path: ${filePath}`)

  const workbook = XLSX.readFile(filePath)
  console.log(`\nSheets found: ${workbook.SheetNames.join(', ')}`)

  const analyses: SheetAnalysis[] = []

  for (const sheetName of workbook.SheetNames) {
    const analysis = analyzeSheet(workbook, sheetName)
    if (analysis) {
      analyses.push(analysis)
      printAnalysis(analysis)
    }
  }

  generateReport(analyses)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
