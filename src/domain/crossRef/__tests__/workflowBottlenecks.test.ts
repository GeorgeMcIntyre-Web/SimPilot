/**
 * WORKFLOW BOTTLENECKS TEST SUITE
 *
 * Tests for the workflow bottleneck engine that analyzes
 * DESIGN → SIMULATION → MANUFACTURE pipeline.
 *
 * Located in crossRef/__tests__ as bottleneck analysis is integral
 * to the cross-reference engine's cell health assessment.
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeWorkflowItem,
  analyzeWorkflowBottlenecks,
  getWorstBottlenecks,
  getBottleneckStats
} from '../../workflowBottleneckLinker'
import type {
  WorkflowItem,
  WorkflowBottleneckStatus,
  StageStatusSnapshot,
  WorkflowStatus
} from '../../workflowTypes'

// ============================================================================
// TEST FIXTURE HELPERS
// ============================================================================

function makeStageSnapshot(
  stage: 'DESIGN' | 'SIMULATION' | 'MANUFACTURE',
  status: WorkflowStatus,
  percentComplete: number | null
): StageStatusSnapshot {
  return { stage, status, percentComplete }
}

function makeWorkflowItem(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    id: overrides.id ?? 'TEST-001',
    kind: overrides.kind ?? 'TOOLING',
    simulationContextKey: overrides.simulationContextKey ?? 'PROG|PLANT|UNIT|LINE|ST010',
    name: overrides.name ?? 'Test Workflow Item',
    itemNumber: overrides.itemNumber ?? 'TOOL-001',
    designStageStatus: overrides.designStageStatus ?? makeStageSnapshot('DESIGN', 'IN_PROGRESS', 50),
    simulationStageStatus: overrides.simulationStageStatus ?? makeStageSnapshot('SIMULATION', 'NOT_STARTED', 0),
    manufactureStageStatus: overrides.manufactureStageStatus ?? makeStageSnapshot('MANUFACTURE', 'NOT_STARTED', 0),
    ...overrides
  }
}

// ============================================================================
// CORE ENGINE TESTS
// ============================================================================

describe('Workflow Bottleneck Engine', () => {
  describe('analyzeWorkflowItem', () => {
    it('returns deterministic results for identical inputs', () => {
      const item = makeWorkflowItem({
        id: 'DETERMINISTIC-001',
        designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', 25)
      })

      const result1 = analyzeWorkflowItem(item)
      const result2 = analyzeWorkflowItem(item)

      expect(result1.bottleneckReason).toBe(result2.bottleneckReason)
      expect(result1.severityScore).toBe(result2.severityScore)
      expect(result1.dominantStage).toBe(result2.dominantStage)
    })

    it('preserves workflowItemId from input', () => {
      const item = makeWorkflowItem({ id: 'UNIQUE-ID-123' })
      const result = analyzeWorkflowItem(item)

      expect(result.workflowItemId).toBe('UNIQUE-ID-123')
    })

    it('preserves kind from input', () => {
      const item = makeWorkflowItem({ kind: 'WELD_GUN' })
      const result = analyzeWorkflowItem(item)

      expect(result.kind).toBe('WELD_GUN')
    })

    it('preserves simulationContextKey from input', () => {
      const item = makeWorkflowItem({
        simulationContextKey: 'STLA|PLANT_A|UNIT_1|LINE_2|STATION_030'
      })
      const result = analyzeWorkflowItem(item)

      expect(result.simulationContextKey).toBe('STLA|PLANT_A|UNIT_1|LINE_2|STATION_030')
    })
  })

  describe('bottleneck detection priority', () => {
    it('detects design blocked as highest priority', () => {
      const item = makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', 20),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'BLOCKED', 10),
        manufactureStageStatus: makeStageSnapshot('MANUFACTURE', 'BLOCKED', 5)
      })

      const result = analyzeWorkflowItem(item)

      expect(result.bottleneckReason).toBe('DESIGN_BLOCKED')
      expect(result.dominantStage).toBe('DESIGN')
    })

    it('detects design not detailed when design incomplete and sim not started', () => {
      const item = makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'IN_PROGRESS', 40),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'NOT_STARTED', 0)
      })

      const result = analyzeWorkflowItem(item)

      expect(result.bottleneckReason).toBe('DESIGN_NOT_DETAILED')
    })

    it('detects simulation blocked after design is complete', () => {
      const item = makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'BLOCKED', 30)
      })

      const result = analyzeWorkflowItem(item)

      expect(result.bottleneckReason).toBe('SIM_BLOCKED')
      expect(result.dominantStage).toBe('SIMULATION')
    })

    it('detects simulation changes requested', () => {
      const item = makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'CHANGES_REQUESTED', 60)
      })

      const result = analyzeWorkflowItem(item)

      expect(result.bottleneckReason).toBe('SIM_CHANGES_REQUESTED')
    })

    it('detects build ahead of simulation', () => {
      const item = makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'IN_PROGRESS', 50),
        manufactureStageStatus: makeStageSnapshot('MANUFACTURE', 'IN_PROGRESS', 20)
      })

      const result = analyzeWorkflowItem(item)

      expect(result.bottleneckReason).toBe('BUILD_AHEAD_OF_SIM')
      expect(result.severity).toBe('CRITICAL')
    })
  })

  describe('severity scoring', () => {
    it('assigns higher score to blocked design than in-progress', () => {
      const blockedItem = makeWorkflowItem({
        id: 'BLOCKED',
        designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', 10)
      })

      const inProgressItem = makeWorkflowItem({
        id: 'IN_PROGRESS',
        designStageStatus: makeStageSnapshot('DESIGN', 'IN_PROGRESS', 90),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'NOT_STARTED', 0)
      })

      const blockedResult = analyzeWorkflowItem(blockedItem)
      const inProgressResult = analyzeWorkflowItem(inProgressItem)

      expect(blockedResult.severityScore).toBeGreaterThan(inProgressResult.severityScore)
    })

    it('assigns zero or low score to completed items', () => {
      const completedItem = makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'APPROVED', 100),
        manufactureStageStatus: makeStageSnapshot('MANUFACTURE', 'COMPLETE', 100)
      })

      const result = analyzeWorkflowItem(completedItem)

      expect(result.severityScore).toBeLessThan(20)
      expect(result.bottleneckReason).toBe('OK')
    })

    it('includes severity boost for critical issues', () => {
      // BUILD_AHEAD_OF_SIM is CRITICAL - score = (100 - dominantStagePercent) + boost
      // Here design is dominant since it triggered the rule, but design is 100% complete
      // So score = (100 - 100) + 30 = 30 (CRITICAL boost)
      const criticalItem = makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'IN_PROGRESS', 60),
        manufactureStageStatus: makeStageSnapshot('MANUFACTURE', 'IN_PROGRESS', 20)
      })

      const result = analyzeWorkflowItem(criticalItem)

      expect(result.severity).toBe('CRITICAL')
      // Score includes the 30-point CRITICAL boost
      expect(result.severityScore).toBeGreaterThanOrEqual(30)
    })
  })
})

// ============================================================================
// BATCH ANALYSIS TESTS
// ============================================================================

describe('Batch Bottleneck Analysis', () => {
  describe('analyzeWorkflowBottlenecks', () => {
    it('processes empty list without error', () => {
      const results = analyzeWorkflowBottlenecks([])

      expect(results).toHaveLength(0)
    })

    it('processes multiple items preserving order', () => {
      const items = [
        makeWorkflowItem({ id: 'FIRST' }),
        makeWorkflowItem({ id: 'SECOND' }),
        makeWorkflowItem({ id: 'THIRD' })
      ]

      const results = analyzeWorkflowBottlenecks(items)

      expect(results).toHaveLength(3)
      expect(results[0].workflowItemId).toBe('FIRST')
      expect(results[1].workflowItemId).toBe('SECOND')
      expect(results[2].workflowItemId).toBe('THIRD')
    })
  })

  describe('getWorstBottlenecks', () => {
    it('returns bottlenecks sorted by severity score descending', () => {
      const items = [
        makeWorkflowItem({
          id: 'LOW',
          designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
          simulationStageStatus: makeStageSnapshot('SIMULATION', 'APPROVED', 100),
          manufactureStageStatus: makeStageSnapshot('MANUFACTURE', 'COMPLETE', 100)
        }),
        makeWorkflowItem({
          id: 'HIGH',
          designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', 10)
        }),
        makeWorkflowItem({
          id: 'MEDIUM',
          designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
          simulationStageStatus: makeStageSnapshot('SIMULATION', 'NOT_STARTED', 0)
        })
      ]

      const bottlenecks = analyzeWorkflowBottlenecks(items)
      const worst = getWorstBottlenecks(bottlenecks, 3)

      expect(worst[0].workflowItemId).toBe('HIGH')
      expect(worst[2].workflowItemId).toBe('LOW')
    })

    it('respects limit parameter', () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        makeWorkflowItem({
          id: `ITEM-${i}`,
          designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', i * 10)
        })
      )

      const bottlenecks = analyzeWorkflowBottlenecks(items)
      const worst = getWorstBottlenecks(bottlenecks, 3)

      expect(worst).toHaveLength(3)
    })

    it('returns all when no limit specified', () => {
      const items = [
        makeWorkflowItem({ id: 'A' }),
        makeWorkflowItem({ id: 'B' })
      ]

      const bottlenecks = analyzeWorkflowBottlenecks(items)
      const worst = getWorstBottlenecks(bottlenecks)

      expect(worst).toHaveLength(2)
    })
  })
})

// ============================================================================
// STATISTICS TESTS
// ============================================================================

describe('Bottleneck Statistics', () => {
  describe('getBottleneckStats', () => {
    it('computes correct totals', () => {
      const items = [
        makeWorkflowItem({ id: 'A' }),
        makeWorkflowItem({ id: 'B' }),
        makeWorkflowItem({ id: 'C' })
      ]

      const bottlenecks = analyzeWorkflowBottlenecks(items)
      const stats = getBottleneckStats(bottlenecks)

      expect(stats.total).toBe(3)
    })

    it('groups by severity correctly', () => {
      const items = [
        // HIGH - design blocked
        makeWorkflowItem({
          id: 'HIGH-1',
          designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', 20)
        }),
        // OK - complete
        makeWorkflowItem({
          id: 'OK-1',
          designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
          simulationStageStatus: makeStageSnapshot('SIMULATION', 'APPROVED', 100),
          manufactureStageStatus: makeStageSnapshot('MANUFACTURE', 'COMPLETE', 100)
        }),
        // MEDIUM - sim not started
        makeWorkflowItem({
          id: 'MEDIUM-1',
          designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
          simulationStageStatus: makeStageSnapshot('SIMULATION', 'NOT_STARTED', 0)
        })
      ]

      const bottlenecks = analyzeWorkflowBottlenecks(items)
      const stats = getBottleneckStats(bottlenecks)

      expect(stats.bySeverity.HIGH).toBe(1)
      expect(stats.bySeverity.MEDIUM).toBe(1)
      expect(stats.bySeverity.OK).toBe(1)
    })

    it('groups by stage correctly', () => {
      const items = [
        // DESIGN stage
        makeWorkflowItem({
          id: 'DESIGN-1',
          designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', 20)
        }),
        // SIMULATION stage
        makeWorkflowItem({
          id: 'SIM-1',
          designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
          simulationStageStatus: makeStageSnapshot('SIMULATION', 'BLOCKED', 30)
        }),
        // MANUFACTURE stage
        makeWorkflowItem({
          id: 'MFG-1',
          designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
          simulationStageStatus: makeStageSnapshot('SIMULATION', 'APPROVED', 100),
          manufactureStageStatus: makeStageSnapshot('MANUFACTURE', 'COMPLETE', 100)
        })
      ]

      const bottlenecks = analyzeWorkflowBottlenecks(items)
      const stats = getBottleneckStats(bottlenecks)

      expect(stats.byStage.DESIGN).toBe(1)
      expect(stats.byStage.SIMULATION).toBe(1)
      expect(stats.byStage.MANUFACTURE).toBe(1)
    })

    it('handles empty input', () => {
      const stats = getBottleneckStats([])

      expect(stats.total).toBe(0)
    })
  })
})

// ============================================================================
// DATA SHAPE VERIFICATION
// ============================================================================

describe('Bottleneck Data Shape', () => {
  it('WorkflowBottleneckStatus has all required fields', () => {
    const item = makeWorkflowItem({ id: 'SHAPE-TEST' })
    const result = analyzeWorkflowItem(item)

    // Required string fields
    expect(typeof result.workflowItemId).toBe('string')
    expect(typeof result.kind).toBe('string')
    expect(typeof result.simulationContextKey).toBe('string')
    expect(typeof result.dominantStage).toBe('string')
    expect(typeof result.bottleneckReason).toBe('string')
    expect(typeof result.severity).toBe('string')

    // Required numeric field
    expect(typeof result.severityScore).toBe('number')

    // Required array field
    expect(Array.isArray(result.blockingItemIds)).toBe(true)

    // Required stage snapshots
    expect(result.designStage).toBeDefined()
    expect(result.simulationStage).toBeDefined()
    expect(result.manufactureStage).toBeDefined()
  })

  it('severity values are from expected enum', () => {
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'OK']

    const items = [
      makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', 10)
      }),
      makeWorkflowItem({
        designStageStatus: makeStageSnapshot('DESIGN', 'COMPLETE', 100),
        simulationStageStatus: makeStageSnapshot('SIMULATION', 'APPROVED', 100),
        manufactureStageStatus: makeStageSnapshot('MANUFACTURE', 'COMPLETE', 100)
      })
    ]

    const bottlenecks = analyzeWorkflowBottlenecks(items)

    for (const b of bottlenecks) {
      expect(validSeverities).toContain(b.severity)
    }
  })

  it('dominantStage values are from expected enum', () => {
    const validStages = ['DESIGN', 'SIMULATION', 'MANUFACTURE', 'EXTERNAL_SUPPLIER', 'UNKNOWN']

    const item = makeWorkflowItem({
      designStageStatus: makeStageSnapshot('DESIGN', 'BLOCKED', 20)
    })

    const result = analyzeWorkflowItem(item)

    expect(validStages).toContain(result.dominantStage)
  })
})
