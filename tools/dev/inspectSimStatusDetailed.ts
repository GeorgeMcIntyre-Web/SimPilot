/**
 * Detailed inspection of Simulation Status SIMULATION sheet
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'

async function main() {
  const filePath = process.argv[2] || "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Simulation_Status\\FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx"

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  SIMULATION SHEET DETAILED ANALYSIS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: false })

  const simSheet = workbook.Sheets['SIMULATION']
  if (!simSheet) {
    console.log('No SIMULATION sheet found!')
    return
  }

  // Get raw data
  const rawData: any[] = XLSX.utils.sheet_to_json(simSheet, { header: 1, defval: '' })

  console.log(`Total rows: ${rawData.length}`)

  // Find header row (look for row with "STATION", "ROBOT", etc.)
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i] as any[]
    const rowStr = row.join('|').toLowerCase()
    if (rowStr.includes('station') && rowStr.includes('robot')) {
      headerRowIndex = i
      break
    }
  }

  console.log(`\nHeader row found at index: ${headerRowIndex}`)

  if (headerRowIndex === -1) {
    console.log('Could not find header row!')
    return
  }

  const headers = rawData[headerRowIndex] as string[]
  console.log(`\nTotal columns: ${headers.length}`)
  console.log(`\nAll column headers:`)
  headers.forEach((h, idx) => {
    if (h) console.log(`  [${idx}] ${h}`)
  })

  // Parse data with headers
  const dataWithHeaders = XLSX.utils.sheet_to_json(simSheet, { range: headerRowIndex })

  console.log(`\n\nData rows (after header): ${dataWithHeaders.length}`)

  if (dataWithHeaders.length > 0) {
    console.log(`\nFirst 5 data rows (key columns only):`)
    dataWithHeaders.slice(0, 5).forEach((row: any, idx) => {
      console.log(`\nRow ${idx + 1}:`)
      console.log(`  PERS. RESPONSIBLE: ${row['PERS. RESPONSIBLE'] || ''}`)
      console.log(`  STATION: ${row['STATION'] || ''}`)
      console.log(`  ROBOT: ${row['ROBOT'] || ''}`)
      console.log(`  APPLICATION: ${row['APPLICATION'] || ''}`)

      // Show first status column
      const statusCols = Object.keys(row).filter(k => !['PERS. RESPONSIBLE', 'STATION', 'ROBOT', 'APPLICATION'].includes(k))
      if (statusCols.length > 0) {
        console.log(`  First status field (${statusCols[0]}): ${row[statusCols[0]] || 'empty'}`)
      }
    })
  }

  // Analyze unique values
  console.log(`\n═══════════════════════════════════════════════════════════════`)
  console.log('  UNIQUE VALUE ANALYSIS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const stations = new Set<string>()
  const robots = new Set<string>()
  const applications = new Set<string>()

  dataWithHeaders.forEach((row: any) => {
    if (row['STATION']) stations.add(String(row['STATION']))
    if (row['ROBOT']) robots.add(String(row['ROBOT']))
    if (row['APPLICATION']) applications.add(String(row['APPLICATION']))
  })

  console.log(`Unique stations: ${stations.size}`)
  console.log(`  ${Array.from(stations).sort().join(', ')}`)
  console.log()
  console.log(`Unique robots: ${robots.size}`)
  console.log(`  ${Array.from(robots).sort().join(', ')}`)
  console.log()
  console.log(`Unique applications: ${applications.size}`)
  console.log(`  ${Array.from(applications).sort().join(', ')}`)

  console.log('\n═══════════════════════════════════════════════════════════════\n')
}

main().catch(console.error)
