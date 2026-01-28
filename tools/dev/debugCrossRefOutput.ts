/**
 * Debug CrossRef Output
 *
 * This script simulates the full ingestion and CrossRef flow to see what
 * data ends up in the CellSnapshot objects.
 *
 * Usage:
 *   npx tsx tools/dev/debugCrossRefOutput.ts "path/to/SimulationStatus.xlsx"
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

import { parseSimulationStatus, convertVacuumRowsToPanelMilestones, VacuumParsedRow } from '../../src/ingestion/simulationStatusParser'
import { buildCrossRef } from '../../src/domain/crossRef/CrossRefEngine'
import { CrossRefInput, SimulationStatusSnapshot } from '../../src/domain/crossRef/CrossRefTypes'

async function main(): Promise<void> {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Usage: npx tsx tools/dev/debugCrossRefOutput.ts "path/to/file.xlsx"')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const fileName = path.basename(filePath)
  console.log('=' .repeat(80))
  console.log('DEBUG: CrossRef Output Analysis')
  console.log('=' .repeat(80))
  console.log(`File: ${fileName}`)

  const workbook = XLSX.readFile(filePath)

  // STEP 1: Parse simulation status (this gives us cells and vacuum rows)
  console.log('\n--- STEP 1: Parse Simulation Status ---')
  const parseResult = await parseSimulationStatus(workbook, fileName)

  console.log(`Cells: ${parseResult.cells.length}`)
  console.log(`Vacuum rows: ${parseResult.vacuumRows?.length ?? 0}`)

  // STEP 2: Build panel milestones map
  console.log('\n--- STEP 2: Build Panel Milestones Map ---')
  const vacuumRows = parseResult.vacuumRows ?? []
  const panelMilestonesMap = convertVacuumRowsToPanelMilestones(vacuumRows)
  console.log(`Panel milestones map size: ${panelMilestonesMap.size}`)

  // STEP 3: Build SimulationStatusSnapshot array (simulating buildCrossRefInputFromApplyResult)
  console.log('\n--- STEP 3: Build SimulationStatusSnapshot Array ---')

  const simulationStatusRows: SimulationStatusSnapshot[] = parseResult.cells.map(cell => {
    const panelMilestones = panelMilestonesMap.get(cell.code) || undefined

    return {
      stationKey: cell.code,
      areaKey: cell.areaId,
      lineCode: cell.lineCode,
      application: cell.simulation?.application,
      hasIssues: cell.simulation?.hasIssues,
      firstStageCompletion: cell.simulation?.percentComplete,
      finalDeliverablesCompletion: cell.simulation?.percentComplete,
      dcsConfigured: undefined,
      engineer: cell.assignedEngineer,
      panelMilestones,
      raw: cell
    }
  })

  const rowsWithPanelMilestones = simulationStatusRows.filter(r => r.panelMilestones !== undefined)
  console.log(`SimulationStatusSnapshot rows: ${simulationStatusRows.length}`)
  console.log(`Rows WITH panelMilestones: ${rowsWithPanelMilestones.length}`)
  console.log(`Rows WITHOUT panelMilestones: ${simulationStatusRows.length - rowsWithPanelMilestones.length}`)

  if (rowsWithPanelMilestones.length > 0) {
    console.log('\nSample row with panelMilestones:')
    const sample = rowsWithPanelMilestones[0]
    console.log(`  stationKey: "${sample.stationKey}"`)
    console.log(`  panelMilestones.robotSimulation.completion: ${sample.panelMilestones?.robotSimulation.completion}%`)
    console.log(`  panelMilestones.spotWelding.completion: ${sample.panelMilestones?.spotWelding.completion}%`)
  }

  // STEP 4: Build CrossRef input
  console.log('\n--- STEP 4: Build CrossRef Result ---')

  const crossRefInput: CrossRefInput = {
    simulationStatusRows,
    toolingRows: [],
    robotSpecsRows: [],
    weldGunRows: [],
    gunForceRows: [],
    riserRows: []
  }

  const crossRefResult = buildCrossRef(crossRefInput)

  console.log(`CrossRef cells: ${crossRefResult.cells.length}`)

  // STEP 5: Check if panelMilestones made it to the final CellSnapshot
  console.log('\n--- STEP 5: Check CellSnapshot.simulationStatus.panelMilestones ---')

  const cellsWithSimStatus = crossRefResult.cells.filter(c => c.simulationStatus !== undefined)
  const cellsWithPanelMilestones = crossRefResult.cells.filter(c => c.simulationStatus?.panelMilestones !== undefined)

  console.log(`Cells with simulationStatus: ${cellsWithSimStatus.length}`)
  console.log(`Cells with panelMilestones: ${cellsWithPanelMilestones.length}`)
  console.log(`Cells WITHOUT panelMilestones: ${cellsWithSimStatus.length - cellsWithPanelMilestones.length}`)

  if (cellsWithPanelMilestones.length > 0) {
    console.log('\nSample CellSnapshot with panelMilestones:')
    const sample = cellsWithPanelMilestones[0]
    console.log(`  stationKey: "${sample.stationKey}"`)
    console.log(`  displayCode: "${sample.displayCode}"`)
    console.log(`  simulationStatus.stationKey: "${sample.simulationStatus?.stationKey}"`)
    console.log(`  panelMilestones.robotSimulation.completion: ${sample.simulationStatus?.panelMilestones?.robotSimulation.completion}%`)
    console.log(`  panelMilestones.spotWelding.completion: ${sample.simulationStatus?.panelMilestones?.spotWelding.completion}%`)
  } else {
    console.log('\n⚠️  NO CELLS HAVE panelMilestones!')
    console.log('\nDebugging first few cells:')
    crossRefResult.cells.slice(0, 5).forEach(cell => {
      console.log(`  Cell stationKey: "${cell.stationKey}"`)
      console.log(`    simulationStatus: ${cell.simulationStatus ? 'present' : 'MISSING'}`)
      if (cell.simulationStatus) {
        console.log(`    simulationStatus.stationKey: "${cell.simulationStatus.stationKey}"`)
        console.log(`    simulationStatus.panelMilestones: ${cell.simulationStatus.panelMilestones ? 'present' : 'MISSING'}`)
      }
    })
  }

  console.log('\n' + '=' .repeat(80))
  console.log('DEBUG COMPLETE')
  console.log('=' .repeat(80))
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
