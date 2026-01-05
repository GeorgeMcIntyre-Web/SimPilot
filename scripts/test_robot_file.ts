import { readFileSync } from 'fs'
import path from 'path'
import { read } from 'xlsx'
import { sheetToMatrix } from '../src/ingestion/excelUtils'

const DATA_ROOT = process.env.SIMPILOT_DATA_PATH ?? path.resolve(process.cwd(), 'SimPilot_Data')
const filePath = path.join(
  DATA_ROOT,
  '03_Simulation',
  '01_Equipment_List',
  'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx'
)

console.log('📄 Analyzing robot list file...\n')

const workbook = read(readFileSync(filePath), { type: 'buffer' })
console.log('Sheets:', workbook.SheetNames)

const sheetName = 'STLA-S'
if (workbook.SheetNames.includes(sheetName)) {
  const rows = sheetToMatrix(workbook, sheetName)
  console.log(`\n📊 Sheet "${sheetName}": ${rows.length} rows\n`)
  
  console.log('First 10 rows:')
  rows.slice(0, 10).forEach((row, i) => {
    console.log(`\nRow ${i}:`)
    row.slice(0, 10).forEach((cell, j) => {
      if (cell !== null && cell !== '') {
        console.log(`  Col ${j}: "${cell}"`)
      }
    })
  })
  
  // Try to find header row
  console.log('\n🔍 Looking for header patterns...')
  const possibleHeaders = [
    ['ROBOTNUMBER', 'ASSEMBLY LINE', 'STATION NUMBER'],
    ['ROBOTNUMBER (E-NUMBER)', 'ASSEMBLY LINE', 'STATION NUMBER'],
    ['ROBOTS TOTAL', 'ASSEMBLY LINE', 'STATION NUMBER'],
    ['ROBOT CAPTION', 'ASSEMBLY LINE', 'STATION NUMBER']
  ]
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    const rowText = row.map(c => String(c || '').toUpperCase().trim()).join(' | ')
    
    for (const headerSet of possibleHeaders) {
      const matches = headerSet.filter(h => 
        rowText.includes(h.toUpperCase())
      )
      if (matches.length >= 2) {
        console.log(`\n✅ Found potential header at row ${i}:`)
        console.log(`   Matched: ${matches.join(', ')}`)
        console.log(`   Full row: ${rowText.substring(0, 200)}`)
        break
      }
    }
  }
} else {
  console.log(`\n❌ Sheet "${sheetName}" not found`)
  console.log('Available sheets:', workbook.SheetNames)
}



