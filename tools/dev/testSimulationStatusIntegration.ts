/**
 * Test Simulation Status Integration
 *
 * End-to-end test of simulation status ingestion, store, and linking
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import {
  ingestSimulationStatusFile,
  getIngestionSummary,
  linkSimulationStatusToTools,
  simulationStatusStore
} from '../../src/ingestion/simulationStatus'

async function main() {
  const filePath = process.argv[2] || "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Simulation_Status\\FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx"

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  SIMULATION STATUS INTEGRATION TEST')
  console.log('═══════════════════════════════════════════════════════════════\n')
  console.log(`File: ${filePath}\n`)

  // Read and ingest file
  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true })

  console.log('Step 1: Ingesting simulation status file...')
  const result = await ingestSimulationStatusFile(workbook, filePath, 'SIMULATION')

  console.log('✅ Ingestion complete\n')

  // Display summary
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  INGESTION SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const summary = getIngestionSummary(result)
  console.log(summary)

  // Add to store
  console.log('\n\nStep 2: Adding entities to store...')
  simulationStatusStore.setEntities(result.entities)

  const storeState = simulationStatusStore.getState()
  console.log(`✅ Store updated`)
  console.log(`   - Total entities: ${storeState.entities.length}`)
  console.log(`   - Source files: ${storeState.sourceFiles.length}`)
  console.log(`   - Last updated: ${storeState.lastUpdated}`)

  // Test linking with mock tool entities
  console.log('\n\nStep 3: Testing station-level linking...')

  const mockToolEntities = [
    { canonicalKey: 'FORD|016ZF-1001-100-', areaName: '9B', stationGroup: '100' },
    { canonicalKey: 'FORD|016ZF-1101-110-', areaName: '9B', stationGroup: '110' },
    { canonicalKey: 'FORD|016ZF-1151-115-', areaName: '9B', stationGroup: '110-120' },
    { canonicalKey: 'FORD|016ZF-1301-130-', areaName: '9B', stationGroup: '130' },
    { canonicalKey: 'FORD|016ZF-1401-140-', areaName: '9B', stationGroup: '140' },
    { canonicalKey: 'FORD|016ZF-1501-150-', areaName: '9B', stationGroup: '150' },
  ]

  linkSimulationStatusToTools(mockToolEntities)
  console.log('✅ Linking complete')

  const linkedState = simulationStatusStore.getState()
  const linkedCount = linkedState.entities.filter(e => e.linkedToolingEntityKeys.length > 0).length
  console.log(`   - ${linkedCount} robots linked to tooling`)

  // Display sample linked entities
  console.log('\n\n═══════════════════════════════════════════════════════════════')
  console.log('  SAMPLE LINKED ENTITIES')
  console.log('═══════════════════════════════════════════════════════════════\n')

  linkedState.entities.slice(0, 5).forEach(entity => {
    console.log(`${entity.robotFullId} (${entity.application}):`)
    console.log(`  Station: ${entity.stationFull}`)
    console.log(`  Completion: ${entity.overallCompletion}%`)
    console.log(`  Linked tooling: ${entity.linkedToolingEntityKeys.length} tool(s)`)
    if (entity.linkedToolingEntityKeys.length > 0) {
      console.log(`    ${entity.linkedToolingEntityKeys.join(', ')}`)
    }
    console.log()
  })

  // Test grouping functions
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  GROUPING TESTS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Group by station
  const byStation = new Map<string, typeof result.entities>()
  result.entities.forEach(e => {
    const key = `${e.area}|${e.station}`
    const list = byStation.get(key) ?? []
    list.push(e)
    byStation.set(key, list)
  })

  console.log('Robots by station:')
  Array.from(byStation.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, robots]) => {
      console.log(`  ${key}: ${robots.length} robot(s)`)
    })

  // Group by application
  const byApp = new Map<string, number>()
  result.entities.forEach(e => {
    const count = byApp.get(e.application) || 0
    byApp.set(e.application, count + 1)
  })

  console.log('\nRobots by application:')
  Array.from(byApp.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([app, count]) => {
      console.log(`  ${app}: ${count} robot(s)`)
    })

  // Completion statistics
  console.log('\n\n═══════════════════════════════════════════════════════════════')
  console.log('  COMPLETION STATISTICS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const completed = result.entities.filter(e => e.overallCompletion === 100)
  const inProgress = result.entities.filter(e => e.overallCompletion > 0 && e.overallCompletion < 100)
  const notStarted = result.entities.filter(e => e.overallCompletion === 0)

  console.log(`Completed (100%):     ${completed.length} robot(s)`)
  console.log(`In Progress (1-99%):  ${inProgress.length} robot(s)`)
  console.log(`Not Started (0%):     ${notStarted.length} robot(s)`)

  const totalCompletion = result.entities.reduce((sum, e) => sum + e.overallCompletion, 0)
  const avgCompletion = result.entities.length > 0 ? Math.round(totalCompletion / result.entities.length) : 0
  console.log(`\nAverage completion:   ${avgCompletion}%`)

  // Validation report
  console.log('\n\n═══════════════════════════════════════════════════════════════')
  console.log('  VALIDATION REPORT')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const report = result.report
  console.log(`Total rows read:           ${report.totalRowsRead}`)
  console.log(`Total entities produced:   ${report.totalEntitiesProduced}`)
  console.log(`Duplicate robots:          ${report.duplicateRobotCount}`)
  console.log(`Invalid format:            ${report.invalidFormatCount}`)
  console.log(`Missing station:           ${report.missingStationCount}`)
  console.log(`Missing robot:             ${report.missingRobotCount}`)
  console.log(`Total anomalies:           ${report.anomalies.length}`)

  if (report.anomalies.length > 0) {
    console.log('\nAnomalies:')
    report.anomalies.forEach(a => {
      console.log(`  [${a.type}] Row ${a.row}: ${a.message}`)
    })
  }

  console.log('\n\n✅ Integration test complete!')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Clear store
  simulationStatusStore.clear()
  console.log('✅ Store cleared')
}

main().catch(console.error)
