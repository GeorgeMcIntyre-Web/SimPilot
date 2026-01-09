/**
 * Test Robot Equipment List Ingestion
 */

import { ingestRobotEquipmentList } from '../../src/ingestion/robotEquipmentList/ingestRobotEquipmentList.js'

const filePath = "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Ford_OHAP_V801N_Robot_Equipment_List.xlsx"

console.log('Starting Robot Equipment List ingestion test...\n')

try {
  const result = ingestRobotEquipmentList(filePath, { verbose: true })

  console.log(`\n✓ Ingestion Complete`)
  console.log(`  Total Robots: ${result.stats.entitiesProduced}`)
  console.log(`  Removed (Struck-through): ${result.validationReport.removedRobotCount}`)
  console.log(`  Active Robots: ${result.stats.entitiesProduced - result.validationReport.removedRobotCount}`)
  console.log(`  Skipped Rows: ${result.stats.skippedRows}`)
  console.log(`  Errors: ${result.stats.errors}`)

  // Sample entities
  if (result.entities.length > 0) {
    console.log(`\n  Sample Robots:`)
    for (const entity of result.entities.slice(0, 10)) {
      console.log(`    - ${entity.robotId} (${entity.station})`)
      console.log(`      Type: ${entity.robotType}, App: ${entity.application}`)
      console.log(`      Serial: ${entity.serialNumber || 'N/A'}, Status: ${entity.installStatus || 'N/A'}`)
      if (entity.weldguns) {
        console.log(`      Weldguns: ${entity.weldguns.numberOfGuns} guns`)
      }
      if (entity.track) {
        console.log(`      Track: ${entity.track.length}mm`)
      }
      console.log()
    }
  }

  // Group by area
  const byArea = new Map<string, number>()
  for (const entity of result.entities) {
    byArea.set(entity.area, (byArea.get(entity.area) || 0) + 1)
  }

  console.log(`  Robots by Area:`)
  for (const [area, count] of Array.from(byArea.entries()).sort()) {
    console.log(`    ${area}: ${count}`)
  }

} catch (error) {
  console.error(`\n✗ Ingestion Failed:`, (error as Error).message)
  console.error((error as Error).stack)
  process.exit(1)
}
