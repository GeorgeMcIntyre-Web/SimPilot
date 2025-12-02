import { describe, it, expect } from 'vitest'
import { createToolingBottleneckState, type ToolingWorkflowStatus } from '../toolingBottleneckStore'
import {
  selectBottlenecksByStationKey,
  selectBottlenecksForToolingNumber,
  selectBottleneckStageForAsset,
  type SimPilotSelectorState
} from '../simPilotSelectors'

const sampleStatuses: ToolingWorkflowStatus[] = [
  {
    toolingNumber: 'T-100',
    toolType: 'Gripper',
    stationKey: 'STLA|PLT|UNIT|LINE|010',
    stationNumber: '010',
    dominantStage: 'DESIGN',
    bottleneckReason: 'BUILD_AHEAD_OF_SIM',
    severity: 'critical',
    designStage: { stage: 'DESIGN', status: 'BLOCKED' },
    simulationStage: { stage: 'SIMULATION', status: 'ON_TRACK' }
  },
  {
    toolingNumber: 'T-200',
    toolType: 'Gun',
    stationKey: 'STLA|PLT|UNIT|LINE|020',
    stationNumber: '020',
    dominantStage: 'SIMULATION',
    bottleneckReason: 'SIM_CHANGES_REQUESTED',
    severity: 'warning',
    designStage: { stage: 'DESIGN', status: 'ON_TRACK' },
    simulationStage: { stage: 'SIMULATION', status: 'BLOCKED' }
  }
]

describe('simPilotSelectors', () => {
  const bottleneckState = createToolingBottleneckState(sampleStatuses)

  const selectorState: SimPilotSelectorState = {
    toolingBottlenecks: bottleneckState,
    assets: [
      {
        id: 'asset-1',
        name: 'Tool Fixture',
        kind: 'TOOL',
        sourcing: 'NEW_BUY',
        stationNumber: '010',
        metadata: {
          toolingNumber: 'T-100'
        },
        sourceFile: 'test.xlsx',
        sheetName: 'TOOLS',
        rowIndex: 1
      },
      {
        id: 'asset-2',
        name: 'Robot Blocked',
        kind: 'ROBOT',
        sourcing: 'REUSE',
        stationNumber: '020',
        metadata: {},
        sourceFile: 'test.xlsx',
        sheetName: 'TOOLS',
        rowIndex: 2
      }
    ]
  }

  it('selects bottlenecks by station key', () => {
    const matches = selectBottlenecksByStationKey(bottleneckState, 'STLA|PLT|UNIT|LINE|010')
    expect(matches).toHaveLength(1)
    expect(matches[0].toolingNumber).toBe('T-100')
  })

  it('selects bottleneck by tooling number', () => {
    const match = selectBottlenecksForToolingNumber(bottleneckState, 'T-200')
    expect(match).not.toBeNull()
    expect(match?.stationNumber).toBe('020')
  })

  it('maps asset to bottleneck via tooling number', () => {
    const summary = selectBottleneckStageForAsset(selectorState, 'asset-1')
    expect(summary).not.toBeNull()
    expect(summary?.stage).toBe('DESIGN')
    expect(summary?.toolingNumber).toBe('T-100')
  })

  it('falls back to station number match when tooling number missing', () => {
    const summary = selectBottleneckStageForAsset(selectorState, 'asset-2')
    expect(summary).not.toBeNull()
    expect(summary?.stage).toBe('SIMULATION')
    expect(summary?.toolingNumber).toBe('T-200')
  })
})
