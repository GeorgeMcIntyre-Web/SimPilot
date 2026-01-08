#!/usr/bin/env node
/**
 * Real Data Regression Harness
 *
 * Runs SimPilot ingestion against real-world Excel test data and produces
 * comprehensive reports on linking success, ambiguities, and failures.
 *
 * Usage:
 *   npm run real-data-regress
 *   npm run real-data-regress -- --strict
 *   npm run real-data-regress -- --uid --mutate-names
 *   npx tsx tools/realDataRegress.ts --strict
 *
 * Flags:
 *   --strict: Fail if ambiguous > 0 OR key errors > 0 OR unresolved links > 0
 *   --uid: Use UID-aware ingestion with diff tracking (default: false)
 *   --mutate-names: Mutate ~1-2% of identifiers to simulate data drift (requires --uid)
 */

import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join, basename, extname, relative } from 'path'
import { log } from './nodeLog'
import type { FileKind } from '../src/ingestion/sheetSniffer'
import { loadFile, ingestFilesOrdered, type HeadlessFile } from './headlessIngestion'
import { ingestFilesWithUid, type UidIngestionSummary } from './uidAwareIngestion'
import type { DiffResult } from '../src/domain/uidTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface DatasetConfig {
  name: string
  rootPath: string
}

export interface CategorizedFile {
  filePath: string
  fileName: string
  sourceType: FileKind
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface SheetCandidate {
  sheetName: string
  category: string
  score: number
  maxRow: number
  nameScore: number
  strongMatches: string[]
  weakMatches: string[]
}

export interface SheetDiagnostics {
  allSheets: Array<{ name: string; maxRow: number; maxCol: number }>
  chosenSheet: string | null
  chosenScore: number
  topCandidates: SheetCandidate[]
}

export interface FileIngestionResult {
  fileName: string
  filePath: string
  sourceType: FileKind
  detectedSheet?: string | null
  detectionScore?: number
  sheetDiagnostics?: SheetDiagnostics
  success: boolean
  error?: string
  rowsParsed: number
  keysGenerated: number
  keyDerivationErrors: number
  creates: number
  updates: number
  deletes: number
  renames: number
  ambiguous: number
  unresolvedLinks: number
  plantKey?: string
  modelKey?: string
  warnings: string[]
  diff?: DiffResult // NEW: Full diff tracking when using UID workflow
  categoryMetrics?: FileCategoryMetrics
}

export interface FileCategoryMetrics {
  simulationStatusRowsParsed: number
  toolListRowsParsed: number
  robotListRowsParsed: number
  assembliesRowsParsed: number
  totalRowsParsed: number
  mutationsApplied: number
}

export interface DatasetResult {
  datasetName: string
  startTime: string
  endTime: string
  duration: number
  files: FileIngestionResult[]
  summary: {
    totalFiles: number
    successfulFiles: number
    failedFiles: number
    totalRows: number
    simulationStatusRows: number
    toolListRows: number
    robotListRows: number
    assembliesRows: number
    totalCreates: number
    totalUpdates: number
    totalDeletes: number
    totalRenames: number
    totalAmbiguous: number
    totalKeyErrors: number
    totalUnresolvedLinks: number
  }
}

export interface RegressionReport {
  timestamp: string
  datasets: DatasetResult[]
  overallSummary: {
    totalDatasets: number
    totalFiles: number
    totalRows: number
    totalAmbiguous: number
    totalKeyErrors: number
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATASETS: DatasetConfig[] = [
  {
    name: 'BMW',
    rootPath: 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\BMW\\'
  },
  {
    name: 'J11006_TMS',
    rootPath: 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\J11006_TMS\\'
  },
  {
    name: 'V801',
    rootPath: 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\'
  }
]

const ARTIFACTS_DIR = join(process.cwd(), 'artifacts', 'real-data-regress')

// ============================================================================
// FILE DISCOVERY & CATEGORIZATION
// ============================================================================

/**
 * Recursively find all Excel files in a directory
 */
export function walkDirectory(rootPath: string): string[] {
  const results: string[] = []

  function walk(dirPath: string) {
    try {
      const entries = readdirSync(dirPath)

      for (const entry of entries) {
        const fullPath = join(dirPath, entry)

        try {
          const stat = statSync(fullPath)

          if (stat.isDirectory()) {
            walk(fullPath)
          } else if (stat.isFile()) {
            const ext = extname(entry).toLowerCase()
            if (ext === '.xlsx' || ext === '.xlsm' || ext === '.xls') {
              // Skip temp files
              if (!entry.startsWith('~$')) {
                results.push(fullPath)
              }
            }
          }
        } catch (err) {
          log.warn(`[walkDirectory] Cannot access ${fullPath}: ${err}`)
        }
      }
    } catch (err) {
      log.warn(`[walkDirectory] Cannot read directory ${dirPath}: ${err}`)
    }
  }

  walk(rootPath)
  return results
}

/**
 * Categorize a file by analyzing its filename
 *
 * Returns the most likely sourceType based on filename heuristics.
 * This is a fast pre-scan before full sheet sniffing.
 */
export function categorizeByFilename(fileName: string): CategorizedFile | null {
  const lower = fileName.toLowerCase()

  // Simulation Status
  if (lower.includes('simulation') && lower.includes('status')) {
    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'SimulationStatus',
      confidence: 'high',
      reason: 'Filename contains "simulation" and "status"'
    }
  }

  if (lower.includes('sim_status') || lower.includes('simstatus')) {
    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'SimulationStatus',
      confidence: 'high',
      reason: 'Filename pattern matches simulation status'
    }
  }

