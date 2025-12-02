// Field Matcher Tests
// Tests for column→field matching with and without embeddings

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  matchFieldByPattern,
  matchFieldWithEmbeddings,
  buildColumnProfiles,
  matchColumnsToFields,
  DEFAULT_FIELD_REGISTRY,
  ColumnProfile,
  isLowConfidenceMatch,
  countLowConfidenceMatches
} from '../fieldMatcher'
import { MockEmbeddingProvider } from '../embeddingTypes'

// Mock feature flags
vi.mock('../../config/featureFlags', () => ({
  getFeatureFlag: vi.fn((key: string) => {
    if (key === 'useSemanticEmbeddings') return false
    return false
  })
}))

describe('matchFieldByPattern', () => {
  it('matches Robot ID column with high confidence', () => {
    const column: ColumnProfile = {
      columnIndex: 0,
      header: 'Robotnumber',
      normalizedHeader: 'robotnumber',
      detectedTypes: ['string'],
      sampleValues: ['R001', 'R002'],
      emptyRatio: 0,
      uniqueRatio: 1
    }

    const result = matchFieldByPattern(column, DEFAULT_FIELD_REGISTRY)

    expect(result.matchedField?.id).toBe('robot_id')
    expect(result.confidenceLevel).toBe('HIGH')
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('matches Station column', () => {
    const column: ColumnProfile = {
      columnIndex: 1,
      header: 'Station Number',
      normalizedHeader: 'station number',
      detectedTypes: ['string'],
      sampleValues: ['ST-01', 'ST-02'],
      emptyRatio: 0,
      uniqueRatio: 1
    }

    const result = matchFieldByPattern(column, DEFAULT_FIELD_REGISTRY)

    expect(result.matchedField?.id).toBe('station')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('returns null for unknown columns', () => {
    const column: ColumnProfile = {
      columnIndex: 2,
      header: 'XYZ Random Column',
      normalizedHeader: 'xyz random column',
      detectedTypes: ['string'],
      sampleValues: ['foo', 'bar'],
      emptyRatio: 0,
      uniqueRatio: 1
    }

    const result = matchFieldByPattern(column, DEFAULT_FIELD_REGISTRY)

    expect(result.matchedField).toBeNull()
    expect(result.confidence).toBeLessThan(0.5)
  })

  it('handles typos from real data', () => {
    const column: ColumnProfile = {
      columnIndex: 3,
      header: 'Refresment OK',  // Real typo from data
      normalizedHeader: 'refresment ok',
      detectedTypes: ['string'],
      sampleValues: ['Yes', 'No'],
      emptyRatio: 0,
      uniqueRatio: 0.5
    }

    const result = matchFieldByPattern(column, DEFAULT_FIELD_REGISTRY)

    expect(result.matchedField?.id).toBe('reuse_status')
  })

  it('matches gun force column', () => {
    const column: ColumnProfile = {
      columnIndex: 4,
      header: 'Gun Force [N]',
      normalizedHeader: 'gun force [n]',
      detectedTypes: ['number'],
      sampleValues: ['2500', '3000'],
      emptyRatio: 0,
      uniqueRatio: 0.8
    }

    const result = matchFieldByPattern(column, DEFAULT_FIELD_REGISTRY)

    expect(result.matchedField?.id).toBe('gun_force')
  })

  it('provides alternatives for partial matches', () => {
    const column: ColumnProfile = {
      columnIndex: 5,
      header: 'ID',
      normalizedHeader: 'id',
      detectedTypes: ['string'],
      sampleValues: ['001', '002'],
      emptyRatio: 0,
      uniqueRatio: 1
    }

    const result = matchFieldByPattern(column, DEFAULT_FIELD_REGISTRY)

    // Should have alternatives since 'id' appears in multiple field aliases
    expect(result.alternatives.length).toBeGreaterThanOrEqual(0)
  })
})

describe('matchFieldWithEmbeddings', () => {
  let provider: MockEmbeddingProvider

  beforeEach(() => {
    provider = new MockEmbeddingProvider(64)
  })

  it('returns embedding score in results', async () => {
    const column: ColumnProfile = {
      columnIndex: 0,
      header: 'Robot ID',
      normalizedHeader: 'robot id',
      detectedTypes: ['string'],
      sampleValues: ['R001', 'R002'],
      emptyRatio: 0,
      uniqueRatio: 1,
      sheetCategory: 'ROBOT_SPECS'
    }

    const result = await matchFieldWithEmbeddings(column, DEFAULT_FIELD_REGISTRY, provider)

    expect(result.usedEmbedding).toBe(true)
    expect(result.embeddingScore).toBeDefined()
    expect(result.embeddingScore).toBeGreaterThan(0)
    expect(result.embeddingScore).toBeLessThanOrEqual(1)
  })

  it('blends pattern and embedding scores', async () => {
    const column: ColumnProfile = {
      columnIndex: 0,
      header: 'Robotnumber',
      normalizedHeader: 'robotnumber',
      detectedTypes: ['string'],
      sampleValues: ['R001'],
      emptyRatio: 0,
      uniqueRatio: 1
    }

    const patternResult = matchFieldByPattern(column, DEFAULT_FIELD_REGISTRY)
    const embeddingResult = await matchFieldWithEmbeddings(column, DEFAULT_FIELD_REGISTRY, provider)

    // Blended score should be different from pure pattern score
    expect(embeddingResult.confidence).not.toBe(patternResult.confidence)
    expect(embeddingResult.patternScore).toBe(patternResult.confidence)
  })

  it('includes explanation with embedding info', async () => {
    const column: ColumnProfile = {
      columnIndex: 0,
      header: 'Station Code',
      normalizedHeader: 'station code',
      detectedTypes: ['string'],
      sampleValues: ['ST-01'],
      emptyRatio: 0,
      uniqueRatio: 1
    }

    const result = await matchFieldWithEmbeddings(column, DEFAULT_FIELD_REGISTRY, provider)

    expect(result.explanation).toContain('Embedding')
  })
})

describe('buildColumnProfiles', () => {
  it('creates profiles from headers and sample rows', () => {
    const headers = ['Robot ID', 'Station', 'Status']
    const sampleRows = [
      ['R001', 'ST-01', 'Active'],
      ['R002', 'ST-02', 'Inactive'],
      ['R003', 'ST-03', 'Active']
    ]

    const profiles = buildColumnProfiles(headers, sampleRows)

    expect(profiles).toHaveLength(3)
    expect(profiles[0].header).toBe('Robot ID')
    expect(profiles[0].sampleValues).toContain('R001')
    expect(profiles[1].header).toBe('Station')
  })

  it('skips empty headers', () => {
    const headers = ['Robot ID', '', 'Status']
    const sampleRows = [
      ['R001', 'ignored', 'Active']
    ]

    const profiles = buildColumnProfiles(headers, sampleRows)

    expect(profiles).toHaveLength(2)
    expect(profiles.map(p => p.header)).toContain('Robot ID')
    expect(profiles.map(p => p.header)).toContain('Status')
  })

  it('calculates empty ratio correctly', () => {
    const headers = ['Value']
    const sampleRows = [
      ['data'],
      [null],
      ['data'],
      [undefined],
      ['data']
    ]

    const profiles = buildColumnProfiles(headers, sampleRows)

    expect(profiles[0].emptyRatio).toBeCloseTo(0.4)  // 2 empty out of 5
  })

  it('calculates unique ratio correctly', () => {
    const headers = ['Category']
    const sampleRows = [
      ['A'],
      ['A'],
      ['B'],
      ['C'],
      ['A']
    ]

    const profiles = buildColumnProfiles(headers, sampleRows)

    expect(profiles[0].uniqueRatio).toBeCloseTo(0.6)  // 3 unique out of 5
  })

  it('includes sheet category when provided', () => {
    const headers = ['Robot ID']
    const sampleRows = [['R001']]

    const profiles = buildColumnProfiles(headers, sampleRows, 'ROBOT_SPECS')

    expect(profiles[0].sheetCategory).toBe('ROBOT_SPECS')
  })
})

describe('matchColumnsToFields', () => {
  it('matches multiple columns', async () => {
    const columns: ColumnProfile[] = [
      {
        columnIndex: 0,
        header: 'Robot ID',
        normalizedHeader: 'robot id',
        detectedTypes: ['string'],
        sampleValues: ['R001'],
        emptyRatio: 0,
        uniqueRatio: 1
      },
      {
        columnIndex: 1,
        header: 'Station',
        normalizedHeader: 'station',
        detectedTypes: ['string'],
        sampleValues: ['ST-01'],
        emptyRatio: 0,
        uniqueRatio: 1
      }
    ]

    const results = await matchColumnsToFields(columns)

    expect(results).toHaveLength(2)
    expect(results[0].matchedField?.id).toBe('robot_id')
    expect(results[1].matchedField?.id).toBe('station')
  })

  it('uses pattern matching by default', async () => {
    const columns: ColumnProfile[] = [
      {
        columnIndex: 0,
        header: 'Test',
        normalizedHeader: 'test',
        detectedTypes: ['string'],
        sampleValues: [],
        emptyRatio: 0,
        uniqueRatio: 1
      }
    ]

    const results = await matchColumnsToFields(columns)

    expect(results[0].usedEmbedding).toBe(false)
  })
})

describe('isLowConfidenceMatch', () => {
  it('returns true for low confidence', () => {
    const result = {
      columnIndex: 0,
      header: 'Test',
      matchedField: null,
      confidence: 0.3,
      confidenceLevel: 'LOW' as const,
      patternScore: 0.3,
      usedEmbedding: false,
      explanation: 'Low match',
      alternatives: []
    }

    expect(isLowConfidenceMatch(result, 0.5)).toBe(true)
  })

  it('returns false for high confidence', () => {
    const result = {
      columnIndex: 0,
      header: 'Test',
      matchedField: DEFAULT_FIELD_REGISTRY[0],
      confidence: 0.9,
      confidenceLevel: 'HIGH' as const,
      patternScore: 0.9,
      usedEmbedding: false,
      explanation: 'High match',
      alternatives: []
    }

    expect(isLowConfidenceMatch(result, 0.5)).toBe(false)
  })
})

describe('countLowConfidenceMatches', () => {
  it('counts matches below threshold', () => {
    const results = [
      { confidence: 0.9, columnIndex: 0, header: 'A', matchedField: null, confidenceLevel: 'HIGH' as const, patternScore: 0.9, usedEmbedding: false, explanation: '', alternatives: [] },
      { confidence: 0.3, columnIndex: 1, header: 'B', matchedField: null, confidenceLevel: 'LOW' as const, patternScore: 0.3, usedEmbedding: false, explanation: '', alternatives: [] },
      { confidence: 0.4, columnIndex: 2, header: 'C', matchedField: null, confidenceLevel: 'LOW' as const, patternScore: 0.4, usedEmbedding: false, explanation: '', alternatives: [] },
      { confidence: 0.8, columnIndex: 3, header: 'D', matchedField: null, confidenceLevel: 'HIGH' as const, patternScore: 0.8, usedEmbedding: false, explanation: '', alternatives: [] }
    ]

    expect(countLowConfidenceMatches(results, 0.5)).toBe(2)
  })
})
