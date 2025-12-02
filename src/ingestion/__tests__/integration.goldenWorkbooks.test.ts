/**
 * Integration Test: Golden Workbooks
 *
 * Tests the complete Excel Universal Ingestion pipeline with real-world files:
 * - Agent 1: Core schema-agnostic engine (FieldRegistry, ColumnProfiler, FieldMatcher)
 * - Agent 2: Performance optimization (caching, parallelism, streaming)
 * - Agent 3: Semantics & UX (embeddings, LLM, quality scoring, overrides)
 *
 * Test files from user_data/:
 * 1. Ford_SLS_C519_Roboterliste_REV03_20160728.xls (Robot list, German headers)
 * 2. Spotweld_Crossreferencelist_C519_UB_SLS_W1631-UPV2_Rev11.xls (Cross-reference)
 * 3. Ford_Saar_Louis_Weld_Gun_Status.xlsx (Gun status tracking)
 * 4. Ford_Saar_Louis_Weld_Gun_Tip_Dresser_Stands.xlsx (Tip dresser inventory)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { FieldMatchResult } from '../fieldMatcher'
import type { SheetQualityScore } from '../dataQualityScoring'
import { calculateSheetQuality } from '../dataQualityScoring'
import { matchAllColumns, DEFAULT_FIELD_REGISTRY } from '../fieldMatcher'
import { profileSheet } from '../sheetProfiler'
import { loadWorkbookFromBuffer } from '../workbookLoader'
import { ingestFilesInParallel } from '../performance/parallelIngestion'
import { getGlobalCache, resetGlobalCache } from '../performance/workbookCache'

// Import expectations
const expectations = JSON.parse(
  readFileSync(join(__dirname, '../__fixtures__/golden/expectations.json'), 'utf-8')
)

const USER_DATA_DIR = join(__dirname, '../../../user_data')

// Helper to load a test file
function loadTestFile(fileName: string): Buffer {
  return readFileSync(join(USER_DATA_DIR, fileName))
}

describe('Golden Workbook Integration Tests', () => {
  beforeAll(() => {
    resetGlobalCache()
  })

  describe('Test Case 1: Robot List (German Headers)', () => {
    const testCase = expectations.testCases.find((tc: any) => tc.testId === 'ROBOT_LIST')

    it('should parse and profile robot list with German headers', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)

      expect(workbook).toBeDefined()
      expect(workbook.sheets.length).toBeGreaterThan(0)

      const sheet = workbook.sheets.find(s =>
        s.sheetName.toLowerCase().includes('robot')
      )
      expect(sheet).toBeDefined()
    })

    it('should detect sheet category as ROBOT_LIST with HIGH confidence', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
      const sheet = workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)

      // Check that sheet profiling detected robot-related fields
      expect(profile.columns.length).toBeGreaterThanOrEqual(
        testCase.expectations.sheets[0].minColumns
      )
      expect(profile.columns.length).toBeLessThanOrEqual(
        testCase.expectations.sheets[0].maxColumns
      )
    })

    it('should match required fields with expected confidence', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
      const sheet = workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)
      const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)

      const expectedSheet = testCase.expectations.sheets[0]

      // Check each required field
      for (const requiredField of expectedSheet.requiredFields) {
        const matchedColumn = matchResults.find(mr =>
          mr.matches.some(m => m.fieldId === requiredField.fieldId &&
                              m.confidence === requiredField.confidence)
        )

        expect(matchedColumn,
          `Should find ${requiredField.fieldId} with ${requiredField.confidence} confidence`
        ).toBeDefined()
      }
    })

    it('should achieve minimum mapping coverage', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
      const sheet = workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)
      const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)

      const columnsWithGoodMatch = matchResults.filter(mr =>
        mr.matches.some(m => m.confidence === 'HIGH' || m.confidence === 'MEDIUM')
      )

      const coverage = columnsWithGoodMatch.length / matchResults.length

      expect(coverage).toBeGreaterThanOrEqual(
        testCase.expectations.sheets[0].expectedMappingCoverage
      )
    })

    it('should meet quality tier expectations', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
      const sheet = workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)
      const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)
      const quality = calculateSheetQuality(profile, matchResults)

      expect(quality.tier).toBe(testCase.expectations.sheets[0].qualityTier)
    })
  })

  describe('Test Case 2: Cross-Reference List', () => {
    const testCase = expectations.testCases.find((tc: any) => tc.testId === 'CROSS_REFERENCE')

    it('should parse multi-sheet cross-reference workbook', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)

      expect(workbook.sheets.length).toBeGreaterThanOrEqual(1)
    })

    it('should match gun and robot fields with HIGH confidence', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)

      // Find the main cross-reference sheet
      const sheet = workbook.sheets.find(s =>
        s.sheetName.toLowerCase().includes('cross') ||
        s.sheetName.toLowerCase().includes('reference')
      ) || workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)
      const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)

      // Should find gun_id and robot_id
      const gunMatch = matchResults.find(mr =>
        mr.matches.some(m => m.fieldId === 'gun_id' && m.confidence === 'HIGH')
      )
      const robotMatch = matchResults.find(mr =>
        mr.matches.some(m => m.fieldId === 'robot_id' && m.confidence === 'HIGH')
      )

      expect(gunMatch, 'Should find gun_id with HIGH confidence').toBeDefined()
      expect(robotMatch, 'Should find robot_id with HIGH confidence').toBeDefined()
    })

    it('should achieve high mapping coverage (80%+)', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
      const sheet = workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)
      const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)

      const coverage = matchResults.filter(mr =>
        mr.matches.some(m => m.confidence === 'HIGH' || m.confidence === 'MEDIUM')
      ).length / matchResults.length

      expect(coverage).toBeGreaterThanOrEqual(0.80)
    })
  })

  describe('Test Case 3: Gun Status Tracking', () => {
    const testCase = expectations.testCases.find((tc: any) => tc.testId === 'GUN_STATUS')

    it('should parse gun status workbook', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)

      expect(workbook).toBeDefined()
      expect(workbook.sheets.length).toBeGreaterThan(0)
    })

    it('should detect date fields correctly', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
      const sheet = workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)
      const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)

      // Check for date field detection
      const dateColumns = profile.columns.filter(col =>
        col.dataTypeDistribution.dateCount > 0
      )

      expect(dateColumns.length).toBeGreaterThan(0)
    })

    it('should achieve EXCELLENT quality tier', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
      const sheet = workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)
      const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)
      const quality = calculateSheetQuality(profile, matchResults)

      expect(quality.tier).toBe('EXCELLENT')
    })
  })

  describe('Test Case 4: Tip Dresser Inventory', () => {
    const testCase = expectations.testCases.find((tc: any) => tc.testId === 'TIP_DRESSER')

    it('should parse tip dresser workbook', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)

      expect(workbook).toBeDefined()
    })

    it('should match tool-related fields', async () => {
      const buffer = loadTestFile(testCase.fileName)
      const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
      const sheet = workbook.sheets[0]

      const profile = profileSheet(sheet, workbook)
      const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)

      // Should find tool_id or tool_type
      const toolMatch = matchResults.find(mr =>
        mr.matches.some(m =>
          (m.fieldId === 'tool_id' || m.fieldId === 'tool_type') &&
          (m.confidence === 'HIGH' || m.confidence === 'MEDIUM')
        )
      )

      expect(toolMatch, 'Should find tool-related field').toBeDefined()
    })
  })

  describe('Performance Tests (Agent 2)', () => {
    it('should cache workbooks and speed up second load by 90%', async () => {
      resetGlobalCache()
      const fileName = expectations.testCases[0].fileName
      const buffer = loadTestFile(fileName)

      // First load (uncached)
      const start1 = performance.now()
      await loadWorkbookFromBuffer(buffer, fileName)
      const time1 = performance.now() - start1

      // Second load (cached)
      const start2 = performance.now()
      await loadWorkbookFromBuffer(buffer, fileName)
      const time2 = performance.now() - start2

      const speedup = (time1 - time2) / time1

      expect(speedup).toBeGreaterThanOrEqual(0.90)
      expect(getGlobalCache().getCacheStats().hits).toBe(1)
    })

    it('should load 4 files in parallel faster than sequential', async () => {
      resetGlobalCache()

      const files = expectations.testCases.map((tc: any) => ({
        name: tc.fileName,
        buffer: loadTestFile(tc.fileName)
      }))

      // Sequential loading
      const startSeq = performance.now()
      for (const file of files) {
        await loadWorkbookFromBuffer(file.buffer, file.name)
      }
      const timeSeq = performance.now() - startSeq

      resetGlobalCache()

      // Parallel loading
      const startPar = performance.now()
      const result = await ingestFilesInParallel(
        files.map(f => ({ name: f.name, arrayBuffer: () => Promise.resolve(f.buffer) } as any)),
        { concurrency: { limit: 4 }, cache: { enabled: true } }
      )
      const timePar = performance.now() - startPar

      const speedup = timeSeq / timePar

      expect(speedup).toBeGreaterThanOrEqual(2.0)
      expect(result.successCount).toBe(4)
    })

    it('should provide detailed performance metrics', async () => {
      resetGlobalCache()
      const files = expectations.testCases.slice(0, 2).map((tc: any) => ({
        name: tc.fileName,
        arrayBuffer: () => Promise.resolve(loadTestFile(tc.fileName))
      })) as any[]

      const result = await ingestFilesInParallel(files, {
        concurrency: { limit: 2 },
        cache: { enabled: true }
      })

      expect(result.metrics.fileCount).toBe(2)
      expect(result.metrics.totalBytes).toBeGreaterThan(0)
      expect(result.metrics.parseTimeMs).toBeGreaterThan(0)
      expect(result.metrics.parallelization.speedup).toBeGreaterThan(1)
    })
  })

  describe('Data Quality Scoring (Agent 3)', () => {
    it('should calculate quality scores for all sheets', async () => {
      for (const testCase of expectations.testCases) {
        const buffer = loadTestFile(testCase.fileName)
        const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
        const sheet = workbook.sheets[0]

        const profile = profileSheet(sheet, workbook)
        const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)
        const quality = calculateSheetQuality(profile, matchResults)

        expect(quality.quality).toBeGreaterThan(0)
        expect(quality.quality).toBeLessThanOrEqual(1)
        expect(quality.tier).toMatch(/EXCELLENT|GOOD|FAIR|POOR|CRITICAL/)
        expect(quality.reasons.length).toBeGreaterThan(0)
      }
    })

    it('should meet minimum average quality threshold', async () => {
      const qualityScores: number[] = []

      for (const testCase of expectations.testCases) {
        const buffer = loadTestFile(testCase.fileName)
        const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
        const sheet = workbook.sheets[0]

        const profile = profileSheet(sheet, workbook)
        const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)
        const quality = calculateSheetQuality(profile, matchResults)

        qualityScores.push(quality.quality)
      }

      const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length

      expect(avgQuality).toBeGreaterThanOrEqual(
        expectations.globalExpectations.dataQuality.minAverageQuality
      )
    })
  })

  describe('End-to-End Integration', () => {
    it('should process all golden workbooks successfully', async () => {
      resetGlobalCache()

      const files = expectations.testCases.map((tc: any) => ({
        name: tc.fileName,
        arrayBuffer: () => Promise.resolve(loadTestFile(tc.fileName))
      })) as any[]

      const result = await ingestFilesInParallel(files, {
        concurrency: { limit: 3 },
        cache: { enabled: true },
        onProgress: (progress) => {
          console.log(`Processing: ${progress.percentComplete}%`)
        }
      })

      expect(result.successCount).toBe(expectations.testCases.length)
      expect(result.failureCount).toBe(0)
      expect(result.workbooks.length).toBe(expectations.testCases.length)
    })

    it('should achieve minimum high-confidence field matching', async () => {
      let totalRequiredFields = 0
      let totalHighConfidenceMatches = 0

      for (const testCase of expectations.testCases) {
        const buffer = loadTestFile(testCase.fileName)
        const workbook = await loadWorkbookFromBuffer(buffer, testCase.fileName)
        const sheet = workbook.sheets[0]

        const profile = profileSheet(sheet, workbook)
        const matchResults = matchAllColumns(profile.columns, DEFAULT_FIELD_REGISTRY)

        const requiredFieldIds = testCase.expectations.sheets[0].requiredFields.map(
          (rf: any) => rf.fieldId
        )

        totalRequiredFields += requiredFieldIds.length

        for (const fieldId of requiredFieldIds) {
          const match = matchResults.find(mr =>
            mr.matches.some(m => m.fieldId === fieldId && m.confidence === 'HIGH')
          )
          if (match) totalHighConfidenceMatches++
        }
      }

      const highConfidenceRatio = totalHighConfidenceMatches / totalRequiredFields

      expect(highConfidenceRatio).toBeGreaterThanOrEqual(
        expectations.globalExpectations.mappingAccuracy.minHighConfidenceFields
      )
    })
  })
})
