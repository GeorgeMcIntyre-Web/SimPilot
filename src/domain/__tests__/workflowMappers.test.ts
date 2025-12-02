/**
 * WORKFLOW MAPPERS TESTS
 *
 * Tests for converting asset-specific types to generic WorkflowItem
 */

import { describe, it, expect } from 'vitest'
import {
  toolingItemToWorkflowItem,
  toolingWorkflowStatusToWorkflowItem
} from '../workflowMappers'
import type { ToolingItem, ToolingWorkflowStatus } from '../toolingTypes'

describe('toolingItemToWorkflowItem', () => {
  it('should convert basic tooling item to workflow item', () => {
    const toolingItem: ToolingItem = {
      toolingId: 'T001',
      toolingNumber: 'TOOL-123',
      equipmentNumber: 'EQ-456',
      description: 'Test Fixture',
      handedness: 'LH',
      location: {
        program: 'STLA',
        plant: 'Plant1',
        unit: 'Unit1',
        line: 'Line1',
        station: 'Station1',
        area: 'Area1'
      },
      supplier: 'ACME Corp',
      metadata: { custom: 'data' }
    }

    const result = toolingItemToWorkflowItem(toolingItem)

    expect(result.id).toBe('T001')
    expect(result.kind).toBe('TOOLING')
    expect(result.simulationContextKey).toBe('STLA|Plant1|Unit1|Line1|Station1')
    expect(result.name).toBe('Test Fixture')
    expect(result.itemNumber).toBe('TOOL-123')
    expect(result.equipmentNumber).toBe('EQ-456')
    expect(result.handedness).toBe('LH')
    expect(result.externalSupplierName).toBe('ACME Corp')
    expect(result.metadata).toEqual({ custom: 'data' })
  })

  it('should use tooling number as name when description is missing', () => {
    const toolingItem: ToolingItem = {
      toolingId: 'T002',
      toolingNumber: 'TOOL-999',
      location: {
        program: 'STLA',
        plant: 'P1',
        unit: 'U1',
        line: 'L1',
        station: 'S1',
        area: 'A1'
      }
    }

    const result = toolingItemToWorkflowItem(toolingItem)

    expect(result.name).toBe('TOOL-999')
  })

  it('should create unknown stage snapshots when tooling item has no stage data', () => {
    const toolingItem: ToolingItem = {
      toolingId: 'T003',
      toolingNumber: 'TOOL-AAA',
      location: {
        program: 'P',
        plant: 'PL',
        unit: 'U',
        line: 'L',
        station: 'S',
        area: 'A'
      }
    }

    const result = toolingItemToWorkflowItem(toolingItem)

    expect(result.designStageStatus.stage).toBe('DESIGN')
    expect(result.designStageStatus.status).toBe('UNKNOWN')
    expect(result.designStageStatus.percentComplete).toBeNull()

    expect(result.simulationStageStatus.stage).toBe('SIMULATION')
    expect(result.simulationStageStatus.status).toBe('UNKNOWN')

    expect(result.manufactureStageStatus.stage).toBe('MANUFACTURE')
    expect(result.manufactureStageStatus.status).toBe('UNKNOWN')
  })
})

