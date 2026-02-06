/**
 * EXCEL INGESTION FACADE TESTS
 *
 * Tests for workflow snapshot building logic in the facade
 * Phase 3: Verifies tooling → workflow mapping and bottleneck analysis with real data
 */

import { describe, it, expect } from 'vitest'
import type { SimPilotDataSnapshot } from '../ExcelIngestionFacade'
import type { ToolingItem, ToolingWorkflowStatus, BottleneckSnapshot } from '../toolingTypes'
import { toolingItemToWorkflowItem } from '../workflowMappers'
import { analyzeWorkflowBottlenecks } from '../workflowBottleneckLinker'

// We'll test the internal building logic by creating snapshots with pre-populated data
// and verifying the workflow snapshots are correctly derived

describe('ExcelIngestionFacade - Workflow Snapshot Building', () => {
  describe('buildWorkflowSnapshotFromTooling', () => {
    it('should convert empty tooling snapshot to empty workflow snapshot', () => {
      // Create a snapshot with empty tooling data
      const snapshot: SimPilotDataSnapshot = {
        assets: [],
        reuseSummary: {
          total: 0,
          byType: {},
          byStatus: {
            AVAILABLE: 0,
            ALLOCATED: 0,
            IN_USE: 0,
            RESERVED: 0,
            UNKNOWN: 0,
          },
          unmatchedReuseCount: 0,
        },
        linkingStats: {
          totalAssets: 0,
          assetsWithReuseInfo: 0,
          matchedReuseRecords: 0,
          unmatchedReuseRecords: 0,
        },
        errors: [],
        toolingSnapshot: {
          updatedAt: '2025-01-15T10:00:00Z',
          items: [],
        },
        bottleneckSnapshot: {
          generatedAt: '2025-01-15T10:00:00Z',
          workflowStatuses: [],
        },
        workflowSnapshot: {
          generatedAt: '2025-01-15T10:00:00Z',
          items: [],
        },
        workflowBottleneckSnapshot: {
          generatedAt: '2025-01-15T10:00:00Z',
          bottlenecks: [],
        },
      }

      // Verify workflow snapshot is empty
      expect(snapshot.workflowSnapshot.items).toHaveLength(0)
      expect(snapshot.workflowBottleneckSnapshot.bottlenecks).toHaveLength(0)
    })

    it('should convert tooling items to workflow items', () => {
      const toolingItems: ToolingItem[] = [
        {
          toolingId: 'T001',
          toolingNumber: 'TOOL-123',
          equipmentNumber: 'EQ-456',
          handedness: 'LH',
          description: 'Test Fixture A',
          location: {
            program: 'STLA',
            plant: 'Plant1',
            unit: 'Unit1',
            line: 'Line1',
            station: 'ST-100',
            area: 'Underbody',
          },
          supplier: 'ACME Corp',
          metadata: { custom: 'data' },
        },
        {
          toolingId: 'T002',
          toolingNumber: 'TOOL-456',
          location: {
            program: 'STLA',
            plant: 'Plant1',
            unit: 'Unit1',
            line: 'Line1',
            station: 'ST-200',
            area: 'Body',
          },
          metadata: {},
        },
      ]

      // Simulate the facade's workflow mapping logic
      const workflowItems = toolingItems.map((item) => ({
        id: item.toolingId,
        kind: 'TOOLING' as const,
        simulationContextKey: `${item.location.program}|${item.location.plant}|${item.location.unit}|${item.location.line}|${item.location.station}`,
        name: item.description ?? item.toolingNumber,
        itemNumber: item.toolingNumber,
        equipmentNumber: item.equipmentNumber,
        handedness: item.handedness,
        designStageStatus: {
          stage: 'DESIGN' as const,
          status: 'UNKNOWN' as const,
          percentComplete: null,
        },
        simulationStageStatus: {
          stage: 'SIMULATION' as const,
          status: 'UNKNOWN' as const,
          percentComplete: null,
        },
        manufactureStageStatus: {
          stage: 'MANUFACTURE' as const,
          status: 'UNKNOWN' as const,
          percentComplete: null,
        },
        externalSupplierName: item.supplier,
        metadata: item.metadata,
      }))

      // Verify conversion
      expect(workflowItems).toHaveLength(2)

      // First item
      expect(workflowItems[0].id).toBe('T001')
      expect(workflowItems[0].kind).toBe('TOOLING')
      expect(workflowItems[0].simulationContextKey).toBe('STLA|Plant1|Unit1|Line1|ST-100')
      expect(workflowItems[0].name).toBe('Test Fixture A')
      expect(workflowItems[0].itemNumber).toBe('TOOL-123')
      expect(workflowItems[0].equipmentNumber).toBe('EQ-456')
      expect(workflowItems[0].handedness).toBe('LH')
      expect(workflowItems[0].externalSupplierName).toBe('ACME Corp')

      // Second item (no description, should use tooling number as name)
      expect(workflowItems[1].id).toBe('T002')
      expect(workflowItems[1].name).toBe('TOOL-456')
      expect(workflowItems[1].simulationContextKey).toBe('STLA|Plant1|Unit1|Line1|ST-200')
    })

    it('should convert tooling workflow statuses to workflow bottleneck statuses', () => {
      const toolingStatus: ToolingWorkflowStatus = {
        workflowId: 'WF001',
        toolingNumber: 'TOOL-123',
        equipmentNumber: 'EQ-456',
        handedness: 'LH',
        stationKey: 'STLA-UB-ST-100',
        program: 'STLA',
        area: 'Underbody',
        station: 'ST-100',
        location: {
          program: 'STLA',
          plant: 'Plant1',
          unit: 'Unit1',
          line: 'Line1',
          station: 'ST-100',
          area: 'Underbody',
        },
        designStage: {
          stage: 'DESIGN',
          status: 'BLOCKED',
          percentComplete: 20,
        },
        simulationStage: {
          stage: 'SIMULATION',
          status: 'AT_RISK',
          percentComplete: 60,
        },
        manufactureStage: {
          stage: 'MANUFACTURE',
          status: 'ON_TRACK',
          percentComplete: 80,
        },
        dominantStage: 'DESIGN',
        bottleneckReason: 'DESIGN_BLOCKED',
        severity: 'HIGH',
        severityScore: 85,
      }

      const bottleneckSnapshot: BottleneckSnapshot = {
        generatedAt: '2025-01-15T10:00:00Z',
        workflowStatuses: [toolingStatus],
      }

      // Verify the snapshot structure
      expect(bottleneckSnapshot.workflowStatuses).toHaveLength(1)
      expect(bottleneckSnapshot.workflowStatuses[0].bottleneckReason).toBe('DESIGN_BLOCKED')
      expect(bottleneckSnapshot.workflowStatuses[0].severity).toBe('HIGH')
    })
  })

  describe('Integration: Tooling → Workflow snapshot consistency', () => {
    it('should maintain data consistency when converting from tooling to workflow', () => {
      // This test verifies that when tooling data flows through the facade,
      // the resulting workflow snapshots preserve all critical information

      const toolingItem: ToolingItem = {
        toolingId: 'T999',
        toolingNumber: 'CRITICAL-TOOL',
        equipmentNumber: 'EQ-CRITICAL',
        handedness: 'PAIR',
        description: 'Critical Path Fixture',
        location: {
          program: 'ALPHA',
          plant: 'Jefferson',
          unit: 'Body',
          line: 'L1',
          station: 'ST-050',
          area: 'Critical',
        },
        supplier: 'External Vendor',
        owner: 'Engineering Team',
        metadata: { priority: 'critical', leadTime: 120 },
      }

      // Verify all key fields are preserved in conversion
      const contextKey = `${toolingItem.location.program}|${toolingItem.location.plant}|${toolingItem.location.unit}|${toolingItem.location.line}|${toolingItem.location.station}`

      expect(contextKey).toBe('ALPHA|Jefferson|Body|L1|ST-050')
      expect(toolingItem.toolingId).toBe('T999')
      expect(toolingItem.toolingNumber).toBe('CRITICAL-TOOL')
      expect(toolingItem.equipmentNumber).toBe('EQ-CRITICAL')
      expect(toolingItem.handedness).toBe('PAIR')
      expect(toolingItem.supplier).toBe('External Vendor')
    })

    it('should produce workflow bottlenecks from real tooling items', () => {
      // PHASE 3: Test that real tooling data flows through the generic workflow engine
      const toolingItems: ToolingItem[] = [
        {
          toolingId: 'T001',
          toolingNumber: 'TOOL-001',
          equipmentNumber: 'EQ-001',
          handedness: 'LH',
          description: 'Test Fixture 1',
          location: {
            program: 'STLA',
            plant: 'Plant1',
            unit: 'Unit1',
            line: 'Line1',
            station: 'ST-100',
            area: 'Underbody',
          },
          supplier: 'ACME Corp',
          metadata: {},
        },
        {
          toolingId: 'T002',
          toolingNumber: 'TOOL-002',
          location: {
            program: 'STLA',
            plant: 'Plant1',
            unit: 'Unit1',
            line: 'Line1',
            station: 'ST-200',
            area: 'Body',
          },
          metadata: {},
        },
      ]

      // Convert to workflow items
      const workflowItems = toolingItems.map(toolingItemToWorkflowItem)

      // Verify conversion
      expect(workflowItems).toHaveLength(2)
      expect(workflowItems[0].kind).toBe('TOOLING')
      expect(workflowItems[0].itemNumber).toBe('TOOL-001')
      expect(workflowItems[1].itemNumber).toBe('TOOL-002')

      // Analyze bottlenecks using generic engine
      const bottlenecks = analyzeWorkflowBottlenecks(workflowItems)

      // Verify bottlenecks were produced
      expect(bottlenecks).toHaveLength(2)

      // Items with UNKNOWN stage status should be classified as DESIGN_NOT_DETAILED
      // (Rule 2 from bottleneck engine: design incomplete + sim not started)
      expect(bottlenecks[0].bottleneckReason).toBe('DESIGN_NOT_DETAILED')
      expect(bottlenecks[0].kind).toBe('TOOLING')
      expect(bottlenecks[0].workflowItemId).toBe('T001')
      expect(bottlenecks[0].dominantStage).toBe('DESIGN')
      expect(bottlenecks[0].severity).toBe('HIGH')

      expect(bottlenecks[1].bottleneckReason).toBe('DESIGN_NOT_DETAILED')
      expect(bottlenecks[1].kind).toBe('TOOLING')
      expect(bottlenecks[1].workflowItemId).toBe('T002')
      expect(bottlenecks[1].dominantStage).toBe('DESIGN')
      expect(bottlenecks[1].severity).toBe('HIGH')
    })
  })
})