  // Robot List (check patterns that include "robot" but NOT equipment/tool contexts)
  if (lower.includes('robotlist') || lower.includes('robot_list')) {
    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'RobotList',
      confidence: 'high',
      reason: 'Filename pattern matches robot list'
    }
  }

  if (lower.includes('robot') && (lower.includes('list') || lower.includes('spec'))) {
    // Exception: "Robot Equipment List" is actually a tool list, not robot list
    if (lower.includes('equipment') || lower.includes('tool')) {
      // Fall through to tool detection
    } else {
      return {
        filePath: fileName,
        fileName: basename(fileName),
        sourceType: 'RobotList',
        confidence: 'high',
        reason: 'Filename contains "robot" and "list/spec"'
      }
    }
  }

  // Tool List (various patterns)
  const toolKeywords = ['tool', 'weld', 'gun', 'sealer', 'gripper', 'equipment']
  const toolMatches = toolKeywords.filter(kw => lower.includes(kw))

  if (toolMatches.length >= 1) {
    if (lower.includes('list') || lower.includes('wg') || lower.includes('riser')) {
      return {
        filePath: fileName,
        fileName: basename(fileName),
        sourceType: 'ToolList',
        confidence: 'high',
        reason: `Filename contains tool-related keywords: ${toolMatches.join(', ')}`
      }
    }

    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'ToolList',
      confidence: 'medium',
      reason: `Filename contains tool keywords: ${toolMatches.join(', ')}`
    }
  }

  // Assemblies List
  if (lower.includes('assemblies') || lower.includes('assembly')) {
    return {
      filePath: fileName,
      fileName: basename(fileName),
      sourceType: 'AssembliesList',
      confidence: 'high',
      reason: 'Filename contains "assemblies"'
    }
  }

  // Unknown - will need full sheet sniffing
  return {
    filePath: fileName,
    fileName: basename(fileName),
    sourceType: 'Unknown',
    confidence: 'low',
    reason: 'No clear filename pattern match'
  }
}

/**
 * Categorize all discovered files
 */
