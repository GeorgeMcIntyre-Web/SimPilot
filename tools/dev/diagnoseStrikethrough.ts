/**
 * Diagnose Strikethrough Detection
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'

const filePath = "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Ford_OHAP_V801N_Robot_Equipment_List.xlsx"

console.log('Testing strikethrough detection...\n')

// Read with cell styles
const buffer = fs.readFileSync(filePath)
const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true })

const sheet = workbook.Sheets['V801N_Robot_Equipment_List 26.9']

// Check rows 4-50 (known to have some struck-through entries based on screenshot)
console.log('Checking rows 4-50 for strikethrough formatting:\n')

for (let row = 4; row < 50; row++) {
  const robotIdCell = sheet[XLSX.utils.encode_cell({ r: row, c: 9 })]  // Column 9 = "Robo No. New"

  if (robotIdCell && robotIdCell.v) {
    const hasStrike = robotIdCell.s && robotIdCell.s.font && robotIdCell.s.font.strike
    const cellInfo = {
      row,
      value: robotIdCell.v,
      hasStrike: hasStrike || false,
      cellData: robotIdCell.s ? 'Has style' : 'No style',
    }

    if (hasStrike) {
      console.log(`✓ Row ${row}: ${robotIdCell.v} - STRUCK THROUGH`)
    } else if (String(robotIdCell.v).includes('8Y-020-03') || String(robotIdCell.v).includes('8Y-020-04')) {
      // These were visible as struck through in the screenshot
      console.log(`✗ Row ${row}: ${robotIdCell.v} - Expected struck through but NOT detected`)
      console.log(`  Cell data:`, JSON.stringify(robotIdCell, null, 2))
    }
  }
}

console.log('\nChecking raw cell structure for a few cells...\n')

const testCells = [
  { r: 20, c: 9 },  // Random cell
  { r: 25, c: 9 },  // Another cell
  { r: 30, c: 9 },
]

for (const pos of testCells) {
  const addr = XLSX.utils.encode_cell(pos)
  const cell = sheet[addr]
  if (cell) {
    console.log(`Cell ${addr} (Row ${pos.r}):`)
    console.log(`  Value: ${cell.v}`)
    console.log(`  Has 's' property: ${!!cell.s}`)
    if (cell.s) {
      console.log(`  Style:`, JSON.stringify(cell.s, null, 2))
    }
    console.log()
  }
}
