/**
 * Inspect Robot Equipment List Excel File
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'

const filePath = "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Ford_OHAP_V801N_Robot_Equipment_List.xlsx"

const buffer = fs.readFileSync(filePath)
const workbook = XLSX.read(buffer, { type: 'buffer' })

console.log('═══════════════════════════════════════════════════════════════')
console.log('  ROBOT EQUIPMENT LIST INSPECTION')
console.log('═══════════════════════════════════════════════════════════════\n')

console.log('Sheet Names:', workbook.SheetNames)
console.log()

// Inspect each sheet
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n--- Sheet: "${sheetName}" ---\n`)

  const sheet = workbook.Sheets[sheetName]
  const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  console.log(`Total rows: ${data.length}`)
  console.log('\nFirst 15 rows:')

  data.slice(0, 15).forEach((row, idx) => {
    const rowData = (row as any[]).slice(0, 10) // First 10 columns
    console.log(`Row ${idx}: ${JSON.stringify(rowData)}`)
  })

  // Find header row
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i] as any[]
    const rowStr = row.join('|').toLowerCase()
    if (rowStr.includes('robot') || rowStr.includes('equipment') || rowStr.includes('station')) {
      console.log(`\nPossible header at row ${i}: ${JSON.stringify(row)}`)
      if (headerRowIndex === -1) headerRowIndex = i
    }
  }

  if (headerRowIndex !== -1) {
    console.log(`\nUsing header row ${headerRowIndex}`)
    const dataWithHeaders = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex })
    console.log(`\nData rows (with headers): ${dataWithHeaders.length}`)
    console.log('\nFirst 5 data rows:')
    dataWithHeaders.slice(0, 5).forEach((row, idx) => {
      console.log(`Row ${idx}:`, JSON.stringify(row, null, 2))
    })
  }
})

console.log('\n═══════════════════════════════════════════════════════════════\n')
