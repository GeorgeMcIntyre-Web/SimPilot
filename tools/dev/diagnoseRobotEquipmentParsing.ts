/**
 * Diagnose Robot Equipment Parsing
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'

const filePath = "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Ford_OHAP_V801N_Robot_Equipment_List.xlsx"
const sheetName = 'V801N_Robot_Equipment_List 26.9'

const buffer = fs.readFileSync(filePath)
const workbook = XLSX.read(buffer, { type: 'buffer' })
const sheet = workbook.Sheets[sheetName]

// Get header row (row 1)
const headerData: any[] = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  range: 1,
  defval: '',
})

const headerRow = headerData[0] as string[]

console.log('Header Row Fields:')
headerRow.forEach((field, idx) => {
  if (field && field.trim()) {
    console.log(`  Col ${idx}: "${field}"`)
  }
})

// Get first data row (row 4)
const dataRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
  header: headerRow,
  range: 4,
  defval: '',
})

const firstRow = dataRows[0]

console.log('\nFirst Data Row (with header mapping):')
for (const [key, value] of Object.entries(firstRow)) {
  if (value !== '' && value !== null && value !== undefined) {
    console.log(`  "${key}": ${JSON.stringify(value)}`)
  }
}

// Check specific fields
console.log('\nSpecific Field Checks:')
console.log(`  Function: "${firstRow['Function']}"`)
console.log(`  Install status: "${firstRow['Install status']}"`)
console.log(`  Robo No. New: "${firstRow['Robo No. New']}"`)
console.log(`  Station No.: "${firstRow['Station No.']}"`)
