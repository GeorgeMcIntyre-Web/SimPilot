/**
 * Test Script: Full Milestone Ingestion Test
 *
 * This script tests the complete ingestion pipeline to verify
 * milestone data is correctly populated in SimulationStatusEntity.
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import { ingestSimulationStatusFile } from '../../src/ingestion/simulationStatus/simulationStatusIngestion'

// Path to test Excel file
const EXCEL_PATH = 'C:\\Users\\edwin.msakwa\\Desktop\\SIM-PILOT-TEST-DATA\\FORD\\P708_Docs\\Simulation\\FORD_P708_Underbody_8X-010-to-8Y-160_Simulation_Status.xlsx'

async function main() {
  console.log('='.repeat(80))
  console.log('FULL MILESTONE INGESTION TEST')
  console.log('='.repeat(80))
  console.log(`\nExcel File: ${EXCEL_PATH}\n`)

  // Read the Excel file
  const buffer = fs.readFileSync(EXCEL_PATH)
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  console.log('Available sheets:', workbook.SheetNames.join(', '))
  console.log('')

  // Run ingestion
  try {
    const result = await ingestSimulationStatusFile(workbook, 'test-file.xlsx', 'SIMULATION')

    console.log('='.repeat(80))
    console.log('INGESTION RESULT')
    console.log('='.repeat(80))

    console.log(`\nTotal entities created: ${result.entities.length}`)
    console.log(`Document area: ${result.documentAreaName}`)
    console.log(`Sheet name: ${result.sheetName}`)

    // Show validation report
    console.log('\nValidation Report:')
    console.log(`  - Rows read: ${result.report.totalRowsRead}`)
    console.log(`  - Entities produced: ${result.report.totalEntitiesProduced}`)
    console.log(`  - Missing station: ${result.report.missingStationCount}`)
    console.log(`  - Missing robot: ${result.report.missingRobotCount}`)
    console.log(`  - Invalid format: ${result.report.invalidFormatCount}`)
    console.log(`  - Duplicates: ${result.report.duplicateRobotCount}`)

    if (result.report.anomalies.length > 0) {
      console.log(`\nAnomalies (${result.report.anomalies.length}):`)
      result.report.anomalies.slice(0, 5).forEach(a => {
        console.log(`  - Row ${a.row}: ${a.type} - ${a.message}`)
      })
      if (result.report.anomalies.length > 5) {
        console.log(`  ... and ${result.report.anomalies.length - 5} more`)
      }
    }

    // Show first few entities with their milestones
    console.log('')
    console.log('='.repeat(80))
    console.log('SAMPLE ENTITIES WITH MILESTONES')
    console.log('='.repeat(80))

    result.entities.slice(0, 3).forEach((entity, idx) => {
      console.log(`\n--- Entity ${idx + 1}: ${entity.robotFullId} ---`)
      console.log(`  Station: ${entity.stationFull}`)
      console.log(`  Application: ${entity.application}`)
      console.log(`  Overall Completion: ${entity.overallCompletion}%`)

      // Show milestones
      const milestones = entity.milestones
      const nonNullMilestones = Object.entries(milestones)
        .filter(([_, v]) => v !== null)

      console.log(`  Milestones (${nonNullMilestones.length} non-null):`)
      nonNullMilestones.forEach(([key, value]) => {
        console.log(`    - ${key}: ${value}`)
      })

      // Check for panelMilestones
      if (entity.panelMilestones) {
        console.log(`  Panel Milestones: Present`)
        Object.entries(entity.panelMilestones).forEach(([panel, data]) => {
          const milestoneCount = Object.keys(data.milestones).length
          console.log(`    - ${panel}: ${milestoneCount} milestones, ${data.completion}% completion`)

          // Show Robot Simulation panel details for first entity
          if (panel === 'robotSimulation' && idx === 0) {
            console.log(`      Robot Simulation Details:`)
            Object.entries(data.milestones).forEach(([name, value]) => {
              console.log(`        ${name}: ${value}`)
            })
          }
        })
      } else {
        console.log(`  Panel Milestones: NOT POPULATED (undefined)`)
      }
    })

    // Summary statistics
    console.log('')
    console.log('='.repeat(80))
    console.log('MILESTONE STATISTICS')
    console.log('='.repeat(80))

    let totalWithMilestones = 0
    let totalWithAllNull = 0

    result.entities.forEach(entity => {
      const milestones = entity.milestones
      const nonNullCount = Object.values(milestones).filter(v => v !== null).length
      if (nonNullCount > 0) {
        totalWithMilestones++
      } else {
        totalWithAllNull++
      }
    })

    console.log(`\nEntities with milestone data: ${totalWithMilestones}`)
    console.log(`Entities with all null milestones: ${totalWithAllNull}`)

    // Check completion distribution
    const completionBuckets = { '0': 0, '1-25': 0, '26-50': 0, '51-75': 0, '76-99': 0, '100': 0 }
    result.entities.forEach(entity => {
      const c = entity.overallCompletion
      if (c === 0) completionBuckets['0']++
      else if (c <= 25) completionBuckets['1-25']++
      else if (c <= 50) completionBuckets['26-50']++
      else if (c <= 75) completionBuckets['51-75']++
      else if (c < 100) completionBuckets['76-99']++
      else completionBuckets['100']++
    })

    console.log('\nCompletion Distribution:')
    Object.entries(completionBuckets).forEach(([bucket, count]) => {
      console.log(`  ${bucket}%: ${count} entities`)
    })

  } catch (error) {
    console.error('Ingestion failed:', error)
  }
}

main()
