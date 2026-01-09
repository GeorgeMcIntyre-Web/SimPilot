/**
 * Analyze Robot Equipment List Columns
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'

const filePath = "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Ford_OHAP_V801N_Robot_Equipment_List.xlsx"

const buffer = fs.readFileSync(filePath)
const workbook = XLSX.read(buffer, { type: 'buffer' })

console.log('═══════════════════════════════════════════════════════════════')
console.log('  ROBOT EQUIPMENT LIST COLUMN ANALYSIS')
console.log('═══════════════════════════════════════════════════════════════\n')

const sheetName = 'V801N_Robot_Equipment_List 26.9'
const sheet = workbook.Sheets[sheetName]
const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

// Find header rows (row 1 has column groups, row 2 has sub-headers)
const headerRow1 = data[1] as string[]
const headerRow2 = data[2] as string[]

console.log('Header Row 1 (Column Groups):')
headerRow1.forEach((h, idx) => {
  if (h && h.trim()) {
    console.log(`  Col ${idx}: "${h}"`)
  }
})

console.log('\n\nHeader Row 2 (Sub-headers):')
headerRow2.forEach((h, idx) => {
  if (h && h.trim()) {
    console.log(`  Col ${idx}: "${h}"`)
  }
})

console.log('\n\nCombined Headers (non-empty):')
const combinedHeaders: string[] = []
for (let i = 0; i < Math.max(headerRow1.length, headerRow2.length); i++) {
  const h1 = headerRow1[i] || ''
  const h2 = headerRow2[i] || ''

  let combined = ''
  if (h1 && h2 && h1.trim() && h2.trim()) {
    combined = `${h1.trim()} - ${h2.trim()}`
  } else if (h1 && h1.trim()) {
    combined = h1.trim()
  } else if (h2 && h2.trim()) {
    combined = h2.trim()
  }

  combinedHeaders.push(combined)

  if (combined) {
    console.log(`  Col ${i}: "${combined}"`)
  }
}

// Sample data row
console.log('\n\nSample Data Row (Row 4 - First Robot):')
const sampleRow = data[4] as any[]
sampleRow.forEach((val, idx) => {
  if (combinedHeaders[idx]) {
    console.log(`  ${combinedHeaders[idx]}: ${JSON.stringify(val)}`)
  }
})

console.log('\n\n═══════════════════════════════════════════════════════════════\n')
