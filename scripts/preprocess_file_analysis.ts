/**
 * Preprocessing File Analysis Tool
 * 
 * Analyzes Excel files to understand their structure before schema-agnostic ingestion.
 * Generates detailed reports about:
 * - Sheet categories detected
 * - Column roles detected
 * - Data patterns and edge cases
 * - Potential issues for schema-agnostic processing
 */

import XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { scanWorkbookWithConfig, SheetCategory } from '../src/ingestion/sheetSniffer'
import { analyzeHeaderRow, ColumnRole } from '../src/ingestion/columnRoleDetector'
import { sheetToMatrix, CellValue } from '../src/ingestion/excelUtils'
import { getActiveConfig } from '../src/ingestion/snifferConfig'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================================
// TYPES
// ============================================================================

interface FileAnalysis {
  filePath: string
  fileName: string
  fileSize: number
  sheets: SheetAnalysis[]
  overallAssessment: {
    categoryDetected: boolean
    primaryCategory: SheetCategory | null
    schemaCoverage: number
    potentialIssues: string[]
    recommendations: string[]
  }
}

interface SheetAnalysis {
  sheetName: string
  category: SheetCategory
  categoryScore: number
  headerRowIndex: number | null
  columnAnalysis: {
    totalColumns: number
    detectedColumns: number
    unknownColumns: number
    coveragePercentage: number
    columnRoles: ColumnRole[]
    unknownHeaders: string[]
  }
  dataAnalysis: {
    totalRows: number
    dataRows: number
    emptyRows: number
    sampleValues: Record<string, CellValue[]>
  }
  issues: string[]
  recommendations: string[]
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeFile(filePath: string): FileAnalysis {
  console.log(`\n📄 Analyzing: ${path.basename(filePath)}`)
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const stats = fs.statSync(filePath)
  const workbook = XLSX.readFile(filePath, { cellDates: true })
  const fileName = path.basename(filePath)

  // Use the sniffer with config
  const config = getActiveConfig()
  const scanResult = scanWorkbookWithConfig(workbook, fileName, config, 20)

  const sheets: SheetAnalysis[] = []
  const allIssues: string[] = []
  const allRecommendations: string[] = []

  // Analyze each sheet
  for (const sheetName of workbook.SheetNames) {
    const sheetAnalysis = analyzeSheet(workbook, sheetName, fileName, scanResult)
    sheets.push(sheetAnalysis)
    
    allIssues.push(...sheetAnalysis.issues.map(i => `[${sheetName}] ${i}`))
    allRecommendations.push(...sheetAnalysis.recommendations.map(r => `[${sheetName}] ${r}`))
  }

  // Overall assessment
  const primaryCategory = scanResult.bestOverall?.category ?? null
  const categoryDetected = primaryCategory !== null && primaryCategory !== 'UNKNOWN'
  
  // Calculate overall schema coverage
  const totalColumns = sheets.reduce((sum, s) => sum + s.columnAnalysis.totalColumns, 0)
  const detectedColumns = sheets.reduce((sum, s) => sum + s.columnAnalysis.detectedColumns, 0)
  const schemaCoverage = totalColumns > 0 ? Math.round((detectedColumns / totalColumns) * 100) : 0

  // Identify potential issues
  const potentialIssues: string[] = []
  if (!categoryDetected) {
    potentialIssues.push('No sheet category detected - may need manual classification')
  }
  if (schemaCoverage < 70) {
    potentialIssues.push(`Low schema coverage (${schemaCoverage}%) - many columns unrecognized`)
  }
  if (sheets.some(s => s.dataAnalysis.dataRows === 0)) {
    potentialIssues.push('Some sheets have no data rows')
  }
  if (sheets.some(s => s.headerRowIndex === null)) {
    potentialIssues.push('Some sheets have no detectable header row')
  }

  // Generate recommendations
  const recommendations: string[] = []
  if (!categoryDetected) {
    recommendations.push('Consider adding file-specific category override in snifferConfig')
  }
  if (schemaCoverage < 70) {
    recommendations.push('Review unknown columns and add patterns to columnRoleDetector')
  }
  if (sheets.some(s => s.columnAnalysis.unknownHeaders.length > 0)) {
    recommendations.push('Add patterns for unknown headers to improve detection')
  }

  return {
    filePath,
    fileName,
    fileSize: stats.size,
    sheets,
    overallAssessment: {
      categoryDetected,
      primaryCategory,
      schemaCoverage,
      potentialIssues: [...potentialIssues, ...allIssues],
      recommendations: [...recommendations, ...allRecommendations]
    }
  }
}

function analyzeSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  fileName: string,
  scanResult: ReturnType<typeof scanWorkbookWithConfig>
): SheetAnalysis {
  let rows: CellValue[][]
  try {
    rows = sheetToMatrix(workbook, sheetName, 1000) // Read up to 1000 rows
  } catch (error) {
    return {
      sheetName,
      category: 'UNKNOWN',
      categoryScore: 0,
      headerRowIndex: null,
      columnAnalysis: {
        totalColumns: 0,
        detectedColumns: 0,
        unknownColumns: 0,
        coveragePercentage: 0,
        columnRoles: [],
        unknownHeaders: []
      },
      dataAnalysis: {
        totalRows: 0,
        dataRows: 0,
        emptyRows: 0,
        sampleValues: {}
      },
      issues: [`Error reading sheet: ${error}`],
      recommendations: []
    }
  }

  if (rows.length === 0) {
    return {
      sheetName,
      category: 'UNKNOWN',
      categoryScore: 0,
      headerRowIndex: null,
      columnAnalysis: {
        totalColumns: 0,
        detectedColumns: 0,
        unknownColumns: 0,
        coveragePercentage: 0,
        columnRoles: [],
        unknownHeaders: []
      },
      dataAnalysis: {
        totalRows: 0,
        dataRows: 0,
        emptyRows: 0,
        sampleValues: {}
      },
      issues: ['Sheet is empty'],
      recommendations: []
    }
  }

  // Find the detection for this sheet
  const detection = scanResult.allDetections.find(d => d.sheetName === sheetName)
  const category = detection?.category ?? 'UNKNOWN'
  const categoryScore = detection?.score ?? 0

  // Find header row (usually first non-empty row with text headers)
  let headerRowIndex: number | null = null
  let headerRow: CellValue[] = []

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    // Check if this row looks like headers (mostly text, not numbers)
    const textCells = row.filter(cell => {
      const val = String(cell ?? '').trim()
      return val.length > 0 && isNaN(Number(val))
    })

    if (textCells.length >= 3) {
      headerRowIndex = i
      headerRow = row
      break
    }
  }

  // Analyze columns if we found headers
  let columnAnalysis = {
    totalColumns: 0,
    detectedColumns: 0,
    unknownColumns: 0,
    coveragePercentage: 0,
    columnRoles: [] as ColumnRole[],
    unknownHeaders: [] as string[]
  }

  if (headerRowIndex !== null) {
    const schemaAnalysis = analyzeHeaderRow(headerRow, sheetName, headerRowIndex)
    columnAnalysis = {
      totalColumns: schemaAnalysis.coverage.total,
      detectedColumns: schemaAnalysis.coverage.known,
      unknownColumns: schemaAnalysis.coverage.unknown,
      coveragePercentage: schemaAnalysis.coverage.percentage,
      columnRoles: Array.from(schemaAnalysis.roleMap.keys()),
      unknownHeaders: schemaAnalysis.unknownColumns.map(c => c.headerText).filter(h => h.length > 0)
    }
  } else {
    // Estimate columns from first data row
    const firstDataRow = rows.find(r => r && r.length > 0)
    if (firstDataRow) {
      columnAnalysis.totalColumns = firstDataRow.length
    }
  }

  // Analyze data rows
  const dataRows = rows.slice(headerRowIndex !== null ? headerRowIndex + 1 : 0)
  const nonEmptyRows = dataRows.filter(row => 
    row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim().length > 0)
  )

  // Sample values from first few rows (for each column)
  const sampleValues: Record<string, CellValue[]> = {}
  if (headerRowIndex !== null && headerRow.length > 0) {
    for (let colIdx = 0; colIdx < Math.min(headerRow.length, 20); colIdx++) {
      const header = String(headerRow[colIdx] ?? '').trim() || `Column_${colIdx}`
      const samples: CellValue[] = []
      
      for (let rowIdx = 0; rowIdx < Math.min(5, nonEmptyRows.length); rowIdx++) {
        const row = nonEmptyRows[rowIdx]
        if (row && colIdx < row.length) {
          const value = row[colIdx]
          if (value !== null && value !== undefined && String(value).trim().length > 0) {
            samples.push(value)
          }
        }
      }
      
      if (samples.length > 0) {
        sampleValues[header] = samples
      }
    }
  }

  // Identify issues
  const issues: string[] = []
  if (category === 'UNKNOWN') {
    issues.push(`Category not detected (score: ${categoryScore})`)
  }
  if (categoryScore > 0 && categoryScore < 5) {
    issues.push(`Low category confidence (score: ${categoryScore})`)
  }
  if (headerRowIndex === null) {
    issues.push('No header row detected')
  }
  if (columnAnalysis.coveragePercentage < 50) {
    issues.push(`Low column coverage (${columnAnalysis.coveragePercentage}%)`)
  }
  if (nonEmptyRows.length === 0) {
    issues.push('No data rows found')
  }

  // Generate recommendations
  const recommendations: string[] = []
  if (category === 'UNKNOWN' && rows.length > 0) {
    recommendations.push('Add category signature patterns to sheetSniffer.ts')
  }
  if (columnAnalysis.unknownHeaders.length > 0) {
    recommendations.push(`Add patterns for: ${columnAnalysis.unknownHeaders.slice(0, 5).join(', ')}`)
  }
  if (headerRowIndex === null && rows.length > 0) {
    recommendations.push('Review sheet structure - headers may be in non-standard location')
  }

  return {
    sheetName,
    category,
    categoryScore,
    headerRowIndex,
    columnAnalysis,
    dataAnalysis: {
      totalRows: rows.length,
      dataRows: nonEmptyRows.length,
      emptyRows: rows.length - nonEmptyRows.length,
      sampleValues
    },
    issues,
    recommendations
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport(analyses: FileAnalysis[]): string {
  let report = '# File Preprocessing Analysis Report\n\n'
  report += `Generated: ${new Date().toISOString()}\n`
  report += `Files Analyzed: ${analyses.length}\n\n`
  report += '---\n\n'

  for (const analysis of analyses) {
    report += `## ${analysis.fileName}\n\n`
    report += `**Path:** \`${analysis.filePath}\`\n`
    report += `**Size:** ${(analysis.fileSize / 1024).toFixed(2)} KB\n\n`

    // Overall Assessment
    report += `### Overall Assessment\n\n`
    report += `- **Category Detected:** ${analysis.overallAssessment.categoryDetected ? '✅ Yes' : '❌ No'}\n`
    report += `- **Primary Category:** ${analysis.overallAssessment.primaryCategory ?? 'UNKNOWN'}\n`
    report += `- **Schema Coverage:** ${analysis.overallAssessment.schemaCoverage}%\n\n`

    if (analysis.overallAssessment.potentialIssues.length > 0) {
      report += `**⚠️ Potential Issues:**\n`
      for (const issue of analysis.overallAssessment.potentialIssues) {
        report += `- ${issue}\n`
      }
      report += `\n`
    }

    if (analysis.overallAssessment.recommendations.length > 0) {
      report += `**💡 Recommendations:**\n`
      for (const rec of analysis.overallAssessment.recommendations) {
        report += `- ${rec}\n`
      }
      report += `\n`
    }

    // Sheet Details
    report += `### Sheets (${analysis.sheets.length})\n\n`
    for (const sheet of analysis.sheets) {
      report += `#### ${sheet.sheetName}\n\n`
      report += `- **Category:** ${sheet.category} (score: ${sheet.categoryScore})\n`
      report += `- **Header Row:** ${sheet.headerRowIndex !== null ? `Row ${sheet.headerRowIndex + 1}` : 'Not found'}\n`
      report += `- **Data Rows:** ${sheet.dataAnalysis.dataRows}\n`
      report += `- **Column Coverage:** ${sheet.columnAnalysis.coveragePercentage}% (${sheet.columnAnalysis.detectedColumns}/${sheet.columnAnalysis.totalColumns} detected)\n`
      
      if (sheet.columnAnalysis.columnRoles.length > 0) {
        report += `- **Detected Roles:** ${sheet.columnAnalysis.columnRoles.join(', ')}\n`
      }
      
      if (sheet.columnAnalysis.unknownHeaders.length > 0) {
        report += `- **Unknown Headers:** ${sheet.columnAnalysis.unknownHeaders.slice(0, 10).join(', ')}${sheet.columnAnalysis.unknownHeaders.length > 10 ? '...' : ''}\n`
      }

      if (sheet.issues.length > 0) {
        report += `\n**Issues:**\n`
        for (const issue of sheet.issues) {
          report += `- ${issue}\n`
        }
      }

      if (sheet.recommendations.length > 0) {
        report += `\n**Recommendations:**\n`
        for (const rec of sheet.recommendations) {
          report += `- ${rec}\n`
        }
      }

      // Sample values
      if (Object.keys(sheet.dataAnalysis.sampleValues).length > 0) {
        report += `\n**Sample Values:**\n`
        for (const [header, samples] of Object.entries(sheet.dataAnalysis.sampleValues)) {
          const sampleStr = samples.slice(0, 3).map(v => String(v)).join(', ')
          report += `- \`${header}\`: ${sampleStr}${samples.length > 3 ? '...' : ''}\n`
        }
      }

      report += `\n`
    }

    report += '---\n\n'
  }

  // Summary
  report += `## Summary\n\n`
  const totalFiles = analyses.length
  const detectedFiles = analyses.filter(a => a.overallAssessment.categoryDetected).length
  const avgCoverage = Math.round(
    analyses.reduce((sum, a) => sum + a.overallAssessment.schemaCoverage, 0) / totalFiles
  )

  report += `- **Files Analyzed:** ${totalFiles}\n`
  report += `- **Categories Detected:** ${detectedFiles}/${totalFiles} (${Math.round((detectedFiles / totalFiles) * 100)}%)\n`
  report += `- **Average Schema Coverage:** ${avgCoverage}%\n\n`

  return report
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const filePaths = [
    String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`,
    String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`,
    String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_RISERS.xlsx`,
    String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx`,
    String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx`,
    String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\P1MX_Reuse Equipment -STLA-S_2025_10_29_REV00.xlsm`,
    String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`,
    String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Zangenpool_TMS_Rev01_Quantity_Force_Info.xls`
  ]

  console.log('🔍 Starting file preprocessing analysis...\n')
  console.log(`Analyzing ${filePaths.length} files...\n`)

  const analyses: FileAnalysis[] = []

  for (const filePath of filePaths) {
    try {
      const analysis = analyzeFile(filePath)
      analyses.push(analysis)
      
      // Quick summary
      console.log(`  ✅ ${analysis.fileName}`)
      console.log(`     Category: ${analysis.overallAssessment.primaryCategory ?? 'UNKNOWN'}`)
      console.log(`     Coverage: ${analysis.overallAssessment.schemaCoverage}%`)
      console.log(`     Sheets: ${analysis.sheets.length}`)
    } catch (error) {
      console.error(`  ❌ Error analyzing ${path.basename(filePath)}:`, error)
    }
  }

  // Generate report
  const report = generateReport(analyses)
  const reportPath = path.join(__dirname, '..', 'preprocessing_analysis_report.md')
  fs.writeFileSync(reportPath, report, 'utf-8')

  console.log(`\n📊 Report generated: ${reportPath}`)
  console.log(`\n✅ Analysis complete!`)
}

main().catch(console.error)

