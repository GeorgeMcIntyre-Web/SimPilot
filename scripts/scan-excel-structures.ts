#!/usr/bin/env node
// Excel Structure Discovery Script
// Scans all Excel workbooks in SimPilot_Data and generates comprehensive structure analysis

import XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// TYPES
// ============================================================================

interface CellInfo {
  value: unknown
  type: string
  isEmpty: boolean
}

interface RowAnalysis {
  rowIndex: number
  cellCount: number
  nonEmptyCells: number
  cells: CellInfo[]
  likelyHeader: boolean
  headerScore: number
}

interface SheetAnalysis {
  sheetName: string
  totalRows: number
  totalColumns: number
  headerRowIndex: number | null
  headerRow: string[]
  sampleRows: RowAnalysis[]
  isEmpty: boolean
  category: string | null
}

interface WorkbookAnalysis {
  filePath: string
  fileName: string
  workbookId: string
  simulationSourceKind: string
  sheetCount: number
  sheets: SheetAnalysis[]
  errors: string[]
}

interface DiscoveryOutput {
  scanDate: string
  dataRootPath: string
  totalWorkbooks: number
  successfulScans: number
  failedScans: number
  workbooks: WorkbookAnalysis[]
  summary: {
    byCategory: Record<string, number>
    bySourceKind: Record<string, number>
    totalSheets: number
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_ROOT = process.env.SIMPILOT_DATA_PATH || 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data'
const OUTPUT_DIR = path.join(__dirname, '..', 'docs')
const JSON_OUTPUT = path.join(OUTPUT_DIR, 'EXCEL_DISCOVERY_OUTPUT.json')
const MD_OUTPUT = path.join(OUTPUT_DIR, 'EXCEL_DISCOVERY_OUTPUT.md')

const SCAN_PATHS = [
  '03_Simulation/00_Simulation_Status',
  '03_Simulation/01_Equipment_List',
  'DesignOS/01_Equipment_List',
  'DesignOS/05_Status_Sheets'
]

const MAX_ROWS_TO_SCAN = 30
const SAMPLE_ROW_COUNT = 10

// Keywords that indicate a header row
const HEADER_KEYWORDS = [
  'area', 'station', 'robot', 'application', 'assembly', 'line',
  'project', 'type', 'status', 'name', 'id', 'number',
  'old', 'new', 'reuse', 'riser', 'dresser', 'gun', 'force',
  'responsible', 'tech', 'order', 'code', 'payload'
]

// ============================================================================
// UTILITIES
// ============================================================================

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function isEmptyCell(value: unknown): boolean {
  const normalized = normalizeValue(value)
  return normalized.length === 0
}

function getCellType(value: unknown): string {
  if (value === null || value === undefined) {
    return 'empty'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (normalized.length === 0) {
      return 'empty'
    }
    if (/^\d+$/.test(normalized)) {
      return 'numeric-string'
    }
    if (normalized.toUpperCase() === 'NA' || normalized.toUpperCase() === 'N/A') {
      return 'na'
    }
    return 'text'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  return 'unknown'
}

function calculateHeaderScore(row: unknown[]): number {
  let score = 0

  for (const cell of row) {
    const normalized = normalizeValue(cell).toLowerCase()

    if (normalized.length === 0) {
      continue
    }

    // Check for header keywords
    for (const keyword of HEADER_KEYWORDS) {
      if (normalized.includes(keyword)) {
        score += 5
        break
      }
    }

    // Penalize if cell looks like data
    if (/^\d+$/.test(normalized)) {
      score -= 2
    }

    // Boost if all caps
    if (normalized === normalized.toUpperCase() && normalized.length > 2) {
      score += 2
    }
  }

  return score
}

function detectHeaderRow(rows: unknown[][]): number | null {
  let bestScore = 0
  let bestIndex: number | null = null

  for (let i = 0; i < Math.min(rows.length, MAX_ROWS_TO_SCAN); i++) {
    const row = rows[i]

    if (!row) {
      continue
    }

    const score = calculateHeaderScore(row)

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  // Require minimum score of 10
  if (bestScore < 10) {
    return null
  }

  return bestIndex
}

function analyzeRow(row: unknown[], rowIndex: number): RowAnalysis {
  const cells: CellInfo[] = []
  let nonEmptyCells = 0

  for (const cellValue of row) {
    const isEmpty = isEmptyCell(cellValue)
    if (!isEmpty) {
      nonEmptyCells++
    }

    cells.push({
      value: cellValue,
      type: getCellType(cellValue),
      isEmpty
    })
  }

  const headerScore = calculateHeaderScore(row)
  const likelyHeader = headerScore > 10

  return {
    rowIndex,
    cellCount: cells.length,
    nonEmptyCells,
    cells,
    likelyHeader,
    headerScore
  }
}

function analyzeSheet(workbook: XLSX.WorkBook, sheetName: string): SheetAnalysis {
  const sheet = workbook.Sheets[sheetName]

  if (!sheet) {
    return {
      sheetName,
      totalRows: 0,
      totalColumns: 0,
      headerRowIndex: null,
      headerRow: [],
      sampleRows: [],
      isEmpty: true,
      category: null
    }
  }

  // Get range
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const totalRows = range.e.r + 1
  const totalColumns = range.e.c + 1

  // Convert to array of arrays
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: true
  })

  if (rows.length === 0) {
    return {
      sheetName,
      totalRows,
      totalColumns,
      headerRowIndex: null,
      headerRow: [],
      sampleRows: [],
      isEmpty: true,
      category: null
    }
  }

  // Detect header row
  const headerRowIndex = detectHeaderRow(rows)
  const headerRow: string[] = headerRowIndex !== null
    ? rows[headerRowIndex].map(normalizeValue)
    : []

  // Analyze sample rows
  const sampleRows: RowAnalysis[] = []
  const startRow = headerRowIndex !== null ? headerRowIndex : 0
  const endRow = Math.min(rows.length, startRow + SAMPLE_ROW_COUNT)

  for (let i = startRow; i < endRow; i++) {
    const row = rows[i]
    if (!row) {
      continue
    }
    sampleRows.push(analyzeRow(row, i))
  }

  // Simple category detection based on header keywords
  let category: string | null = null
  const headerText = headerRow.join(' ').toLowerCase()

  if (headerText.includes('simulation') && headerText.includes('status')) {
    category = 'SIMULATION_STATUS'
  } else if (headerText.includes('robot') && (headerText.includes('number') || headerText.includes('type'))) {
    category = 'ROBOT_SPECS'
  } else if (headerText.includes('riser') || headerText.includes('raiser')) {
    category = 'REUSE_RISERS'
  } else if (headerText.includes('tip') && headerText.includes('dresser')) {
    category = 'REUSE_TIP_DRESSERS'
  } else if (headerText.includes('weld') && headerText.includes('gun')) {
    category = 'REUSE_WELD_GUNS'
  } else if (headerText.includes('gun') && headerText.includes('force')) {
    category = 'GUN_FORCE'
  } else if (headerText.includes('tool') || headerText.includes('equipment')) {
    category = 'IN_HOUSE_TOOLING'
  }

  const isEmpty = sampleRows.every(row => row.nonEmptyCells === 0)

  return {
    sheetName,
    totalRows,
    totalColumns,
    headerRowIndex,
    headerRow,
    sampleRows,
    isEmpty,
    category
  }
}

function inferWorkbookId(fileName: string, filePath: string): string {
  const isInternal = filePath.includes('03_Simulation')
  const isOutsource = filePath.includes('DesignOS')

  // Simple mapping based on filename
  if (fileName.includes('REAR_UNIT') && fileName.includes('DES')) {
    return 'STLA_REAR_DES_SIM_STATUS_INTERNAL'
  }
  if (fileName.includes('UNDERBODY') && fileName.includes('DES')) {
    return 'STLA_UNDERBODY_DES_SIM_STATUS_INTERNAL'
  }
  if (fileName.includes('FRONT_UNIT') && fileName.includes('CSG')) {
    return 'STLA_FRONT_CSG_SIM_STATUS_OUTSOURCE'
  }
  if (fileName.includes('REAR_UNIT') && fileName.includes('CSG')) {
    return 'STLA_REAR_CSG_SIM_STATUS_OUTSOURCE'
  }
  if (fileName.includes('UNDERBODY') && fileName.includes('CSG')) {
    return 'STLA_UNDERBODY_CSG_SIM_STATUS_OUTSOURCE'
  }
  if (fileName.includes('Robotlist') && fileName.includes('Rev05')) {
    return isInternal ? 'STLA_UB_ROBOTLIST_REV05_INTERNAL' : 'STLA_UB_ROBOTLIST_REV05_OUTSOURCE'
  }
  if (fileName.includes('Robotlist') && fileName.includes('Rev01')) {
    return isInternal ? 'STLA_UB_ROBOTLIST_REV01_INTERNAL' : 'STLA_UB_ROBOTLIST_REV01_OUTSOURCE'
  }
  if (fileName.includes('REUSE_LIST_RISERS')) {
    return isInternal ? 'GLOBAL_ZA_REUSE_RISERS_INTERNAL' : 'GLOBAL_ZA_REUSE_RISERS_OUTSOURCE'
  }
  if (fileName.includes('REUSE_LIST_TIP_DRESSER')) {
    return isInternal ? 'GLOBAL_ZA_REUSE_TIP_DRESSER_INTERNAL' : 'GLOBAL_ZA_REUSE_TIP_DRESSER_OUTSOURCE'
  }
  if (fileName.includes('REUSE_LIST_TMS_WG')) {
    return isInternal ? 'GLOBAL_ZA_REUSE_TMS_WG_INTERNAL' : 'GLOBAL_ZA_REUSE_TMS_WG_OUTSOURCE'
  }
  if (fileName.includes('Zangenpool')) {
    return 'ZANGENPOOL_TMS_QUANTITY_FORCE'
  }
  if (fileName.includes('Zangenübersichtsliste') || fileName.includes('Zangenubers')) {
    return 'ZANGEN_UEBERSICHTSLISTE_OPEL_MERIVA_ZARA'
  }

  return 'UNKNOWN_WORKBOOK'
}

function analyzeWorkbook(filePath: string): WorkbookAnalysis {
  const fileName = path.basename(filePath)
  const workbookId = inferWorkbookId(fileName, filePath)
  const simulationSourceKind = filePath.includes('DesignOS') ? 'OutsourceSimulation' : 'InternalSimulation'

  const analysis: WorkbookAnalysis = {
    filePath,
    fileName,
    workbookId,
    simulationSourceKind,
    sheetCount: 0,
    sheets: [],
    errors: []
  }

  try {
    const workbook = XLSX.readFile(filePath)
    analysis.sheetCount = workbook.SheetNames.length

    for (const sheetName of workbook.SheetNames) {
      try {
        const sheetAnalysis = analyzeSheet(workbook, sheetName)
        analysis.sheets.push(sheetAnalysis)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        analysis.errors.push(`Sheet "${sheetName}": ${errorMsg}`)
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    analysis.errors.push(`Workbook load failed: ${errorMsg}`)
  }

  return analysis
}

// ============================================================================
// FILE SYSTEM SCANNING
// ============================================================================

function findExcelFiles(rootPath: string, relativePath: string): string[] {
  const fullPath = path.join(rootPath, relativePath)
  const files: string[] = []

  try {
    const entries = fs.readdirSync(fullPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (ext === '.xlsx' || ext === '.xls' || ext === '.xlsm') {
          files.push(path.join(fullPath, entry.name))
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${fullPath}:`, error)
  }

  return files
}

// ============================================================================
// OUTPUT GENERATION
// ============================================================================

function generateMarkdownReport(output: DiscoveryOutput): string {
  const lines: string[] = []

  lines.push('# Excel Structure Discovery Report')
  lines.push('')
  lines.push(`**Scan Date:** ${output.scanDate}`)
  lines.push(`**Data Root:** \`${output.dataRootPath}\``)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- **Total Workbooks:** ${output.totalWorkbooks}`)
  lines.push(`- **Successful Scans:** ${output.successfulScans}`)
  lines.push(`- **Failed Scans:** ${output.failedScans}`)
  lines.push(`- **Total Sheets:** ${output.summary.totalSheets}`)
  lines.push('')

  lines.push('### By Category')
  lines.push('')
  for (const [category, count] of Object.entries(output.summary.byCategory)) {
    lines.push(`- **${category}:** ${count} sheets`)
  }
  lines.push('')

  lines.push('### By Source Kind')
  lines.push('')
  for (const [kind, count] of Object.entries(output.summary.bySourceKind)) {
    lines.push(`- **${kind}:** ${count} workbooks`)
  }
  lines.push('')

  lines.push('---')
  lines.push('')
  lines.push('## Workbook Details')
  lines.push('')

  for (const wb of output.workbooks) {
    lines.push(`### ${wb.fileName}`)
    lines.push('')
    lines.push(`- **Path:** \`${wb.filePath}\``)
    lines.push(`- **Workbook ID:** \`${wb.workbookId}\``)
    lines.push(`- **Source Kind:** ${wb.simulationSourceKind}`)
    lines.push(`- **Sheet Count:** ${wb.sheetCount}`)
    lines.push('')

    if (wb.errors.length > 0) {
      lines.push('**Errors:**')
      for (const error of wb.errors) {
        lines.push(`- ⚠️ ${error}`)
      }
      lines.push('')
    }

    for (const sheet of wb.sheets) {
      lines.push(`#### Sheet: ${sheet.sheetName}`)
      lines.push('')
      lines.push(`- **Dimensions:** ${sheet.totalRows} rows × ${sheet.totalColumns} columns`)
      lines.push(`- **Category:** ${sheet.category || 'UNKNOWN'}`)
      lines.push(`- **Empty:** ${sheet.isEmpty ? 'Yes' : 'No'}`)

      if (sheet.headerRowIndex !== null) {
        lines.push(`- **Header Row:** ${sheet.headerRowIndex} (0-indexed)`)
        lines.push('')
        lines.push('**Header Columns:**')
        lines.push('')
        lines.push('| Index | Column Name |')
        lines.push('|-------|-------------|')
        sheet.headerRow.forEach((col, idx) => {
          if (col.length > 0) {
            lines.push(`| ${idx} | ${col} |`)
          }
        })
        lines.push('')
      } else {
        lines.push('- **Header Row:** Not detected')
        lines.push('')
      }

      if (sheet.sampleRows.length > 0 && !sheet.isEmpty) {
        lines.push('**Sample Rows:**')
        lines.push('')
        const firstDataRow = sheet.sampleRows.find(r => !r.likelyHeader && r.nonEmptyCells > 0)
        if (firstDataRow) {
          lines.push(`Row ${firstDataRow.rowIndex} (${firstDataRow.nonEmptyCells} non-empty cells):`)
          lines.push('```')
          firstDataRow.cells.slice(0, 10).forEach((cell, idx) => {
            if (!cell.isEmpty) {
              lines.push(`  [${idx}] ${cell.type}: ${String(cell.value).substring(0, 50)}`)
            }
          })
          lines.push('```')
          lines.push('')
        }
      }
    }

    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔍 Excel Structure Discovery')
  console.log('============================')
  console.log('')
  console.log(`Data root: ${DATA_ROOT}`)
  console.log('')

  // Collect all Excel files
  const allFiles: string[] = []
  for (const scanPath of SCAN_PATHS) {
    const files = findExcelFiles(DATA_ROOT, scanPath)
    console.log(`Found ${files.length} files in ${scanPath}`)
    allFiles.push(...files)
  }

  console.log('')
  console.log(`Total files to scan: ${allFiles.length}`)
  console.log('')

  // Analyze each workbook
  const workbooks: WorkbookAnalysis[] = []
  let successCount = 0
  let failCount = 0

  for (const filePath of allFiles) {
    const fileName = path.basename(filePath)
    console.log(`Analyzing: ${fileName}...`)

    const analysis = analyzeWorkbook(filePath)
    workbooks.push(analysis)

    if (analysis.errors.length === 0) {
      successCount++
      console.log(`  ✓ ${analysis.sheets.length} sheets`)
    } else {
      failCount++
      console.log(`  ✗ ${analysis.errors.length} errors`)
    }
  }

  // Build summary
  const categoryCount: Record<string, number> = {}
  const sourceKindCount: Record<string, number> = {}
  let totalSheets = 0

  for (const wb of workbooks) {
    sourceKindCount[wb.simulationSourceKind] = (sourceKindCount[wb.simulationSourceKind] || 0) + 1

    for (const sheet of wb.sheets) {
      totalSheets++
      const cat = sheet.category || 'UNKNOWN'
      categoryCount[cat] = (categoryCount[cat] || 0) + 1
    }
  }

  const output: DiscoveryOutput = {
    scanDate: new Date().toISOString(),
    dataRootPath: DATA_ROOT,
    totalWorkbooks: allFiles.length,
    successfulScans: successCount,
    failedScans: failCount,
    workbooks,
    summary: {
      byCategory: categoryCount,
      bySourceKind: sourceKindCount,
      totalSheets
    }
  }

  // Write JSON output
  console.log('')
  console.log(`Writing JSON to: ${JSON_OUTPUT}`)
  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(output, null, 2), 'utf-8')

  // Write Markdown output
  console.log(`Writing Markdown to: ${MD_OUTPUT}`)
  const markdown = generateMarkdownReport(output)
  fs.writeFileSync(MD_OUTPUT, markdown, 'utf-8')

  console.log('')
  console.log('✅ Discovery complete!')
  console.log('')
  console.log('Summary:')
  console.log(`  - ${successCount}/${allFiles.length} workbooks scanned successfully`)
  console.log(`  - ${totalSheets} total sheets`)
  console.log(`  - ${Object.keys(categoryCount).length} categories detected`)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
