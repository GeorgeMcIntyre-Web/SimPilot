/**
 * Inspect actual values in Simulation Status milestone columns
 */
import * as XLSX from 'xlsx'
import * as fs from 'fs'

async function main() {
  const filePath = process.argv[2] || "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Simulation_Status\\FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx"

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  SIMULATION STATUS VALUE ANALYSIS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: false })

  const simSheet = workbook.Sheets['SIMULATION']
  if (!simSheet) {
    console.log('No SIMULATION sheet found!')
    return
  }

  // Get raw data with headers
  const rawData: any[] = XLSX.utils.sheet_to_json(simSheet, { header: 1, defval: '' })

  // Find header row
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
    console.log('Could not find header row!')
    return
  }

  const headers = rawData[headerRowIndex] as string[]
  const dataWithHeaders = XLSX.utils.sheet_to_json(simSheet, { range: headerRowIndex })

  console.log(`Total data rows: ${dataWithHeaders.length}`)

  // Get all milestone columns (exclude identity columns)
  const identityCols = ['PERS. RESPONSIBLE', 'STATION', 'ROBOT', 'APPLICATION']
  const milestoneCols = headers.filter(h => h && !identityCols.includes(h))

  console.log(`\nTotal milestone columns: ${milestoneCols.length}`)

  // Sample first actual data row (skip designation row)
  const firstDataRow = dataWithHeaders.find((row: any) => row['STATION'] && row['STATION'] !== '')

  if (firstDataRow) {
    console.log(`\n\nSample Robot: ${firstDataRow['ROBOT']} at Station ${firstDataRow['STATION']}`)
    console.log(`Application: ${firstDataRow['APPLICATION']}`)
    console.log(`\nFirst 10 Milestone Values:`)

    milestoneCols.slice(0, 10).forEach((col, idx) => {
      const value = firstDataRow[col]
      const valueType = typeof value
      const valueStr = value === undefined ? '<undefined>' :
                       value === null ? '<null>' :
                       value === '' ? '<empty string>' :
                       JSON.stringify(value)
      console.log(`  [${idx + 1}] ${col}`)
      console.log(`      Value: ${valueStr} (${valueType})`)
    })
  }

  // Analyze unique values in first few milestone columns
  console.log(`\n\n═══════════════════════════════════════════════════════════════`)
  console.log('  UNIQUE VALUES IN MILESTONE COLUMNS (First 5)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const dataRows = dataWithHeaders.filter((row: any) => row['STATION'] && row['STATION'] !== '')

  milestoneCols.slice(0, 5).forEach((col, idx) => {
    const uniqueValues = new Set<string>()
    dataRows.forEach((row: any) => {
      const val = row[col]
      if (val !== undefined && val !== null && val !== '') {
        uniqueValues.add(String(val))
      }
    })

    console.log(`[${idx + 1}] ${col}`)
    console.log(`    Unique values (${uniqueValues.size}): ${Array.from(uniqueValues).slice(0, 10).join(', ')}`)
    if (uniqueValues.size > 10) {
      console.log(`    ... and ${uniqueValues.size - 10} more`)
    }
    console.log()
  })

  // Show all column headers for reference
  console.log(`\n═══════════════════════════════════════════════════════════════`)
  console.log('  ALL MILESTONE COLUMN HEADERS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  milestoneCols.forEach((col, idx) => {
    console.log(`  [${idx + 1}] ${col}`)
  })

  console.log('\n═══════════════════════════════════════════════════════════════\n')
}

main().catch(console.error)
