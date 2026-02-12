import * as XLSX from 'xlsx'

export interface ReadSheet {
  name: string
  rows: string[][]
}

export interface ReadResult {
  sheets: ReadSheet[]
}

function toArrayBuffer(input: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input
  }

  return input.slice().buffer
}

export function readWorkbookModel(
  input: ArrayBuffer | Uint8Array,
  options: XLSX.ParsingOptions = {},
): XLSX.WorkBook {
  return XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
    cellNF: false,
    cellText: false,
    ...options,
  })
}

export function readWorkbookFile(
  filePath: string,
  options: XLSX.ParsingOptions = {},
): XLSX.WorkBook {
  return XLSX.readFile(filePath, options)
}

export function readWorkbook(arrayBuffer: ArrayBuffer): ReadResult {
  const workbook = readWorkbookModel(arrayBuffer)

  const sheets: ReadSheet[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]

    if (!sheet) {
      return { name: sheetName, rows: [] }
    }

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })

    const rows = rawRows.map((row) => (row as unknown[]).map((cell) => String(cell ?? '')))

    return {
      name: sheetName,
      rows,
    }
  })

  return { sheets }
}
