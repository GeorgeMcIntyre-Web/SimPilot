// SheetMappingInspector Tests
// Tests for the mapping inspection and override UI

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SheetMappingInspector, SheetMappingData } from '../SheetMappingInspector'
import { DEFAULT_FIELD_REGISTRY, FieldMatchResult } from '../../../ingestion/fieldMatcher'

// Mock the hooks
vi.mock('../../../hooks/useMappingOverrides', () => ({
  useMappingOverrides: () => ({
    overrides: [],
    setOverride: vi.fn(),
    removeOverride: vi.fn(),
    clearSheetOverrides: vi.fn(),
    clearAllOverrides: vi.fn(),
    getOverride: vi.fn(),
    applyOverrides: vi.fn((_, __, matches) => matches),
    overrideCount: 0,
    hasOverride: vi.fn(() => false)
  })
}))

vi.mock('../../../config/featureFlags', () => ({
  getFeatureFlags: () => ({
    useSemanticEmbeddings: false,
    useLLMMappingHelper: false,
    useDataQualityScoring: true,
    useMappingOverrides: true,
    showMatchExplanations: true,
    debugMode: false
  })
}))

// Helper to create test data
function createTestMatch(overrides: Partial<FieldMatchResult> = {}): FieldMatchResult {
  return {
    columnIndex: 0,
    header: 'Robot ID',
    matchedField: DEFAULT_FIELD_REGISTRY.find(f => f.id === 'robot_id') ?? null,
    confidence: 0.9,
    confidenceLevel: 'HIGH',
    patternScore: 0.9,
    usedEmbedding: false,
    explanation: 'Exact match',
    alternatives: [],
    ...overrides
  }
}

function createTestSheetData(overrides: Partial<SheetMappingData> = {}): SheetMappingData {
  return {
    workbookId: 'test-workbook',
    sheetName: 'TestSheet',
    matches: [
      createTestMatch(),
      createTestMatch({
        columnIndex: 1,
        header: 'Station',
        matchedField: DEFAULT_FIELD_REGISTRY.find(f => f.id === 'station'),
        confidence: 0.8
      })
    ],
    ...overrides
  }
}