describe('toolingWorkflowStatusToWorkflowItem', () => {
  it('should convert tooling workflow status to workflow item', () => {
    const status: ToolingWorkflowStatus = {
      workflowId: 'WF001',
      toolingId: 'T001',
      toolingNumber: 'TOOL-ABC',
      equipmentNumber: 'EQ-XYZ',
      handedness: 'RH',
      stationKey: 'STLA|Plant1|Unit1|Line1|Station1',
      dominantStage: 'SIMULATION',
      bottleneckReason: 'SIM_CHANGES_REQUESTED',
      severity: 'HIGH',
      severityScore: 85,
      designStage: {
        stage: 'DESIGN',
        status: 'ON_TRACK',
        percentComplete: 100
      },
      simulationStage: {
        stage: 'SIMULATION',
        status: 'AT_RISK',
        percentComplete: 60
      },
      manufactureStage: {
        stage: 'MANUFACTURE',
        status: 'ON_TRACK',
        percentComplete: 0
      }
    }

    const result = toolingWorkflowStatusToWorkflowItem(status)

    expect(result.id).toBe('WF001')
    expect(result.kind).toBe('TOOLING')
    expect(result.simulationContextKey).toBe('STLA|Plant1|Unit1|Line1|Station1')
    expect(result.name).toBe('TOOL-ABC')
    expect(result.itemNumber).toBe('TOOL-ABC')
    expect(result.equipmentNumber).toBe('EQ-XYZ')
    expect(result.handedness).toBe('RH')
  })

  it('should convert tooling stage status ON_TRACK to workflow IN_PROGRESS', () => {
    const status: ToolingWorkflowStatus = {
      workflowId: 'WF002',
      toolingId: 'T002',
      toolingNumber: 'TOOL-001',
      stationKey: 'P|PL|U|L|S',
      dominantStage: 'DESIGN',
      bottleneckReason: 'OK',
      severity: 'LOW',
      severityScore: 10,
      designStage: {
        stage: 'DESIGN',
        status: 'ON_TRACK',
        percentComplete: 50
      },
      simulationStage: {
        stage: 'SIMULATION',
        status: 'ON_TRACK',
        percentComplete: 30
      },
      manufactureStage: {
        stage: 'MANUFACTURE',
        status: 'ON_TRACK',
        percentComplete: 0
      }
    }

    const result = toolingWorkflowStatusToWorkflowItem(status)

    expect(result.designStageStatus.status).toBe('IN_PROGRESS')
    expect(result.simulationStageStatus.status).toBe('IN_PROGRESS')
    expect(result.manufactureStageStatus.status).toBe('IN_PROGRESS')
  })

  it('should convert tooling stage status AT_RISK to workflow IN_PROGRESS', () => {
    const status: ToolingWorkflowStatus = {
      workflowId: 'WF003',
      toolingId: 'T003',
      toolingNumber: 'TOOL-002',
      stationKey: 'P|PL|U|L|S',
      dominantStage: 'SIMULATION',
      bottleneckReason: 'SIM_CHANGES_REQUESTED',
      severity: 'MEDIUM',
      severityScore: 50,
      designStage: {
        stage: 'DESIGN',
        status: 'ON_TRACK',
        percentComplete: 100
      },
      simulationStage: {
        stage: 'SIMULATION',
        status: 'AT_RISK',
        percentComplete: 40
      },
      manufactureStage: {
        stage: 'MANUFACTURE',
        status: 'ON_TRACK',
        percentComplete: 0
      }
    }

    const result = toolingWorkflowStatusToWorkflowItem(status)

    expect(result.simulationStageStatus.status).toBe('IN_PROGRESS')
  })

  it('should convert tooling stage status BLOCKED to workflow BLOCKED', () => {
    const status: ToolingWorkflowStatus = {
      workflowId: 'WF004',
      toolingId: 'T004',
      toolingNumber: 'TOOL-003',
      stationKey: 'P|PL|U|L|S',
      dominantStage: 'DESIGN',
      bottleneckReason: 'DESIGN_BLOCKED',
      severity: 'HIGH',
      severityScore: 90,
      designStage: {
        stage: 'DESIGN',
        status: 'BLOCKED',
        percentComplete: 20
      },
      simulationStage: {
        stage: 'SIMULATION',
        status: 'ON_TRACK',
        percentComplete: 0
      },
      manufactureStage: {
        stage: 'MANUFACTURE',
        status: 'ON_TRACK',
        percentComplete: 0
      }
    }

    const result = toolingWorkflowStatusToWorkflowItem(status)

    expect(result.designStageStatus.status).toBe('BLOCKED')
  })

  it('should preserve stage metadata (owner, note, updatedAt)', () => {
    const status: ToolingWorkflowStatus = {
      workflowId: 'WF005',
      toolingId: 'T005',
      toolingNumber: 'TOOL-004',
      stationKey: 'P|PL|U|L|S',
      dominantStage: 'SIMULATION',
      bottleneckReason: 'OK',
      severity: 'LOW',
      severityScore: 15,
      designStage: {
        stage: 'DESIGN',
        status: 'ON_TRACK',
        percentComplete: 100,
        owner: 'John Doe',
        note: 'Design complete',
        updatedAt: '2025-01-15'
      },
      simulationStage: {
        stage: 'SIMULATION',
        status: 'ON_TRACK',
        percentComplete: 70,
        owner: 'Jane Smith',
        note: 'In progress',
        updatedAt: '2025-01-16'
      },
      manufactureStage: {
        stage: 'MANUFACTURE',
        status: 'ON_TRACK',
        percentComplete: 0
      }
    }

    const result = toolingWorkflowStatusToWorkflowItem(status)

    expect(result.designStageStatus.owner).toBe('John Doe')
    expect(result.designStageStatus.note).toBe('Design complete')
    expect(result.designStageStatus.updatedAt).toBe('2025-01-15')

    expect(result.simulationStageStatus.owner).toBe('Jane Smith')
    expect(result.simulationStageStatus.note).toBe('In progress')
    expect(result.simulationStageStatus.updatedAt).toBe('2025-01-16')
  })
})
