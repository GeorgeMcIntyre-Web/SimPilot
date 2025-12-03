// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { simPilotStore } from '../../../domain/simPilotStore'
import { useBottleneckOverview, deriveSeverityFromReason } from '../hooks/useBottleneckOverview'
import type { SimPilotDataSnapshot } from '../../../domain/ExcelIngestionFacade'
import type {
  ToolingWorkflowStatus,
  WorkflowStage,
  StageStatusSnapshot,
  ToolingItem
} from '../../../domain/toolingTypes'
import type { WorkflowBottleneckSnapshot } from '../../../domain/workflowTypes'

// ============================================================================
// FACTORY HELPERS
// ============================================================================

const baseSnapshotFields = {
  assets: [] as never[],
  reuseSummary: {
    total: 0,
    byType: {},
    byStatus: {
      AVAILABLE: 0,
      ALLOCATED: 0,
      IN_USE: 0,
      RESERVED: 0,
      UNKNOWN: 0
    },
    unmatchedReuseCount: 0
  },
  linkingStats: {
    totalAssets: 0,
    assetsWithReuseInfo: 0,
    matchedReuseRecords: 0,
    unmatchedReuseRecords: 0
  },
  errors: [] as never[],
  workflowSnapshot: {
    generatedAt: '2024-03-01T12:00:00.000Z',
    items: [] as never[]
  },
  workflowBottleneckSnapshot: {
    generatedAt: '2024-03-01T12:00:00.000Z',
    bottlenecks: [] as never[]
  } as WorkflowBottleneckSnapshot
}

const makeStage = (
  stage: WorkflowStage,
  percent: number,
  status: StageStatusSnapshot['status']
): StageStatusSnapshot => ({
  stage,
  percentComplete: percent,
  status
})

const makeLocation = () => ({
  program: 'ALPHA',
  plant: 'Jefferson North',
  unit: 'Body',
  line: 'Line 1',
  station: 'ST-100',
  area: 'Underbody'
})

const makeTool = (toolingNumber: string): ToolingItem => ({
  toolingId: `tool-${toolingNumber}`,
  toolingNumber,
  location: makeLocation(),
  metadata: {}
})

let workflowCounter = 0
const makeWorkflow = (overrides: Partial<ToolingWorkflowStatus> = {}): ToolingWorkflowStatus => {
  workflowCounter += 1
  const location = makeLocation()
  return {
    workflowId: `wf-${workflowCounter}`,
    toolingNumber: `TL-${workflowCounter}`,
    stationKey: 'ALPHA-UB-ST-100',
    program: location.program,
    area: location.area,
    station: location.station,
    location,
    designStage: makeStage('DESIGN', 50, 'ON_TRACK'),
    simulationStage: makeStage('SIMULATION', 30, 'AT_RISK'),
    manufactureStage: makeStage('MANUFACTURE', 10, 'ON_TRACK'),
    dominantStage: 'DESIGN',
    bottleneckReason: 'DESIGN_BLOCKED',
    severity: 'HIGH',
    severityScore: 80,
    tool: makeTool(`TL-${workflowCounter}`),
    ...overrides
  }
}

const makeSnapshot = (workflowStatuses: ToolingWorkflowStatus[]): SimPilotDataSnapshot => ({
  ...baseSnapshotFields,
  toolingSnapshot: {
    updatedAt: '2024-03-01T00:00:00.000Z',
    items: workflowStatuses.map(status => status.tool ?? makeTool(status.toolingNumber))
  },
  bottleneckSnapshot: {
    generatedAt: '2024-03-01T12:00:00.000Z',
    workflowStatuses
  }
})

// ============================================================================
// TESTS
// ============================================================================

