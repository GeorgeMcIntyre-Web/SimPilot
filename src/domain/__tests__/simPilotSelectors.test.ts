import { randomUUID } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import {
  selectWorstBottlenecks,
  selectBottlenecksByStationKey,
  selectBottlenecksForToolingNumber,
  selectBottlenecksByStage,
  selectWorstWorkflowBottlenecks,
  selectWorkflowBottlenecksByContextKey,
  selectWorkflowBottlenecksByKind,
  selectWorkflowBottlenecksByStage,
  selectWorkflowBottlenecksByReason,
  selectWorkflowBottleneckStats
} from '../simPilotSelectors'
import type { SimPilotStoreState } from '../simPilotStore'
import type { ToolingWorkflowStatus, WorkflowStage, StageStatusSnapshot } from '../toolingTypes'
import type { WorkflowBottleneckStatus } from '../workflowTypes'

const baseSnapshot = {
  assets: [],
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
  errors: [],
  toolingSnapshot: {
    updatedAt: '2024-01-01T00:00:00.000Z',
    items: []
  }
}

const makeStageStatus = (
  stage: WorkflowStage,
  percent: number,
  status: StageStatusSnapshot['status']
): StageStatusSnapshot => ({
  stage,
  percentComplete: percent,
  status
})

const makeWorkflow = (overrides: Partial<ToolingWorkflowStatus>): ToolingWorkflowStatus => ({
  workflowId: overrides.workflowId ?? randomUUID(),
  toolingNumber: overrides.toolingNumber ?? 'TL-100',
  equipmentNumber: overrides.equipmentNumber,
  handedness: overrides.handedness,
  stationKey: overrides.stationKey ?? 'PRG-Area-01',
  program: overrides.program ?? 'ALPHA',
  area: overrides.area ?? 'Area 51',
  station: overrides.station ?? 'Station A',
  location: overrides.location ?? {
    program: overrides.program ?? 'ALPHA',
    plant: 'Plant 1',
    unit: 'Unit 1',
    line: 'Line 1',
    station: overrides.station ?? 'Station A',
    area: overrides.area ?? 'Area 51'
  },
  designStage: overrides.designStage ?? makeStageStatus('DESIGN', 20, 'BLOCKED'),
  simulationStage: overrides.simulationStage ?? makeStageStatus('SIMULATION', 50, 'AT_RISK'),
  manufactureStage: overrides.manufactureStage ?? makeStageStatus('MANUFACTURE', 10, 'BLOCKED'),
  dominantStage: overrides.dominantStage ?? 'DESIGN',
  bottleneckReason: overrides.bottleneckReason ?? 'DESIGN_BLOCKED',
  severity: overrides.severity ?? 'HIGH',
  severityScore: overrides.severityScore ?? 90,
  tool: overrides.tool
})

const makeState = (statuses: ToolingWorkflowStatus[]): SimPilotStoreState => ({
  snapshot: {
    ...baseSnapshot,
    bottleneckSnapshot: {
      generatedAt: '2024-01-01T00:00:00.000Z',
      workflowStatuses: statuses
    },
    workflowSnapshot: {
      generatedAt: '2024-01-01T00:00:00.000Z',
      items: []
    },
    workflowBottleneckSnapshot: {
      generatedAt: '2024-01-01T00:00:00.000Z',
      bottlenecks: []
    }
  },
  isLoading: false,
  errors: []
})

const makeWorkflowState = (bottlenecks: WorkflowBottleneckStatus[]): SimPilotStoreState => ({
  snapshot: {
    ...baseSnapshot,
    bottleneckSnapshot: {
      generatedAt: '2024-01-01T00:00:00.000Z',
      workflowStatuses: []
    },
    workflowSnapshot: {
      generatedAt: '2024-01-01T00:00:00.000Z',
      items: []
    },
    workflowBottleneckSnapshot: {
      generatedAt: '2024-01-01T00:00:00.000Z',
      bottlenecks
    }
  },
  isLoading: false,
  errors: []
})

