/**
 * WORKFLOW BOTTLENECK LINKER TESTS
 *
 * Tests for generic bottleneck analysis engine
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeWorkflowItem,
  analyzeWorkflowBottlenecks,
  getWorstBottlenecks,
  getBottlenecksByContextKey,
  getBottleneckStats
} from '../workflowBottleneckLinker'
import type { WorkflowItem } from '../workflowTypes'

function createMockWorkflowItem(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    id: 'WF001',
    kind: 'TOOLING',
    simulationContextKey: 'STLA|Plant1|Unit1|Line1|Station1',
    name: 'Test Item',
    itemNumber: 'ITEM-001',
    designStageStatus: {
      stage: 'DESIGN',
      status: 'IN_PROGRESS',
      percentComplete: 50
    },
    simulationStageStatus: {
      stage: 'SIMULATION',
      status: 'IN_PROGRESS',
      percentComplete: 30
    },
    manufactureStageStatus: {
      stage: 'MANUFACTURE',
      status: 'NOT_STARTED',
      percentComplete: 0
    },
    ...overrides
  }
}

describe('analyzeWorkflowItem', () => {
  it('should detect DESIGN_BLOCKED when design is blocked', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'BLOCKED',
        percentComplete: 20
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('DESIGN_BLOCKED')
    expect(result.dominantStage).toBe('DESIGN')
    expect(result.severity).toBe('HIGH')
  })

  it('should detect DESIGN_NOT_DETAILED when design incomplete', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'IN_PROGRESS',
        percentComplete: 40
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'NOT_STARTED',
        percentComplete: 0
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('DESIGN_NOT_DETAILED')
    expect(result.dominantStage).toBe('DESIGN')
    expect(result.severity).toBe('HIGH')
  })

  it('should detect SIM_BLOCKED when simulation is blocked', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'BLOCKED',
        percentComplete: 30
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('SIM_BLOCKED')
    expect(result.dominantStage).toBe('SIMULATION')
    expect(result.severity).toBe('HIGH')
  })

  it('should detect SIM_CHANGES_REQUESTED when simulation needs changes', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'CHANGES_REQUESTED',
        percentComplete: 60
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('SIM_CHANGES_REQUESTED')
    expect(result.dominantStage).toBe('SIMULATION')
    expect(result.severity).toBe('HIGH')
  })

  it('should detect SIM_NOT_STARTED when design done but sim not started', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'NOT_STARTED',
        percentComplete: 0
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('SIM_NOT_STARTED')
    expect(result.dominantStage).toBe('SIMULATION')
    expect(result.severity).toBe('MEDIUM')
  })

  it('should detect SIM_BEHIND_DESIGN when sim is very behind', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'IN_PROGRESS',
        percentComplete: 10  // Very low progress
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('SIM_BEHIND_DESIGN')
    expect(result.dominantStage).toBe('SIMULATION')
    expect(result.severity).toBe('MEDIUM')
  })

  it('should detect BUILD_AHEAD_OF_SIM when mfg started without sim approval', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'IN_PROGRESS',
        percentComplete: 60
      },
      manufactureStageStatus: {
        stage: 'MANUFACTURE',
        status: 'IN_PROGRESS',
        percentComplete: 20
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('BUILD_AHEAD_OF_SIM')
    expect(result.severity).toBe('CRITICAL')
  })

  it('should detect MISSING_ASSETS when sim approved but no assets', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'APPROVED',
        percentComplete: 100
      },
      manufactureStageStatus: {
        stage: 'MANUFACTURE',
        status: 'NOT_STARTED',
        percentComplete: 0
      },
      hasAssets: false
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('MISSING_ASSETS')
    expect(result.dominantStage).toBe('MANUFACTURE')
    expect(result.severity).toBe('LOW')
  })

  it('should detect SUPPLIER_DELAY when external supplier item is behind', () => {
    const item = createMockWorkflowItem({
      externalSupplierName: 'ACME Corp',
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'APPROVED',
        percentComplete: 100
      },
      manufactureStageStatus: {
        stage: 'MANUFACTURE',
        status: 'IN_PROGRESS',
        percentComplete: 30  // Low progress from supplier
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('SUPPLIER_DELAY')
    expect(result.dominantStage).toBe('EXTERNAL_SUPPLIER')
    expect(result.severity).toBe('MEDIUM')
  })

  it('should detect MANUFACTURE_CONSTRAINT when mfg is blocked', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'APPROVED',
        percentComplete: 100
      },
      manufactureStageStatus: {
        stage: 'MANUFACTURE',
        status: 'BLOCKED',
        percentComplete: 40
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('MANUFACTURE_CONSTRAINT')
    expect(result.dominantStage).toBe('MANUFACTURE')
    expect(result.severity).toBe('MEDIUM')
  })

  it('should return OK when all stages are complete', () => {
    const item = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'APPROVED',
        percentComplete: 100
      },
      manufactureStageStatus: {
        stage: 'MANUFACTURE',
        status: 'COMPLETE',
        percentComplete: 100
      }
    })

    const result = analyzeWorkflowItem(item)

    expect(result.bottleneckReason).toBe('OK')
    expect(result.severity).toBe('OK')
  })

  it('should compute severity scores', () => {
    const item1 = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'BLOCKED',
        percentComplete: 10
      }
    })

    const item2 = createMockWorkflowItem({
      designStageStatus: {
        stage: 'DESIGN',
        status: 'COMPLETE',
        percentComplete: 100
      },
      simulationStageStatus: {
        stage: 'SIMULATION',
        status: 'APPROVED',
        percentComplete: 100
      },
      manufactureStageStatus: {
        stage: 'MANUFACTURE',
        status: 'COMPLETE',
        percentComplete: 100
      }
    })

    const result1 = analyzeWorkflowItem(item1)
    const result2 = analyzeWorkflowItem(item2)

    // Blocked item should have higher severity score than complete item
    expect(result1.severityScore).toBeGreaterThan(result2.severityScore)
  })
})

describe('analyzeWorkflowBottlenecks', () => {
  it('should analyze multiple workflow items', () => {
    const items: WorkflowItem[] = [
      createMockWorkflowItem({ id: 'WF001' }),
      createMockWorkflowItem({ id: 'WF002' }),
      createMockWorkflowItem({ id: 'WF003' })
    ]

    const results = analyzeWorkflowBottlenecks(items)

    expect(results).toHaveLength(3)
    expect(results[0].workflowItemId).toBe('WF001')
    expect(results[1].workflowItemId).toBe('WF002')
    expect(results[2].workflowItemId).toBe('WF003')
  })
})

describe('getWorstBottlenecks', () => {
  it('should return worst bottlenecks sorted by severity', () => {
    const items: WorkflowItem[] = [
      createMockWorkflowItem({
        id: 'WF001',
        designStageStatus: {
          stage: 'DESIGN',
          status: 'COMPLETE',
          percentComplete: 100
        },
        simulationStageStatus: {
          stage: 'SIMULATION',
          status: 'APPROVED',
          percentComplete: 100
        },
        manufactureStageStatus: {
          stage: 'MANUFACTURE',
          status: 'COMPLETE',
          percentComplete: 100
        }
      }),
      createMockWorkflowItem({
        id: 'WF002',
        designStageStatus: {
          stage: 'DESIGN',
          status: 'BLOCKED',
          percentComplete: 20
        }
      }),
      createMockWorkflowItem({
        id: 'WF003',
        designStageStatus: {
          stage: 'DESIGN',
          status: 'IN_PROGRESS',
          percentComplete: 40
        },
        simulationStageStatus: {
          stage: 'SIMULATION',
          status: 'NOT_STARTED',
          percentComplete: 0
        }
      })
    ]

    const bottlenecks = analyzeWorkflowBottlenecks(items)
    const worst = getWorstBottlenecks(bottlenecks, 2)

    expect(worst).toHaveLength(2)
    // First should be the blocked one (HIGH severity)
    expect(worst[0].severity).toBe('HIGH')
    expect(worst[0].workflowItemId).toBe('WF002')
  })
})

describe('getBottlenecksByContextKey', () => {
  it('should filter bottlenecks by simulation context key', () => {
    const items: WorkflowItem[] = [
      createMockWorkflowItem({
        id: 'WF001',
        simulationContextKey: 'STLA|Plant1|Unit1|Line1|Station1'
      }),
      createMockWorkflowItem({
        id: 'WF002',
        simulationContextKey: 'STLA|Plant1|Unit1|Line1|Station2'
      }),
      createMockWorkflowItem({
        id: 'WF003',
        simulationContextKey: 'STLA|Plant1|Unit1|Line1|Station1'
      })
    ]

    const bottlenecks = analyzeWorkflowBottlenecks(items)
    const filtered = getBottlenecksByContextKey(
      bottlenecks,
      'STLA|Plant1|Unit1|Line1|Station1'
    )

    expect(filtered).toHaveLength(2)
    expect(filtered[0].workflowItemId).toBe('WF001')
    expect(filtered[1].workflowItemId).toBe('WF003')
  })
})

describe('getBottleneckStats', () => {
  it('should compute statistics for bottlenecks', () => {
    const items: WorkflowItem[] = [
      createMockWorkflowItem({
        id: 'WF001',
        kind: 'TOOLING',
        designStageStatus: {
          stage: 'DESIGN',
          status: 'BLOCKED',
          percentComplete: 20
        }
      }),
      createMockWorkflowItem({
        id: 'WF002',
        kind: 'WELD_GUN',
        designStageStatus: {
          stage: 'DESIGN',
          status: 'IN_PROGRESS',
          percentComplete: 50
        },
        simulationStageStatus: {
          stage: 'SIMULATION',
          status: 'NOT_STARTED',
          percentComplete: 0
        }
      }),
      createMockWorkflowItem({
        id: 'WF003',
        kind: 'TOOLING',
        designStageStatus: {
          stage: 'DESIGN',
          status: 'COMPLETE',
          percentComplete: 100
        },
        simulationStageStatus: {
          stage: 'SIMULATION',
          status: 'APPROVED',
          percentComplete: 100
        },
        manufactureStageStatus: {
          stage: 'MANUFACTURE',
          status: 'COMPLETE',
          percentComplete: 100
        }
      })
    ]

    const bottlenecks = analyzeWorkflowBottlenecks(items)
    const stats = getBottleneckStats(bottlenecks)

    expect(stats.total).toBe(3)
    expect(stats.bySeverity.HIGH).toBe(2) // WF001 blocked + WF002 design not detailed = HIGH
    expect(stats.bySeverity.OK).toBe(1) // WF003 is complete
  })
})