export function categorizeFiles(filePaths: string[]): CategorizedFile[] {
  return filePaths
    .map(filePath => categorizeByFilename(filePath))
    .filter((f): f is CategorizedFile => f !== null)
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Generate markdown summary report
 */
function generateMarkdownSummary(report: RegressionReport): string {
  const lines: string[] = []

  lines.push('# Real Data Regression Report')
  lines.push('')
  lines.push(`Generated: ${report.timestamp}`)
  lines.push('')
  lines.push('## Overall Summary')
  lines.push('')
  lines.push(`- **Total Datasets**: ${report.overallSummary.totalDatasets}`)
  lines.push(`- **Total Files**: ${report.overallSummary.totalFiles}`)
  lines.push(`- **Total Rows Parsed**: ${report.overallSummary.totalRows}`)
  lines.push(`- **Total Ambiguous Items**: ${report.overallSummary.totalAmbiguous}`)
  lines.push(`- **Total Key Errors**: ${report.overallSummary.totalKeyErrors}`)
  lines.push('')

  for (const dataset of report.datasets) {
    lines.push(`## Dataset: ${dataset.datasetName}`)
    lines.push('')
    lines.push(`- **Duration**: ${Math.round(dataset.duration)}ms`)
    lines.push(`- **Files Processed**: ${dataset.summary.totalFiles}`)
    lines.push(`- **Successful**: ${dataset.summary.successfulFiles}`)
    lines.push(`- **Failed**: ${dataset.summary.failedFiles}`)
    lines.push(`- **Total Rows**: ${dataset.summary.totalRows}`)
    lines.push('')
    lines.push('### Row Counts by Category')
    lines.push('')
    lines.push(`- Simulation Status: ${dataset.summary.simulationStatusRows}`)
    lines.push(`- Tool List: ${dataset.summary.toolListRows}`)
    lines.push(`- Robot List: ${dataset.summary.robotListRows}`)
    lines.push(`- Assemblies: ${dataset.summary.assembliesRows}`)
    lines.push('')
    lines.push('### Ingestion Results')
    lines.push('')
    lines.push(`- Creates: ${dataset.summary.totalCreates}`)
    lines.push(`- Updates: ${dataset.summary.totalUpdates}`)
    lines.push(`- Deletes: ${dataset.summary.totalDeletes}`)
    lines.push(`- Renames: ${dataset.summary.totalRenames}`)
    lines.push(`- **Ambiguous**: ${dataset.summary.totalAmbiguous}`)
    lines.push(`- **Key Derivation Errors**: ${dataset.summary.totalKeyErrors}`)
    lines.push(`- **Unresolved Links**: ${dataset.summary.totalUnresolvedLinks}`)
    lines.push('')
    lines.push('### Files')
    lines.push('')
    lines.push('| File | Type | Sheet | Rows | Mutations | Creates | Updates | Deletes | Renames | Ambiguous | Status |')
    lines.push('|------|------|-------|------|-----------|---------|---------|---------|---------|-----------|--------|')

    for (const file of dataset.files) {
      const status = file.success ? '✓' : '✗'
      const statusText = file.success ? 'OK' : file.error || 'FAILED'
      const sheetName = file.detectedSheet || 'N/A'
      const mutations = file.categoryMetrics?.mutationsApplied || 0
      lines.push(
        `| ${file.fileName} | ${file.sourceType} | ${sheetName} | ${file.rowsParsed} | ${mutations} | ` +
        `${file.creates} | ${file.updates} | ${file.deletes} | ${file.renames} | ${file.ambiguous} | ${status} ${statusText} |`
      )
    }

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Save artifacts to disk
 */
function saveArtifacts(report: RegressionReport): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const runDir = join(ARTIFACTS_DIR, timestamp)

  // Create directory
  mkdirSync(runDir, { recursive: true })

  // Write JSON report
  const jsonPath = join(runDir, 'summary.json')
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')

  // Write Markdown summary
  const mdPath = join(runDir, 'summary.md')
  const markdown = generateMarkdownSummary(report)
  writeFileSync(mdPath, markdown, 'utf-8')

  // Write per-file diagnostics for files with sheet detection info
  let diagnosticFileCount = 0
  for (const dataset of report.datasets) {
    for (const file of dataset.files) {
      if (file.sheetDiagnostics) {
        const safeFileName = file.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')
        const diagnosticDir = join(runDir, 'diagnostics', dataset.datasetName)
        mkdirSync(diagnosticDir, { recursive: true })

        const diagnosticPath = join(diagnosticDir, `${safeFileName}.json`)
        const diagnosticData = {
          fileName: file.fileName,
          filePath: file.filePath,
          sourceType: file.sourceType,
          detectedSheet: file.detectedSheet,
          detectionScore: file.detectionScore,
          success: file.success,
          error: file.error,
          sheetDiagnostics: file.sheetDiagnostics
        }

        writeFileSync(diagnosticPath, JSON.stringify(diagnosticData, null, 2), 'utf-8')
        diagnosticFileCount++
      }
    }
  }

  // Write per-file stats for UID mode (includes category metrics and diff counts)
  let perFileStatsCount = 0
  for (const dataset of report.datasets) {
    for (const file of dataset.files) {
      if (file.categoryMetrics) {
        const safeFileName = file.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')
        const perFileDir = join(runDir, 'per-file', dataset.datasetName)
        mkdirSync(perFileDir, { recursive: true })

        const perFilePath = join(perFileDir, `${safeFileName}.json`)
        const perFileData = {
          dataset: dataset.datasetName,
          fileName: file.fileName,
          filePath: file.filePath,
          fileCategory: file.sourceType,
          chosenSheetName: file.detectedSheet || null,
          detectionScore: file.detectionScore || 0,
          metrics: file.categoryMetrics,
          diffCounts: {
            creates: file.creates,
            updates: file.updates,
            deletes: file.deletes,
            renames: file.renames,
            ambiguous: file.ambiguous
          },
          success: file.success,
          error: file.error,
          warnings: file.warnings
        }

        writeFileSync(perFilePath, JSON.stringify(perFileData, null, 2), 'utf-8')
        perFileStatsCount++
      }
    }
  }

  // Write ambiguity bundles if any ambiguous items exist
  let ambiguityFileCount = 0
  for (const dataset of report.datasets) {
    const datasetAmbiguous = dataset.files
      .filter(f => f.diff && f.diff.ambiguous && f.diff.ambiguous.length > 0)

    if (datasetAmbiguous.length > 0) {
      const ambiguityDir = join(runDir, 'ambiguity', dataset.datasetName)
      mkdirSync(ambiguityDir, { recursive: true })

      for (const file of datasetAmbiguous) {
        const safeFileName = file.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')
        const ambiguityPath = join(ambiguityDir, `${safeFileName}_ambiguity.json`)

        const ambiguityData = {
          fileName: file.fileName,
          filePath: file.filePath,
          ambiguousItems: file.diff!.ambiguous,
          totalAmbiguous: file.diff!.ambiguous.length
        }

        writeFileSync(ambiguityPath, JSON.stringify(ambiguityData, null, 2), 'utf-8')
        ambiguityFileCount++
      }
    }
  }

  log.info(`[Artifacts] Saved to ${runDir}`)
  log.info(`  - summary.json`)
  log.info(`  - summary.md`)
  log.info(`  - ${diagnosticFileCount} diagnostic files`)
  if (perFileStatsCount > 0) {
    log.info(`  - ${perFileStatsCount} per-file stats`)
  }
  if (ambiguityFileCount > 0) {
    log.info(`  - ${ambiguityFileCount} ambiguity bundle files`)
  }

  return runDir
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main(options: { useUid?: boolean; mutateNames?: boolean } = {}) {
  log.info('=== Real Data Regression Harness ===')
  log.info('')

  const report: RegressionReport = {
    timestamp: new Date().toISOString(),
    datasets: [],
    overallSummary: {
      totalDatasets: 0,
      totalFiles: 0,
      totalRows: 0,
      totalAmbiguous: 0,
      totalKeyErrors: 0
    }
  }

  // Process each dataset
  for (const dataset of DATASETS) {
    log.info(`[Dataset] Processing: ${dataset.name}`)
    log.info(`[Dataset] Root: ${dataset.rootPath}`)

    const startTime = Date.now()

    try {
      // Discover files
      log.info(`[Dataset] Discovering Excel files...`)
      const files = walkDirectory(dataset.rootPath)
      log.info(`[Dataset] Found ${files.length} Excel files`)

      // Categorize files
      log.info(`[Dataset] Categorizing files...`)
      const categorized = categorizeFiles(files)

      const simFiles = categorized.filter(f => f.sourceType === 'SimulationStatus')
      const robotFiles = categorized.filter(f => f.sourceType === 'RobotList')
      const toolFiles = categorized.filter(f => f.sourceType === 'ToolList')
      const assemblyFiles = categorized.filter(f => f.sourceType === 'AssembliesList')
      const unknownFiles = categorized.filter(f => f.sourceType === 'Unknown')

      log.info(`[Dataset] Categorization results:`)
      log.info(`  - Simulation Status: ${simFiles.length}`)
      log.info(`  - Robot List: ${robotFiles.length}`)
      log.info(`  - Tool List: ${toolFiles.length}`)
      log.info(`  - Assemblies List: ${assemblyFiles.length}`)
      log.info(`  - Unknown: ${unknownFiles.length}`)

      // Load files into memory
      log.info(`[Dataset] Loading files into memory...`)
      const headlessFiles: HeadlessFile[] = []
      for (const cat of categorized) {
        try {
          const headlessFile = loadFile(cat.filePath)
          headlessFiles.push(headlessFile)
        } catch (err) {
          log.warn(`[Dataset] Failed to load ${cat.fileName}: ${err}`)
        }
      }

      // Run ingestion
      log.info(`[Dataset] Running ingestion on ${headlessFiles.length} files...`)

      // Choose ingestion mode based on flags
      let fileResults: FileIngestionResult[]
      if (options.useUid) {
        // Use UID-aware ingestion with diff tracking
        const uidResult = await ingestFilesWithUid(headlessFiles, {
          plantKey: 'PLANT_TEST',
          mutateNames: options.mutateNames || false
        })

        // Process UID results
        fileResults = uidResult.results.map(result => {
          const totalRowsParsed =
            result.simulationStatusRowsParsed +
            result.toolListRowsParsed +
            result.robotListRowsParsed +
            result.assembliesRowsParsed
          const keysGenerated = result.stationRecords.length + result.toolRecords.length + result.robotRecords.length

          return {
            fileName: result.fileName,
            filePath: result.filePath,
            sourceType: 'Unknown' as FileKind,
            detectedSheet: null,
            detectionScore: 0,
            success: result.success,
            error: result.error,
            rowsParsed: totalRowsParsed,
            keysGenerated,
            keyDerivationErrors: 0, // UID mode doesn't track this separately
            creates: result.diff?.creates.length || 0,
            updates: result.diff?.updates.length || 0,
            deletes: result.diff?.deletes.length || 0,
            renames: result.diff?.renamesOrMoves.length || 0,
            ambiguous: result.diff?.ambiguous.length || 0,
            unresolvedLinks: 0, // UID mode handles this differently
            warnings: result.warnings,
            diff: result.diff,
            categoryMetrics: {
              simulationStatusRowsParsed: result.simulationStatusRowsParsed,
              toolListRowsParsed: result.toolListRowsParsed,
              robotListRowsParsed: result.robotListRowsParsed,
              assembliesRowsParsed: result.assembliesRowsParsed,
              totalRowsParsed,
              mutationsApplied: result.mutationsApplied || 0
            }
          }
        })

        if (options.mutateNames) {
          const totalMutations = uidResult.summary.totalMutations || 0
          log.info(`[Dataset] Applied ${totalMutations} identifier mutations`)
        }
      } else {
        // Use legacy ingestion
        const ingestionResult = await ingestFilesOrdered(headlessFiles)

        fileResults = ingestionResult.results.map(result => {
          const rowsParsed = result.applyResult
            ? result.applyResult.projects.length +
              result.applyResult.areas.length +
              result.applyResult.cells.length +
              result.applyResult.tools.length +
              result.applyResult.robots.length
            : 0

          const keysGenerated = result.applyResult
            ? result.applyResult.cells.length +
              result.applyResult.tools.length +
              result.applyResult.robots.length
            : 0

          // Count key derivation errors (warnings about missing columns, invalid keys)
          const keyErrors = result.warnings.filter(w =>
            w.includes('MISSING_COLUMNS') ||
            w.includes('key') ||
            w.includes('derive') ||
            w.includes('invalid')
          ).length

          // Count unresolved links (warnings about failed asset linking)
          const unresolvedLinks = result.warnings.filter(w =>
            w.includes('link') ||
            w.includes('reference') ||
            w.includes('not found')
          ).length

          return {
            fileName: result.fileName,
            filePath: result.filePath,
            sourceType: result.detectedType,
            detectedSheet: result.detectedSheet,
            detectionScore: result.detectionScore,
            sheetDiagnostics: result.sheetDiagnostics,
            success: result.success,
            error: result.error,
            rowsParsed,
            keysGenerated,
            keyDerivationErrors: keyErrors,
            creates: 0,
            updates: 0,
            deletes: 0,
            renames: 0,
            ambiguous: 0,
            unresolvedLinks,
            warnings: result.warnings
          }
        })
      }

      log.info(`[Dataset] Ingestion complete:`)
      log.info(`  - Total rows parsed: ${fileResults.reduce((sum, f) => sum + f.rowsParsed, 0)}`)
      log.info(`  - Total keys generated: ${fileResults.reduce((sum, f) => sum + f.keysGenerated, 0)}`)
      log.info(`  - Total key errors: ${fileResults.reduce((sum, f) => sum + f.keyDerivationErrors, 0)}`)
      log.info(`  - Total unresolved links: ${fileResults.reduce((sum, f) => sum + f.unresolvedLinks, 0)}`)

      const endTime = Date.now()

      const datasetResult: DatasetResult = {
        datasetName: dataset.name,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        files: fileResults,
        summary: {
          totalFiles: fileResults.length,
          successfulFiles: fileResults.filter(f => f.success).length,
          failedFiles: fileResults.filter(f => !f.success).length,
          totalRows: fileResults.reduce((sum, f) => sum + f.rowsParsed, 0),
          simulationStatusRows: fileResults.reduce((sum, f) => sum + (f.categoryMetrics?.simulationStatusRowsParsed || 0), 0),
          toolListRows: fileResults.reduce((sum, f) => sum + (f.categoryMetrics?.toolListRowsParsed || 0), 0),
          robotListRows: fileResults.reduce((sum, f) => sum + (f.categoryMetrics?.robotListRowsParsed || 0), 0),
          assembliesRows: fileResults.reduce((sum, f) => sum + (f.categoryMetrics?.assembliesRowsParsed || 0), 0),
          totalCreates: fileResults.reduce((sum, f) => sum + f.creates, 0),
          totalUpdates: fileResults.reduce((sum, f) => sum + f.updates, 0),
          totalDeletes: fileResults.reduce((sum, f) => sum + f.deletes, 0),
          totalRenames: fileResults.reduce((sum, f) => sum + f.renames, 0),
          totalAmbiguous: fileResults.reduce((sum, f) => sum + f.ambiguous, 0),
          totalKeyErrors: fileResults.reduce((sum, f) => sum + f.keyDerivationErrors, 0),
          totalUnresolvedLinks: fileResults.reduce((sum, f) => sum + f.unresolvedLinks, 0)
        }
      }

      report.datasets.push(datasetResult)

      log.info(`[Dataset] Completed ${dataset.name} in ${Math.round(datasetResult.duration)}ms`)
      log.info('')
    } catch (err) {
      log.error(`[Dataset] Failed to process ${dataset.name}: ${err}`)
    }
  }

  // Calculate overall summary
  report.overallSummary = {
    totalDatasets: report.datasets.length,
    totalFiles: report.datasets.reduce((sum, d) => sum + d.summary.totalFiles, 0),
    totalRows: report.datasets.reduce((sum, d) => sum + d.summary.totalRows, 0),
    totalAmbiguous: report.datasets.reduce((sum, d) => sum + d.summary.totalAmbiguous, 0),
    totalKeyErrors: report.datasets.reduce((sum, d) => sum + d.summary.totalKeyErrors, 0)
  }

  // Save artifacts
  const artifactsPath = saveArtifacts(report)

  log.info('=== Regression Complete ===')
  log.info('')
  log.info('Summary:')
  log.info(`  Total Datasets: ${report.overallSummary.totalDatasets}`)
  log.info(`  Total Files: ${report.overallSummary.totalFiles}`)
  log.info(`  Total Rows: ${report.overallSummary.totalRows}`)
  log.info(`  Total Ambiguous: ${report.overallSummary.totalAmbiguous}`)
  log.info(`  Total Key Errors: ${report.overallSummary.totalKeyErrors}`)
  log.info('')
  log.info(`Artifacts saved to: ${artifactsPath}`)

  // Return report for strict mode check
  return report
}

// Run if executed directly
// Check if this is the main module by comparing the executed file path
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('realDataRegress.ts') ||
  process.argv[1].endsWith('realDataRegress.js')
)

if (isMainModule) {
  // Parse CLI flags
  const args = process.argv.slice(2)
  const strictMode = args.includes('--strict')
  const useUid = args.includes('--uid')
  const mutateNames = args.includes('--mutate-names')

  if (mutateNames && !useUid) {
    log.error('[ERROR] --mutate-names requires --uid flag')
    process.exit(1)
  }

  if (strictMode) {
    log.info('[Strict Mode] Enabled - will fail if ambiguous > 0 OR key errors > 0 OR unresolved links > 0')
  }

  if (useUid) {
    log.info('[UID Mode] Enabled - using UID-aware ingestion with diff tracking')
  }

  if (mutateNames) {
    log.info('[Mutate Names] Enabled - will mutate ~1-2% of identifiers to simulate data drift')
  }

  main({ useUid, mutateNames }).then(report => {
    if (strictMode) {
      const totalAmbiguous = report.overallSummary.totalAmbiguous
      const totalKeyErrors = report.overallSummary.totalKeyErrors

      // Calculate total unresolved links
      const totalUnresolvedLinks = report.datasets.reduce(
        (sum, d) => sum + d.summary.totalUnresolvedLinks,
        0
      )

      if (totalAmbiguous > 0 || totalKeyErrors > 0 || totalUnresolvedLinks > 0) {
        log.error('')
        log.error('[Strict Mode] FAILED:')
        if (totalAmbiguous > 0) {
          log.error(`  - Total Ambiguous: ${totalAmbiguous} (threshold: 0)`)
        }
        if (totalKeyErrors > 0) {
          log.error(`  - Total Key Errors: ${totalKeyErrors} (threshold: 0)`)
        }
        if (totalUnresolvedLinks > 0) {
          log.error(`  - Total Unresolved Links: ${totalUnresolvedLinks} (threshold: 0)`)
        }
        log.error('')
        process.exit(1)
      } else {
        log.info('')
        log.info('[Strict Mode] PASSED ✓')
        log.info('')
      }
    }
  }).catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