const makeWorkflowBottleneck = (overrides: Partial<WorkflowBottleneckStatus>): WorkflowBottleneckStatus => ({
  workflowItemId: overrides.workflowItemId ?? randomUUID(),
  kind: overrides.kind ?? 'TOOLING',
  simulationContextKey: overrides.simulationContextKey ?? 'PRG|Plant1|Unit1|Line1|Station1',
  itemNumber: overrides.itemNumber ?? 'ITEM-001',
  dominantStage: overrides.dominantStage ?? 'DESIGN',
  bottleneckReason: overrides.bottleneckReason ?? 'DESIGN_NOT_DETAILED',
  severity: overrides.severity ?? 'HIGH',
  severityScore: overrides.severityScore ?? 80,
  blockingItemIds: overrides.blockingItemIds ?? [],
  designStage: overrides.designStage ?? {
    stage: 'DESIGN',
    status: 'IN_PROGRESS',
    percentComplete: 40
  },
  simulationStage: overrides.simulationStage ?? {
    stage: 'SIMULATION',
    status: 'NOT_STARTED',
    percentComplete: 0
  },
  manufactureStage: overrides.manufactureStage ?? {
    stage: 'MANUFACTURE',
    status: 'NOT_STARTED',
    percentComplete: 0
  }
})

describe('simPilotSelectors', () => {
  it('selectWorstBottlenecks sorts by severity then severityScore', () => {
    const state = makeState([
      makeWorkflow({ workflowId: 'low', severity: 'LOW', severityScore: 70, toolingNumber: 'TL-LOW' }),
      makeWorkflow({ workflowId: 'high', severity: 'HIGH', severityScore: 50, toolingNumber: 'TL-HIGH' }),
      makeWorkflow({ workflowId: 'medium', severity: 'MEDIUM', severityScore: 95, toolingNumber: 'TL-MID' })
    ])

    const result = selectWorstBottlenecks(state, 2)
    expect(result.map(r => r.workflowId)).toEqual(['high', 'medium'])
  })

  it('selectBottlenecksByStationKey returns matches for station', () => {
    const state = makeState([
      makeWorkflow({ workflowId: 'A', stationKey: 'AREA-001' }),
      makeWorkflow({ workflowId: 'B', stationKey: 'AREA-002' })
    ])

    const result = selectBottlenecksByStationKey(state, 'AREA-001')
    expect(result).toHaveLength(1)
    expect(result[0]?.workflowId).toBe('A')
  })

  it('selectBottlenecksForToolingNumber filters by tooling number', () => {
    const state = makeState([
      makeWorkflow({ workflowId: 'A', toolingNumber: 'TL-01' }),
      makeWorkflow({ workflowId: 'B', toolingNumber: 'TL-02' })
    ])

    const result = selectBottlenecksForToolingNumber(state, 'TL-02')
    expect(result).toHaveLength(1)
    expect(result[0]?.workflowId).toBe('B')
  })

  it('selectBottlenecksByStage filters by workflow stage', () => {
    const state = makeState([
      makeWorkflow({ workflowId: 'design', dominantStage: 'DESIGN' }),
      makeWorkflow({ workflowId: 'sim', dominantStage: 'SIMULATION' })
    ])

    const result = selectBottlenecksByStage(state, 'SIMULATION')
    expect(result).toHaveLength(1)
    expect(result[0]?.workflowId).toBe('sim')
  })
})

