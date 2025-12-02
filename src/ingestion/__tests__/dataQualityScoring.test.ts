// Data Quality Scoring Tests
// Tests for sheet and ingestion quality metrics

import { describe, it, expect } from 'vitest'
import {
  calculateSheetQuality,
  calculateIngestionQuality,
  qualityToTier,
  getTierColorClass,
  getTierIcon,
  SheetQualityScore
} from '../dataQualityScoring'
import { FieldMatchResult, DEFAULT_FIELD_REGISTRY } from '../fieldMatcher'

// Helper to create match results
function createMatchResult(overrides: Partial<FieldMatchResult> = {}): FieldMatchResult {
  return {
    columnIndex: 0,
    header: 'Test',
    matchedField: DEFAULT_FIELD_REGISTRY[0],
    confidence: 0.8,
    confidenceLevel: 'HIGH',
    patternScore: 0.8,
    usedEmbedding: false,
    explanation: 'Test match',
    alternatives: [],
    ...overrides
  }
}

describe('calculateSheetQuality', () => {
  it('returns high quality for good matches', () => {
    const matches: FieldMatchResult[] = [
      createMatchResult({ confidence: 0.9, confidenceLevel: 'HIGH' }),
      createMatchResult({ confidence: 0.85, confidenceLevel: 'HIGH' }),
      createMatchResult({ confidence: 0.8, confidenceLevel: 'HIGH' })
    ]

    const result = calculateSheetQuality({
      workbookId: 'test-workbook',
      sheetName: 'TestSheet',
      sheetCategory: 'ROBOT_SPECS',
      matches,
      rowCount: 100
    })

    expect(result.quality).toBeGreaterThan(0.7)
    expect(['EXCELLENT', 'GOOD']).toContain(result.tier)
  })

  it('returns low quality for poor matches', () => {
    const matches: FieldMatchResult[] = [
      createMatchResult({ matchedField: null, confidence: 0.2, confidenceLevel: 'LOW' }),
      createMatchResult({ matchedField: null, confidence: 0.3, confidenceLevel: 'LOW' }),
      createMatchResult({ matchedField: null, confidence: 0.1, confidenceLevel: 'LOW' })
    ]

    const result = calculateSheetQuality({
      workbookId: 'test-workbook',
      sheetName: 'TestSheet',
      sheetCategory: 'UNKNOWN',
      matches,
      rowCount: 100
    })

    expect(result.quality).toBeLessThan(0.5)
    expect(['POOR', 'CRITICAL']).toContain(result.tier)
  })

  it('includes reasons for quality issues', () => {
    const matches: FieldMatchResult[] = [
      createMatchResult({ matchedField: null, confidence: 0.2, confidenceLevel: 'LOW' })
    ]

    const result = calculateSheetQuality({
      workbookId: 'test-workbook',
      sheetName: 'TestSheet',
      sheetCategory: 'UNKNOWN',
      matches,
      rowCount: 100
    })

    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('calculates correct metrics', () => {
    const matches: FieldMatchResult[] = [
      createMatchResult({ confidence: 0.9, confidenceLevel: 'HIGH' }),
      createMatchResult({ matchedField: null, confidence: 0.3, confidenceLevel: 'LOW' }),
      createMatchResult({ confidence: 0.7, confidenceLevel: 'HIGH' })
    ]

    const result = calculateSheetQuality({
      workbookId: 'test-workbook',
      sheetName: 'TestSheet',
      sheetCategory: 'ROBOT_SPECS',
      matches,
      rowCount: 50
    })

    // Unknown column ratio should be 1/3
    expect(result.metrics.unknownColumnRatio).toBeCloseTo(1/3, 1)
    
    // Average confidence should be (0.9 + 0.3 + 0.7) / 3
    expect(result.metrics.averageConfidence).toBeCloseTo(0.633, 1)
    
    // High confidence ratio should be 2/3 (two >= 0.7)
    expect(result.metrics.highConfidenceRatio).toBeCloseTo(2/3, 1)
    
    expect(result.metrics.rowCount).toBe(50)
    expect(result.metrics.columnCount).toBe(3)
  })

  it('handles missing required fields for category', () => {
    // SIMULATION_STATUS requires ROBOT_ID, STATION, AREA
    const matches: FieldMatchResult[] = [
      createMatchResult({ 
        matchedField: DEFAULT_FIELD_REGISTRY.find(f => f.role === 'ROBOT_ID'),
        confidence: 0.9 
      }),
      // Missing STATION and AREA
      createMatchResult({ confidence: 0.8 })
    ]

    const result = calculateSheetQuality({
      workbookId: 'test-workbook',
      sheetName: 'TestSheet',
      sheetCategory: 'SIMULATION_STATUS',
      matches,
      rowCount: 100
    })

    expect(result.metrics.requiredFieldsCoverage).toBeLessThan(1.0)
    expect(result.reasons.some(r => r.includes('required field'))).toBe(true)
  })
})

describe('calculateIngestionQuality', () => {
  it('aggregates quality from multiple sheets', () => {
    const sheetScores: SheetQualityScore[] = [
      {
        workbookId: 'wb1',
        sheetName: 'Sheet1',
        sheetCategory: 'ROBOT_SPECS',
        quality: 0.9,
        tier: 'EXCELLENT',
        reasons: [],
        metrics: {
          emptyRatio: 0.1,
          unknownColumnRatio: 0.1,
          averageConfidence: 0.9,
          highConfidenceRatio: 0.9,
          requiredFieldsCoverage: 1.0,
          consistencyScore: 0.9,
          rowCount: 100,
          columnCount: 10
        }
      },
      {
        workbookId: 'wb1',
        sheetName: 'Sheet2',
        sheetCategory: 'SIMULATION_STATUS',
        quality: 0.7,
        tier: 'GOOD',
        reasons: [],
        metrics: {
          emptyRatio: 0.2,
          unknownColumnRatio: 0.2,
          averageConfidence: 0.7,
          highConfidenceRatio: 0.6,
          requiredFieldsCoverage: 1.0,
          consistencyScore: 0.8,
          rowCount: 50,
          columnCount: 15
        }
      }
    ]

    const result = calculateIngestionQuality(sheetScores)

    expect(result.overallQuality).toBeGreaterThan(0.7)
    expect(result.sheetScores).toHaveLength(2)
    expect(result.summary).toContain('2 sheet')
  })

  it('identifies top issues', () => {
    const sheetScores: SheetQualityScore[] = [
      {
        workbookId: 'wb1',
        sheetName: 'BadSheet',
        sheetCategory: 'UNKNOWN',
        quality: 0.2,
        tier: 'CRITICAL',
        reasons: ['Many issues'],
        metrics: {
          emptyRatio: 0.5,
          unknownColumnRatio: 0.8,
          averageConfidence: 0.2,
          highConfidenceRatio: 0.1,
          requiredFieldsCoverage: 0.0,
          consistencyScore: 0.3,
          rowCount: 20,
          columnCount: 5
        }
      }
    ]

    const result = calculateIngestionQuality(sheetScores)

    expect(result.topIssues.length).toBeGreaterThan(0)
    expect(result.topIssues[0].severity).toBe('HIGH')
  })

  it('provides recommendations', () => {
    const sheetScores: SheetQualityScore[] = [
      {
        workbookId: 'wb1',
        sheetName: 'Sheet1',
        sheetCategory: 'ROBOT_SPECS',
        quality: 0.5,
        tier: 'FAIR',
        reasons: ['Some issues'],
        metrics: {
          emptyRatio: 0.3,
          unknownColumnRatio: 0.4,
          averageConfidence: 0.5,
          highConfidenceRatio: 0.3,
          requiredFieldsCoverage: 0.8,
          consistencyScore: 0.6,
          rowCount: 100,
          columnCount: 10
        }
      }
    ]

    const result = calculateIngestionQuality(sheetScores)

    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  it('handles empty sheet list', () => {
    const result = calculateIngestionQuality([])

    expect(result.overallQuality).toBe(0)
    expect(result.overallTier).toBe('CRITICAL')
    expect(result.summary).toContain('No sheets')
  })
})

describe('qualityToTier', () => {
  it('maps high scores to EXCELLENT', () => {
    expect(qualityToTier(0.95)).toBe('EXCELLENT')
    expect(qualityToTier(0.85)).toBe('EXCELLENT')
  })

  it('maps mid-high scores to GOOD', () => {
    expect(qualityToTier(0.75)).toBe('GOOD')
    expect(qualityToTier(0.70)).toBe('GOOD')
  })

  it('maps mid scores to FAIR', () => {
    expect(qualityToTier(0.60)).toBe('FAIR')
    expect(qualityToTier(0.50)).toBe('FAIR')
  })

  it('maps low scores to POOR', () => {
    expect(qualityToTier(0.40)).toBe('POOR')
    expect(qualityToTier(0.30)).toBe('POOR')
  })

  it('maps very low scores to CRITICAL', () => {
    expect(qualityToTier(0.20)).toBe('CRITICAL')
    expect(qualityToTier(0.10)).toBe('CRITICAL')
    expect(qualityToTier(0)).toBe('CRITICAL')
  })
})

describe('display helpers', () => {
  it('getTierColorClass returns appropriate classes', () => {
    expect(getTierColorClass('EXCELLENT')).toContain('green')
    expect(getTierColorClass('GOOD')).toContain('blue')
    expect(getTierColorClass('FAIR')).toContain('yellow')
    expect(getTierColorClass('POOR')).toContain('orange')
    expect(getTierColorClass('CRITICAL')).toContain('red')
  })

  it('getTierIcon returns appropriate icons', () => {
    expect(getTierIcon('EXCELLENT')).toBe('check-circle')
    expect(getTierIcon('GOOD')).toBe('check-circle')
    expect(getTierIcon('FAIR')).toBe('info')
    expect(getTierIcon('POOR')).toBe('alert-triangle')
    expect(getTierIcon('CRITICAL')).toBe('x-circle')
  })
})
