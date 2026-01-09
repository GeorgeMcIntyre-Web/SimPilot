/**
 * Inspect Simulation Status Excel file structure
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'

async function main() {
  const filePath = process.argv[2] || "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Simulation_Status\\FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx"

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  SIMULATION STATUS FILE INSPECTION')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const buffer = fs.readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: false })

  console.log(`File: ${filePath.split('\\').pop()}`)
  console.log(`\nSheets: ${workbook.SheetNames.join(', ')}`)
  console.log()

  // Inspect each sheet
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')

    console.log(`Sheet: ${sheetName}`)
    console.log(`  Rows: ${range.e.r + 1}`)
    console.log(`  Cols: ${range.e.c + 1}`)

    // Parse first few rows to see headers
    const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (data.length > 0) {
      console.log(`  Header row (first 15 columns):`)
      const headers = data[0] as any[]
      headers.slice(0, 15).forEach((h, idx) => {
        if (h) console.log(`    [${idx}] ${h}`)
      })

      if (data.length > 1) {
        console.log(`  Sample data row 2:`)
        const row1 = data[1] as any[]
        row1.slice(0, 15).forEach((cell, idx) => {
          if (cell) console.log(`    [${idx}] ${cell}`)
        })
      }
    }
    console.log()
  })

  // Focus on main sheet (usually first one)
  const mainSheet = workbook.Sheets[workbook.SheetNames[0]]
  const dataWithHeaders = XLSX.utils.sheet_to_json(mainSheet, { defval: '' })

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  MAIN SHEET ANALYSIS')
  console.log('═══════════════════════════════════════════════════════════════\n')

  if (dataWithHeaders.length > 0) {
    const firstRow = dataWithHeaders[0] as Record<string, any>
    const allColumns = Object.keys(firstRow)

    console.log(`Total columns: ${allColumns.length}`)
    console.log(`\nAll column names:`)
    allColumns.forEach((col, idx) => {
      console.log(`  [${idx}] ${col}`)
    })

    console.log(`\nFirst 3 data rows:`)
    dataWithHeaders.slice(0, 3).forEach((row: any, idx) => {
      console.log(`\nRow ${idx + 1}:`)
      // Show first 10 columns
      allColumns.slice(0, 10).forEach(col => {
        const value = row[col]
        if (value) console.log(`  ${col}: ${value}`)
      })
    })
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n')
}

main().catch(console.error)