describe('Generic Workflow Selectors', () => {
  it('selectWorstWorkflowBottlenecks sorts by severity and score', () => {
    const state = makeWorkflowState([
      makeWorkflowBottleneck({ workflowItemId: 'low', severity: 'LOW', severityScore: 30 }),
      makeWorkflowBottleneck({ workflowItemId: 'high', severity: 'HIGH', severityScore: 90 }),
      makeWorkflowBottleneck({ workflowItemId: 'medium', severity: 'MEDIUM', severityScore: 60 })
    ])

    const result = selectWorstWorkflowBottlenecks(state, 2)
    expect(result).toHaveLength(2)
    expect(result[0].workflowItemId).toBe('high')
    expect(result[1].workflowItemId).toBe('medium')
  })

  it('selectWorkflowBottlenecksByContextKey filters by simulation context', () => {
    const state = makeWorkflowState([
      makeWorkflowBottleneck({ workflowItemId: 'A', simulationContextKey: 'PRG|Plant1|Unit1|Line1|Station1' }),
      makeWorkflowBottleneck({ workflowItemId: 'B', simulationContextKey: 'PRG|Plant1|Unit1|Line1|Station2' })
    ])

    const result = selectWorkflowBottlenecksByContextKey(state, 'PRG|Plant1|Unit1|Line1|Station1')
    expect(result).toHaveLength(1)
    expect(result[0].workflowItemId).toBe('A')
  })

  it('selectWorkflowBottlenecksByKind filters by workflow item kind', () => {
    const state = makeWorkflowState([
      makeWorkflowBottleneck({ workflowItemId: 'A', kind: 'TOOLING' }),
      makeWorkflowBottleneck({ workflowItemId: 'B', kind: 'WELD_GUN' }),
      makeWorkflowBottleneck({ workflowItemId: 'C', kind: 'TOOLING' })
    ])

    const result = selectWorkflowBottlenecksByKind(state, 'TOOLING')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.workflowItemId)).toEqual(['A', 'C'])
  })

  it('selectWorkflowBottlenecksByStage filters by dominant stage', () => {
    const state = makeWorkflowState([
      makeWorkflowBottleneck({ workflowItemId: 'A', dominantStage: 'DESIGN' }),
      makeWorkflowBottleneck({ workflowItemId: 'B', dominantStage: 'SIMULATION' }),
      makeWorkflowBottleneck({ workflowItemId: 'C', dominantStage: 'DESIGN' })
    ])

    const result = selectWorkflowBottlenecksByStage(state, 'DESIGN')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.workflowItemId)).toEqual(['A', 'C'])
  })

  it('selectWorkflowBottlenecksByReason filters by bottleneck reason', () => {
    const state = makeWorkflowState([
      makeWorkflowBottleneck({ workflowItemId: 'A', bottleneckReason: 'DESIGN_BLOCKED' }),
      makeWorkflowBottleneck({ workflowItemId: 'B', bottleneckReason: 'SIM_NOT_STARTED' }),
      makeWorkflowBottleneck({ workflowItemId: 'C', bottleneckReason: 'DESIGN_BLOCKED' })
    ])

    const result = selectWorkflowBottlenecksByReason(state, 'DESIGN_BLOCKED')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.workflowItemId)).toEqual(['A', 'C'])
  })

  it('selectWorkflowBottleneckStats computes statistics', () => {
    const state = makeWorkflowState([
      makeWorkflowBottleneck({ workflowItemId: 'A', kind: 'TOOLING', severity: 'HIGH', dominantStage: 'DESIGN', bottleneckReason: 'DESIGN_BLOCKED' }),
      makeWorkflowBottleneck({ workflowItemId: 'B', kind: 'WELD_GUN', severity: 'MEDIUM', dominantStage: 'SIMULATION', bottleneckReason: 'SIM_NOT_STARTED' }),
      makeWorkflowBottleneck({ workflowItemId: 'C', kind: 'TOOLING', severity: 'LOW', dominantStage: 'MANUFACTURE', bottleneckReason: 'MISSING_ASSETS' })
    ])

    const stats = selectWorkflowBottleneckStats(state)

    expect(stats.total).toBe(3)
    expect(stats.bySeverity.HIGH).toBe(1)
    expect(stats.bySeverity.MEDIUM).toBe(1)
    expect(stats.bySeverity.LOW).toBe(1)
    expect(stats.byStage.DESIGN).toBe(1)
    expect(stats.byStage.SIMULATION).toBe(1)
    expect(stats.byStage.MANUFACTURE).toBe(1)
    expect(stats.byReason.DESIGN_BLOCKED).toBe(1)
    expect(stats.byReason.SIM_NOT_STARTED).toBe(1)
    expect(stats.byReason.MISSING_ASSETS).toBe(1)
  })

  it('returns empty arrays when no bottlenecks exist', () => {
    const state = makeWorkflowState([])

    expect(selectWorstWorkflowBottlenecks(state)).toEqual([])
    expect(selectWorkflowBottlenecksByContextKey(state, 'any')).toEqual([])
    expect(selectWorkflowBottlenecksByKind(state, 'TOOLING')).toEqual([])
    expect(selectWorkflowBottlenecksByStage(state, 'DESIGN')).toEqual([])
    expect(selectWorkflowBottlenecksByReason(state, 'DESIGN_BLOCKED')).toEqual([])
  })
})