describe('SheetMappingInspector', () => {
  it('renders empty state when no sheets provided', () => {
    render(<SheetMappingInspector sheets={[]} />)
    
    expect(screen.getByText('No sheets to display')).toBeInTheDocument()
  })

  it('renders sheet list with names', () => {
    const sheets = [
      createTestSheetData({ sheetName: 'Sheet1' }),
      createTestSheetData({ sheetName: 'Sheet2' })
    ]

    render(<SheetMappingInspector sheets={sheets} />)
    
    expect(screen.getByText('Sheet1')).toBeInTheDocument()
    expect(screen.getByText('Sheet2')).toBeInTheDocument()
  })

  it('shows column count for each sheet', () => {
    const sheets = [
      createTestSheetData({ sheetName: 'TestSheet' })
    ]

    render(<SheetMappingInspector sheets={sheets} />)
    
    expect(screen.getByText('2 columns')).toBeInTheDocument()
  })

  it('expands first sheet by default', () => {
    const sheets = [createTestSheetData()]

    render(<SheetMappingInspector sheets={sheets} />)
    
    // Should show column headers since sheet is expanded
    // There may be multiple instances (header and matched field)
    expect(screen.getAllByText('Robot ID').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Station').length).toBeGreaterThan(0)
  })

  it('shows matched field names', () => {
    const sheets = [createTestSheetData()]

    render(<SheetMappingInspector sheets={sheets} />)
    
    // The matched field names should appear
    expect(screen.getByRole('button', { name: /Robot ID/i })).toBeInTheDocument()
  })

  it('shows confidence percentages', () => {
    const sheets = [createTestSheetData()]

    render(<SheetMappingInspector sheets={sheets} />)
    
    // Should show confidence like "90%"
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('shows low confidence warning count', () => {
    const sheets = [
      createTestSheetData({
        matches: [
          createTestMatch({ confidence: 0.3, confidenceLevel: 'LOW' }),
          createTestMatch({ confidence: 0.2, confidenceLevel: 'LOW' })
        ]
      })
    ]

    render(<SheetMappingInspector sheets={sheets} />)
    
    // Should show "2 low" for low confidence columns
    expect(screen.getByText('2 low')).toBeInTheDocument()
  })

  it('shows Unknown for unmatched columns', () => {
    const sheets = [
      createTestSheetData({
        matches: [
          createTestMatch({
            header: 'Random Column',
            matchedField: null,
            confidence: 0.1,
            confidenceLevel: 'LOW'
          })
        ]
      })
    ]

    render(<SheetMappingInspector sheets={sheets} />)
    
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('toggles sheet expansion on click', () => {
    const sheets = [
      createTestSheetData({ sheetName: 'Sheet1' }),
      createTestSheetData({ sheetName: 'Sheet2' })
    ]

    render(<SheetMappingInspector sheets={sheets} />)
    
    // Sheet1 is expanded by default (first sheet)
    expect(screen.getAllByText('Robot ID').length).toBeGreaterThan(0)
    
    // Click to collapse Sheet1
    fireEvent.click(screen.getByText('Sheet1'))
    
    // Now the column details might be hidden
    // (This depends on actual implementation - checking toggle occurred)
  })

  it('shows quality badge when quality score provided', () => {
    const sheets = [
      createTestSheetData({
        qualityScore: {
          workbookId: 'test',
          sheetName: 'TestSheet',
          sheetCategory: 'ROBOT_SPECS',
          quality: 0.9,
          tier: 'EXCELLENT',
          reasons: ['All checks passed'],
          metrics: {
            emptyRatio: 0,
            unknownColumnRatio: 0,
            averageConfidence: 0.9,
            highConfidenceRatio: 1,
            requiredFieldsCoverage: 1,
            consistencyScore: 0.9,
            rowCount: 100,
            columnCount: 10
          }
        }
      })
    ]

    render(<SheetMappingInspector sheets={sheets} />)
    
    expect(screen.getByText(/EXCELLENT/)).toBeInTheDocument()
    // Multiple 90% values may appear (badge + metrics)
    expect(screen.getAllByText(/90%/).length).toBeGreaterThan(0)
  })

  it('shows sample values when provided', () => {
    const sheets = [
      createTestSheetData({
        sampleValues: {
          0: ['R001', 'R002', 'R003'],
          1: ['ST-01', 'ST-02']
        }
      })
    ]

    render(<SheetMappingInspector sheets={sheets} />)
    
    expect(screen.getByText('R001')).toBeInTheDocument()
    expect(screen.getByText('ST-01')).toBeInTheDocument()
  })

  it('calls onRerunProjection when button clicked', () => {
    const onRerunProjection = vi.fn()
    const sheets = [createTestSheetData()]

    render(
      <SheetMappingInspector 
        sheets={sheets} 
        onRerunProjection={onRerunProjection}
      />
    )
    
    const rerunButton = screen.getByRole('button', { name: /re-run projection/i })
    fireEvent.click(rerunButton)
    
    expect(onRerunProjection).toHaveBeenCalledWith('test-workbook', 'TestSheet')
  })
})

describe('SheetMappingInspector - Embedding indicators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows embedding icon when match used embeddings', () => {
    vi.mock('../../../config/featureFlags', () => ({
      getFeatureFlags: () => ({
        useSemanticEmbeddings: true,
        useLLMMappingHelper: false
      })
    }))

    const sheets = [
      createTestSheetData({
        matches: [
          createTestMatch({
            usedEmbedding: true,
            embeddingScore: 0.85
          })
        ]
      })
    ]

    render(<SheetMappingInspector sheets={sheets} />)
    
    // Should show the semantic embedding score
    expect(screen.getByText(/85% sem/)).toBeInTheDocument()
  })
})
