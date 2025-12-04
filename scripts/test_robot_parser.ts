import { readFileSync } from 'fs'
import { read } from 'xlsx'
import { parseRobotList } from '../src/ingestion/robotListParser'

const filePath = String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`

console.log('🧪 Testing robot list parser...\n')

try {
  const workbook = read(readFileSync(filePath), { type: 'buffer' })
  const result = await parseRobotList(workbook, 'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx')
  
  console.log(`✅ Parsed successfully!`)
  console.log(`\n📊 Results:`)
  console.log(`   Robots found: ${result.robots.length}`)
  console.log(`   Warnings: ${result.warnings.length}`)
  
  if (result.robots.length > 0) {
    console.log(`\n🤖 Sample robots (first 5):`)
    result.robots.slice(0, 5).forEach((r, i) => {
      console.log(`\n   ${i + 1}. ${r.name}`)
      console.log(`      ID: ${r.id}`)
      console.log(`      Area: ${r.areaName || 'N/A'}`)
      console.log(`      Line: ${r.lineCode || 'N/A'}`)
      console.log(`      Station: ${r.stationCode || 'N/A'}`)
      console.log(`      Model: ${r.oemModel || 'N/A'}`)
      if (Object.keys(r.metadata || {}).length > 0) {
        console.log(`      Metadata keys: ${Object.keys(r.metadata || {}).slice(0, 5).join(', ')}`)
      }
    })
  }
  
  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (first 10):`)
    result.warnings.slice(0, 10).forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.message}`)
    })
    if (result.warnings.length > 10) {
      console.log(`   ... and ${result.warnings.length - 10} more`)
    }
  }
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}