describe('useBottleneckOverview', () => {
  beforeEach(() => {
    workflowCounter = 0
    act(() => {
      simPilotStore.clear()
    })
  })

  afterEach(() => {
    act(() => {
      simPilotStore.clear()
    })
  })

  describe('loading state', () => {
    it('returns isLoading true when store is loading', () => {
      act(() => {
        simPilotStore.setLoading(true)
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.isLoading).toBe(true)
    })

    it('returns isLoading false when store is not loading', () => {
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([]))
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('hasData', () => {
    it('returns hasData false when snapshot is null', () => {
      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.hasData).toBe(false)
    })

    it('returns hasData true when snapshot exists', () => {
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([]))
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.hasData).toBe(true)
    })
  })

  describe('bottlenecks', () => {
    it('returns empty array when no bottlenecks', () => {
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([]))
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.bottlenecks).toEqual([])
    })

    it('returns bottlenecks from store', () => {
      const workflow1 = makeWorkflow({ toolingNumber: 'TL-001' })
      const workflow2 = makeWorkflow({ toolingNumber: 'TL-002' })
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([workflow1, workflow2]))
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.bottlenecks).toHaveLength(2)
    })

    it('respects limit option', () => {
      const workflows = Array.from({ length: 10 }, () => makeWorkflow())
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot(workflows))
      })

      const { result } = renderHook(() => useBottleneckOverview({ limit: 3 }))

      expect(result.current.bottlenecks).toHaveLength(3)
    })

    it('filters by stage', () => {
      const designWf = makeWorkflow({ dominantStage: 'DESIGN' })
      const simWf = makeWorkflow({ dominantStage: 'SIMULATION' })
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([designWf, simWf]))
      })

      const { result } = renderHook(() =>
        useBottleneckOverview({ stageFilter: 'DESIGN' })
      )

      expect(result.current.bottlenecks).toHaveLength(1)
      expect(result.current.bottlenecks[0].dominantStage).toBe('DESIGN')
    })

    it('filters by reason', () => {
      const designBlocked = makeWorkflow({ bottleneckReason: 'DESIGN_BLOCKED' })
      const simDefect = makeWorkflow({ bottleneckReason: 'SIMULATION_DEFECT' })
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([designBlocked, simDefect]))
      })

      const { result } = renderHook(() =>
        useBottleneckOverview({ reasonFilter: ['DESIGN_BLOCKED'] })
      )

      expect(result.current.bottlenecks).toHaveLength(1)
      expect(result.current.bottlenecks[0].bottleneckReason).toBe('DESIGN_BLOCKED')
    })

    it('applies both stage and reason filters', () => {
      const match = makeWorkflow({
        dominantStage: 'DESIGN',
        bottleneckReason: 'DESIGN_BLOCKED'
      })
      const noMatchStage = makeWorkflow({
        dominantStage: 'SIMULATION',
        bottleneckReason: 'DESIGN_BLOCKED'
      })
      const noMatchReason = makeWorkflow({
        dominantStage: 'DESIGN',
        bottleneckReason: 'SIMULATION_DEFECT'
      })
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([match, noMatchStage, noMatchReason]))
      })

      const { result } = renderHook(() =>
        useBottleneckOverview({
          stageFilter: 'DESIGN',
          reasonFilter: ['DESIGN_BLOCKED']
        })
      )

      expect(result.current.bottlenecks).toHaveLength(1)
      expect(result.current.bottlenecks[0].dominantStage).toBe('DESIGN')
      expect(result.current.bottlenecks[0].bottleneckReason).toBe('DESIGN_BLOCKED')
    })
  })

  describe('summary', () => {
    it('returns zero counts when no bottlenecks', () => {
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([]))
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.summary.total).toBe(0)
      expect(result.current.summary.high).toBe(0)
      expect(result.current.summary.medium).toBe(0)
      expect(result.current.summary.low).toBe(0)
    })

    it('counts bottlenecks by severity', () => {
      const highWf = makeWorkflow({ severity: 'HIGH' })
      const medWf1 = makeWorkflow({ severity: 'MEDIUM' })
      const medWf2 = makeWorkflow({ severity: 'MEDIUM' })
      const lowWf = makeWorkflow({ severity: 'LOW' })
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([highWf, medWf1, medWf2, lowWf]))
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.summary.total).toBe(4)
      expect(result.current.summary.high).toBe(1)
      expect(result.current.summary.medium).toBe(2)
      expect(result.current.summary.low).toBe(1)
    })

    it('counts bottlenecks by stage', () => {
      const designWf1 = makeWorkflow({ dominantStage: 'DESIGN' })
      const designWf2 = makeWorkflow({ dominantStage: 'DESIGN' })
      const simWf = makeWorkflow({ dominantStage: 'SIMULATION' })
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([designWf1, designWf2, simWf]))
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.summary.byStage.DESIGN).toBe(2)
      expect(result.current.summary.byStage.SIMULATION).toBe(1)
      expect(result.current.summary.byStage.MANUFACTURE).toBe(0)
    })
  })

  describe('updatedAt', () => {
    it('returns null when no snapshot', () => {
      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.updatedAt).toBeNull()
    })

    it('returns timestamp from snapshot', () => {
      act(() => {
        simPilotStore.setSnapshot(makeSnapshot([]))
      })

      const { result } = renderHook(() => useBottleneckOverview())

      expect(result.current.updatedAt).toBe('2024-03-01T12:00:00.000Z')
    })
  })
})

describe('deriveSeverityFromReason', () => {
  it('returns HIGH for DESIGN_BLOCKED', () => {
    expect(deriveSeverityFromReason('DESIGN_BLOCKED')).toBe('HIGH')
  })

  it('returns HIGH for SIMULATION_DEFECT', () => {
    expect(deriveSeverityFromReason('SIMULATION_DEFECT')).toBe('HIGH')
  })

  it('returns MEDIUM for MANUFACTURE_CONSTRAINT', () => {
    expect(deriveSeverityFromReason('MANUFACTURE_CONSTRAINT')).toBe('MEDIUM')
  })

  it('returns MEDIUM for SUPPLIER_DELAY', () => {
    expect(deriveSeverityFromReason('SUPPLIER_DELAY')).toBe('MEDIUM')
  })

  it('returns LOW for DATA_GAP', () => {
    expect(deriveSeverityFromReason('DATA_GAP')).toBe('LOW')
  })

  it('returns LOW for UNKNOWN', () => {
    expect(deriveSeverityFromReason('UNKNOWN')).toBe('LOW')
  })
})
