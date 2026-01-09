/**
 * Unit tests for regression report shape
 *
 * Ensures the JSON output has a stable, predictable structure
 */

import { describe, it, expect } from 'vitest'
import type {
  DatasetResult,
  FileIngestionResult,
  RegressionReport
} from '../realDataRegress'

describe('RegressionReport shape', () => {
  it('should have expected top-level structure', () => {
    const report: RegressionReport = {
      timestamp: '2026-01-07T12:00:00.000Z',
      datasets: [],
      overallSummary: {
        totalDatasets: 0,
        totalFiles: 0,
        totalRows: 0,
        totalAmbiguous: 0,
        totalKeyErrors: 0
      }
    }

    expect(report).toHaveProperty('timestamp')
    expect(report).toHaveProperty('datasets')
    expect(report).toHaveProperty('overallSummary')
    expect(Array.isArray(report.datasets)).toBe(true)
    expect(typeof report.overallSummary).toBe('object')
  })

  it('should have correct overallSummary fields', () => {
    const summary = {
      totalDatasets: 3,
      totalFiles: 51,
      totalRows: 1234,
      totalAmbiguous: 12,
      totalKeyErrors: 5
    }

    expect(summary).toHaveProperty('totalDatasets')
    expect(summary).toHaveProperty('totalFiles')
    expect(summary).toHaveProperty('totalRows')
    expect(summary).toHaveProperty('totalAmbiguous')
    expect(summary).toHaveProperty('totalKeyErrors')

    expect(typeof summary.totalDatasets).toBe('number')
    expect(typeof summary.totalFiles).toBe('number')
    expect(typeof summary.totalRows).toBe('number')
    expect(typeof summary.totalAmbiguous).toBe('number')
    expect(typeof summary.totalKeyErrors).toBe('number')
  })

  it('should have correct DatasetResult structure', () => {
    const dataset: DatasetResult = {
      datasetName: 'BMW',
      startTime: '2026-01-07T12:00:00.000Z',
      endTime: '2026-01-07T12:05:00.000Z',
      duration: 300000,
      files: [],
      summary: {
        totalFiles: 15,
        successfulFiles: 10,
        failedFiles: 5,
        totalRows: 500,
        totalCreates: 100,
        totalUpdates: 50,
        totalDeletes: 10,
        totalRenames: 5,
        totalAmbiguous: 8,
        totalKeyErrors: 2,
        totalUnresolvedLinks: 3
      }
    }

    expect(dataset).toHaveProperty('datasetName')
    expect(dataset).toHaveProperty('startTime')
    expect(dataset).toHaveProperty('endTime')
    expect(dataset).toHaveProperty('duration')
    expect(dataset).toHaveProperty('files')
    expect(dataset).toHaveProperty('summary')

    expect(typeof dataset.datasetName).toBe('string')
    expect(typeof dataset.duration).toBe('number')
    expect(Array.isArray(dataset.files)).toBe(true)
  })

  it('should have correct FileIngestionResult structure', () => {
    const fileResult: FileIngestionResult = {
      fileName: 'test.xlsx',
      filePath: '/path/to/test.xlsx',
      sourceType: 'ToolList',
      success: true,
      rowsParsed: 100,
      keysGenerated: 95,
      keyDerivationErrors: 2,
      creates: 50,
      updates: 40,
      deletes: 5,
      renames: 0,
      ambiguous: 3,
      unresolvedLinks: 1,
      warnings: ['Warning 1', 'Warning 2']
    }

    expect(fileResult).toHaveProperty('fileName')
    expect(fileResult).toHaveProperty('filePath')
    expect(fileResult).toHaveProperty('sourceType')
    expect(fileResult).toHaveProperty('success')
    expect(fileResult).toHaveProperty('rowsParsed')
    expect(fileResult).toHaveProperty('keysGenerated')
    expect(fileResult).toHaveProperty('keyDerivationErrors')
    expect(fileResult).toHaveProperty('creates')
    expect(fileResult).toHaveProperty('updates')
    expect(fileResult).toHaveProperty('deletes')
    expect(fileResult).toHaveProperty('renames')
    expect(fileResult).toHaveProperty('ambiguous')
    expect(fileResult).toHaveProperty('unresolvedLinks')
    expect(fileResult).toHaveProperty('warnings')

    expect(typeof fileResult.success).toBe('boolean')
    expect(typeof fileResult.rowsParsed).toBe('number')
    expect(Array.isArray(fileResult.warnings)).toBe(true)
  })

  it('should have error field when success is false', () => {
    const failedResult: FileIngestionResult = {
      fileName: 'failed.xlsx',
      filePath: '/path/to/failed.xlsx',
      sourceType: 'Unknown',
      success: false,
      error: 'Could not parse file',
      rowsParsed: 0,
      keysGenerated: 0,
      keyDerivationErrors: 0,
      creates: 0,
      updates: 0,
      deletes: 0,
      renames: 0,
      ambiguous: 0,
      unresolvedLinks: 0,
      warnings: []
    }

    expect(failedResult.success).toBe(false)
    expect(failedResult).toHaveProperty('error')
    expect(typeof failedResult.error).toBe('string')
  })
})
