#!/usr/bin/env node
/**
 * Real Data Regression Harness
 * Thin orchestrator that wires together discovery, categorization, ingestion,
 * reporting, and CLI flag handling. Heavy lifting lives in sibling modules.
 */

import { log } from './nodeLog'
import { DATASETS } from './realDataRegress.config'
import { saveArtifacts } from './realDataRegress.reporting'
import { runDataset } from './realDataRegress.ingestion'
import type { RegressionReport, IngestionOptions } from './realDataRegress.types'

export type { DatasetResult, FileIngestionResult, RegressionReport, IngestionOptions } from './realDataRegress.types'
export { categorizeByFilename, categorizeFiles, walkDirectory } from './realDataRegress.categorize'

async function main(options: IngestionOptions = {}): Promise<RegressionReport> {
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

  for (const dataset of DATASETS) {
    try {
      const datasetResult = await runDataset(dataset, options)
      report.datasets.push(datasetResult)
    } catch (err) {
      log.error(`[Dataset] Failed to process ${dataset.name}: ${err}`)
    }
  }

  report.overallSummary = {
    totalDatasets: report.datasets.length,
    totalFiles: report.datasets.reduce((sum, d) => sum + d.summary.totalFiles, 0),
    totalRows: report.datasets.reduce((sum, d) => sum + d.summary.totalRows, 0),
    totalAmbiguous: report.datasets.reduce((sum, d) => sum + d.summary.totalAmbiguous, 0),
    totalKeyErrors: report.datasets.reduce((sum, d) => sum + d.summary.totalKeyErrors, 0)
  }

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

  return report
}

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('realDataRegress.ts') ||
  process.argv[1].endsWith('realDataRegress.js')
)

if (isMainModule) {
  const args = process.argv.slice(2)
  const strictMode = args.includes('--strict')
  const useUid = args.includes('--uid')
  const mutateNames = args.includes('--mutate-names')
  const mutateAmbiguity = args.includes('--mutate-ambiguity')

  const seedArg = args.find(arg => arg.startsWith('--seed='))
  const seed = seedArg ? parseInt(seedArg.split('=')[1], 10) : 1

  const targetArg = args.find(arg => arg.startsWith('--mutate-ambiguity-target='))
  const ambiguityTarget = targetArg ? parseInt(targetArg.split('=')[1], 10) : 5

  if (mutateNames && !useUid) {
    log.error('[ERROR] --mutate-names requires --uid flag')
    process.exit(1)
  }

  if (mutateAmbiguity && !useUid) {
    log.error('[ERROR] --mutate-ambiguity requires --uid flag')
    process.exit(1)
  }

  if (mutateNames && mutateAmbiguity) {
    log.error('[ERROR] --mutate-names and --mutate-ambiguity are mutually exclusive (choose one)')
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

  if (mutateAmbiguity) {
    log.info(`[Mutate Ambiguity] Enabled - targeting ${ambiguityTarget} ambiguous items per dataset (seed: ${seed})`)
  }

  main({ useUid, mutateNames, mutateAmbiguity, seed, ambiguityTarget }).then(report => {
    if (!strictMode) return

    const totalAmbiguous = report.overallSummary.totalAmbiguous
    const totalKeyErrors = report.overallSummary.totalKeyErrors
    const totalUnresolvedLinks = report.datasets.reduce((sum, d) => sum + d.summary.totalUnresolvedLinks, 0)

    if (totalAmbiguous > 0 || totalKeyErrors > 0 || totalUnresolvedLinks > 0) {
      log.error('')
      log.error('[Strict Mode] FAILED:')
      if (totalAmbiguous > 0) log.error(`  - Total Ambiguous: ${totalAmbiguous} (threshold: 0)`)
      if (totalKeyErrors > 0) log.error(`  - Total Key Errors: ${totalKeyErrors} (threshold: 0)`)
      if (totalUnresolvedLinks > 0) log.error(`  - Total Unresolved Links: ${totalUnresolvedLinks} (threshold: 0)`)
      log.error('')
      process.exit(1)
    }

    log.info('')
    log.info('[Strict Mode] PASSED ✓')
    log.info('')
  }).catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
