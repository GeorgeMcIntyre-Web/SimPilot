/**
 * Test Simulation Status Parser
 *
 * Validates the parser against the V801 DASH 9B sample file
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import {
  normalizeSimulationStatusRows,
  simulationRowToEntity,
  validateSimulationStatusEntities,
  linkSimulationToTooling
} from '../../src/ingestion/simulationStatus/simulationStatusParser'
import { SimulationStatusValidationAnomaly } from '../../src/ingestion/simulationStatus/simulationStatusTypes'

async function main() {
  const filePath = process.argv[2] || "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Simulation_Status\\FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx"

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  SIMULATION STATUS PARSER TEST')
  console.log('═══════════════════════════════════════════════════════════════\n')
  console.log(`File: ${filePath}\n`)

  // Read Excel file
  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: false })

  const simSheet = workbook.Sheets['SIMULATION']
  if (!simSheet) {
    console.log('❌ No SIMULATION sheet found!')
    return
  }

  // Find header row
  const rawData: any[] = XLSX.utils.sheet_to_json(simSheet, { header: 1, defval: '' })
  let headerRowIndex = -1

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i] as any[]
    const rowStr = row.join('|').toLowerCase()
    if (rowStr.includes('station') && rowStr.includes('robot')) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    console.log('❌ Could not find header row!')
    return
  }

  console.log(`✅ Header row found at index: ${headerRowIndex}`)

  // Parse rows with headers
  const dataWithHeaders = XLSX.utils.sheet_to_json(simSheet, { range: headerRowIndex })

  console.log(`✅ Total rows read: ${dataWithHeaders.length}`)

  // Normalize rows
  const normalized = normalizeSimulationStatusRows(
    dataWithHeaders,
    filePath,
    headerRowIndex + 1
  )

  console.log(`✅ Normalized rows: ${normalized.length}`)

  // Convert to entities
  const anomalies: SimulationStatusValidationAnomaly[] = []
  const entities = normalized
    .map(row => simulationRowToEntity(row, 'SIMULATION', anomalies))
    .filter((e): e is NonNullable<typeof e> => e !== null)

  console.log(`✅ Entities produced: ${entities.length}`)

  // Validate
  const report = validateSimulationStatusEntities(entities, dataWithHeaders.length, anomalies)

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  VALIDATION REPORT')
  console.log('═══════════════════════════════════════════════════════════════\n')

  console.log(`Total rows read:            ${report.totalRowsRead}`)
  console.log(`Total entities produced:    ${report.totalEntitiesProduced}`)
  console.log(`Missing station count:      ${report.missingStationCount}`)
  console.log(`Missing robot count:        ${report.missingRobotCount}`)
  console.log(`Invalid format count:       ${report.invalidFormatCount}`)
  console.log(`Duplicate robot count:      ${report.duplicateRobotCount}`)
  console.log(`Total anomalies:            ${report.anomalies.length}`)

  if (report.anomalies.length > 0) {
    console.log('\nAnomalies:')
    report.anomalies.forEach(a => {
      console.log(`  [${a.type}] Row ${a.row}: ${a.message}`)
    })
  }

  // Show sample entities
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  SAMPLE ENTITIES (First 3)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  entities.slice(0, 3).forEach((entity, idx) => {
    console.log(`Entity ${idx + 1}:`)
    console.log(`  Canonical Key:       ${entity.canonicalKey}`)
    console.log(`  Robot:               ${entity.robotFullId}`)
    console.log(`  Station:             ${entity.stationFull}`)
    console.log(`  Application:         ${entity.application}`)
    console.log(`  Overall Completion:  ${entity.overallCompletion}%`)
    console.log(`  Responsible Person:  ${entity.responsiblePerson || '(none)'}`)
    console.log(`  Linked Tooling:      ${entity.linkedToolingEntityKeys.length} entities`)

    // Show non-null milestones
    const nonNullMilestones = Object.entries(entity.milestones)
      .filter(([_, value]) => value !== null)
      .slice(0, 5)

    if (nonNullMilestones.length > 0) {
      console.log(`  Sample Milestones (first 5 non-null):`)
      nonNullMilestones.forEach(([key, value]) => {
        console.log(`    ${key}: ${value}%`)
      })
    }
    console.log()
  })

  // Summary by station
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  ROBOTS BY STATION')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const robotsByStation = new Map<string, typeof entities>()
  entities.forEach(entity => {
    const key = entity.stationFull
    if (!robotsByStation.has(key)) {
      robotsByStation.set(key, [])
    }
    robotsByStation.get(key)!.push(entity)
  })

  Array.from(robotsByStation.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([station, robots]) => {
      console.log(`${station}: ${robots.length} robot(s)`)
      robots.forEach(r => {
        console.log(`  - ${r.robotFullId} (${r.application}) - ${r.overallCompletion}% complete`)
      })
      console.log()
    })

  // Summary by application type
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  ROBOTS BY APPLICATION TYPE')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const robotsByApp = new Map<string, number>()
  entities.forEach(entity => {
    const count = robotsByApp.get(entity.application) || 0
    robotsByApp.set(entity.application, count + 1)
  })

  Array.from(robotsByApp.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([app, count]) => {
      console.log(`${app}: ${count} robot(s)`)
    })

  console.log('\n═══════════════════════════════════════════════════════════════\n')

  // Test station matching
  console.log('Testing station matching logic...\n')

  // Mock tool entities
  const mockToolEntities = [
    { canonicalKey: 'FORD|TOOL1', areaName: '9B', stationGroup: '100' },
    { canonicalKey: 'FORD|TOOL2', areaName: '9B', stationGroup: '110-120' },
    { canonicalKey: 'FORD|TOOL3', areaName: '9B', stationGroup: '130' },
    { canonicalKey: 'FORD|TOOL4', areaName: '7F', stationGroup: '100' },
  ]

  linkSimulationToTooling(entities, mockToolEntities)

  console.log('Sample linking results:')
  entities.slice(0, 3).forEach(entity => {
    console.log(`  ${entity.robotFullId} at station ${entity.stationFull}:`)
    console.log(`    Linked to ${entity.linkedToolingEntityKeys.length} tool(s): ${entity.linkedToolingEntityKeys.join(', ')}`)
  })

  console.log('\n✅ Test complete!')
}

main().catch(console.error)
