import * as XLSX from 'xlsx'

const V801_TOOL_LIST = 'C:/Users/georgem/source/repos/SimPilot_Data/TestData/V801/V801_Docs/V801 Tool List.xlsx'
const BMW_TOOL_LIST = 'C:/Users/georgem/source/repos/SimPilot_Data/TestData/BMW/02. Tool List/J10735_BMW_NCAR_Robot_Equipment_List_Side_Frame.xlsx'

function inspectFile(filePath: string, projectName: string, sheetName?: string) {
  try {
    const workbook = XLSX.readFile(filePath)
    console.log(`\n=== ${projectName} ===`)
    console.log(`File: ${filePath}`)
    console.log(`Sheets: ${workbook.SheetNames.join(', ')}`)

    const targetSheetName = sheetName || workbook.SheetNames[0]
    console.log(`\nInspecting sheet: ${targetSheetName}`)
    
    const targetSheet = workbook.Sheets[targetSheetName]
    const data = XLSX.utils.sheet_to_json(targetSheet, { header: 1 }) as unknown[][]

    // Find header row (first row with multiple non-empty cells)
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const nonEmptyCount = data[i].filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length
      if (nonEmptyCount >= 3) {
        headerRowIndex = i
        break
      }
    }

    console.log(`\nHeader row index: ${headerRowIndex}`)
    console.log(`\nHeaders (Row ${headerRowIndex + 1}):`)
    const headers = data[headerRowIndex] as string[]
    console.log(headers)

    console.log(`\nFirst 3 data rows (after header):`)
    if (data.length > headerRowIndex + 1) console.log(data[headerRowIndex + 1])
    if (data.length > headerRowIndex + 2) console.log(data[headerRowIndex + 2])
    if (data.length > headerRowIndex + 3) console.log(data[headerRowIndex + 3])

    console.log(`\nTotal rows: ${data.length}`)
    console.log(`\nColumn count: ${headers.length}`)
  } catch (error) {
    console.error(`Error reading ${projectName}:`, error)
  }
}

console.log('Inspecting test files to determine vacuum parser test expectations...\n')
inspectFile(V801_TOOL_LIST, 'V801 Tool List', 'ToolList')
inspectFile(BMW_TOOL_LIST, 'BMW Tool List', 'BMW Mex J10735 Side Frame NCAR')
