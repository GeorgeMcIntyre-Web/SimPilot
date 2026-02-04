import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { log } from './nodeLog'
import { ARTIFACTS_DIR } from './realDataRegress.config'
import type { RegressionReport } from './realDataRegress.types'

export function generateMarkdownSummary(report: RegressionReport): string {
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

export function saveArtifacts(report: RegressionReport): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const runDir = join(ARTIFACTS_DIR, timestamp)

  mkdirSync(runDir, { recursive: true })

  const jsonPath = join(runDir, 'summary.json')
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')

  const mdPath = join(runDir, 'summary.md')
  const markdown = generateMarkdownSummary(report)
  writeFileSync(mdPath, markdown, 'utf-8')

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

  let ambiguityFileCount = 0
  for (const dataset of report.datasets) {
    const ambiguityDir = join(runDir, 'ambiguity', dataset.datasetName)
    mkdirSync(ambiguityDir, { recursive: true })

    const datasetAmbiguous = dataset.files.filter(f => f.diff && f.diff.ambiguous && f.diff.ambiguous.length > 0)
    const totalAmbiguous = datasetAmbiguous.reduce((sum, f) => sum + f.ambiguous, 0)

    const indexPath = join(ambiguityDir, 'index.json')
    const indexData: any = {
      totalAmbiguous,
      datasetName: dataset.datasetName,
      timestamp: report.timestamp,
      files: dataset.files.map(f => ({
        fileName: f.fileName,
        filePath: f.filePath,
        ambiguousCount: f.ambiguous
      }))
    }

    if (totalAmbiguous === 0) {
      indexData.explanation = 'No ambiguous matches produced. Possible reasons: insufficient mutation rate, no collision zones in existing data, or all keys resolved cleanly.'
    }

    writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8')

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

  log.info(`[Artifacts] Saved to ${runDir}`)
  log.info(`  - summary.json`)
  log.info(`  - summary.md`)
  log.info(`  - ${diagnosticFileCount} diagnostic files`)
  if (perFileStatsCount > 0) {
    log.info(`  - ${perFileStatsCount} per-file stats`)
  }
  log.info(`  - ${report.datasets.length} ambiguity index files (always created)`) // one per dataset
  if (ambiguityFileCount > 0) {
    log.info(`  - ${ambiguityFileCount} ambiguity bundle files`)
  }

  return runDir
}
