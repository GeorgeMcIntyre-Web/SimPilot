import { randomUUID } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import {
  selectWorstBottlenecks,
  selectBottlenecksByStationKey,
  selectBottlenecksForToolingNumber,
  selectBottlenecksByStage
} from '../simPilotSelectors'
import type { SimPilotStoreState } from '../simPilotStore'
import type { ToolingWorkflowStatus, WorkflowStage, StageStatusSnapshot } from '../toolingTypes'

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
    }
  },
  isLoading: false,
  errors: []
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
