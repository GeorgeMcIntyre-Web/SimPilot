import * as XLSX from 'xlsx'

export function createMockWorkbook(sheets: Record<string, string[][]>): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  for (const [sheetName, data] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  return workbook
}
