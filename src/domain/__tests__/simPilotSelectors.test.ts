import { describe, it, expect } from 'vitest'
import { selectAllToolingItems, selectToolingWorkflowById, selectBottlenecksForToolingNumber, selectWorkflowIndex } from '../simPilotSelectors'
import type { SimPilotStoreState } from '../simPilotStore'
import type { ToolingItem, ToolingWorkflowStatus, BottleneckSnapshot, ToolingSnapshot } from '../toolingTypes'

const mockToolingItem = (overrides: Partial<ToolingItem> = {}): ToolingItem => ({
  id: overrides.id ?? 'tool-1',
  toolingNumber: overrides.toolingNumber ?? 'TL-100',
  equipmentNumbers: overrides.equipmentNumbers ?? ['EQ-1'],
  gaDescription: overrides.gaDescription ?? 'GA Description',
  toolType: overrides.toolType ?? 'GEO',
  equipmentType: overrides.equipmentType ?? 'Robot EOAT',
  handedness: overrides.handedness ?? 'BOTH',
  designStage: overrides.designStage ?? 'LAYOUT_ONLY',
  simulationStatus: overrides.simulationStatus ?? { state: 'PLANNING', shortLabel: 'Planning' },
  hasAssets: overrides.hasAssets ?? false,
  hasReusePlan: overrides.hasReusePlan ?? false,
  reusePlanNotes: overrides.reusePlanNotes,
  context: overrides.context ?? {
    program: 'STLA-S',
    plant: 'Detroit',
    unit: 'Body',
    area: 'Underbody',
    station: 'B-010'
  },
  timeline: overrides.timeline ?? {},
  simulationApps: overrides.simulationApps ?? [],
  simulationMethods: overrides.simulationMethods ?? [],
  specialFunctions: overrides.specialFunctions ?? [],
  workflowStatusId: overrides.workflowStatusId
})

const mockWorkflowStatus = (overrides: Partial<ToolingWorkflowStatus> = {}): ToolingWorkflowStatus => ({
  id: overrides.id ?? 'workflow-tool-1',
  toolingId: overrides.toolingId ?? 'tool-1',
  toolingNumber: overrides.toolingNumber ?? 'TL-100',
  dominantStage: overrides.dominantStage ?? 'DESIGN',
  bottleneckReason: overrides.bottleneckReason,
  severity: overrides.severity ?? 'LOW',
  updatedAt: overrides.updatedAt ?? '2024-01-01T00:00:00Z',
  owner: overrides.owner,
  note: overrides.note
})

const mockToolingSnapshot = (overrides: Partial<ToolingSnapshot> = {}): ToolingSnapshot => ({
  asOf: overrides.asOf ?? '2024-01-01T00:00:00Z',
  source: overrides.source ?? 'test',
  items: overrides.items ?? [mockToolingItem()]
})

const mockBottleneckSnapshot = (overrides: Partial<BottleneckSnapshot> = {}): BottleneckSnapshot => ({
  asOf: overrides.asOf ?? '2024-01-02T00:00:00Z',
  entries: overrides.entries ?? [
    {
      toolingId: 'tool-1',
      toolingNumber: 'TL-100',
      dominantStage: 'SIMULATION',
      reason: 'DATA_GAP',
      severity: 'HIGH',
      note: 'Missing layout references'
    }
  ]
})

const createState = (overrides: Partial<SimPilotStoreState> = {}): SimPilotStoreState => ({
  toolingSnapshot: overrides.toolingSnapshot ?? mockToolingSnapshot(),
  bottleneckSnapshot: overrides.bottleneckSnapshot ?? mockBottleneckSnapshot(),
  workflowStatuses: overrides.workflowStatuses ?? [mockWorkflowStatus()],
  isLoading: overrides.isLoading ?? false
})

describe('simPilotSelectors', () => {
  it('selectAllToolingItems returns snapshot items', () => {
    const customItem = mockToolingItem({ id: 'tool-2', toolingNumber: 'TL-200' })
    const state = createState({
      toolingSnapshot: mockToolingSnapshot({ items: [customItem] })
    })

    const result = selectAllToolingItems(state)
    expect(result).toHaveLength(1)
    expect(result[0].toolingNumber).toBe('TL-200')
  })

  it('selectToolingWorkflowById returns matching workflow', () => {
    const state = createState({
      workflowStatuses: [
        mockWorkflowStatus({ toolingId: 'tool-1', dominantStage: 'SIMULATION', bottleneckReason: 'DATA_GAP' })
      ]
    })

    const result = selectToolingWorkflowById(state, 'tool-1')
    expect(result).not.toBeNull()
    expect(result?.dominantStage).toBe('SIMULATION')
    expect(result?.bottleneckReason).toBe('DATA_GAP')
  })

  it('selectToolingWorkflowById returns null when not found', () => {
    const state = createState({
      workflowStatuses: [mockWorkflowStatus({ toolingId: 'other' })]
    })

    const result = selectToolingWorkflowById(state, 'missing')
    expect(result).toBeNull()
  })

  it('selectBottlenecksForToolingNumber matches by tooling number', () => {
    const state = createState({
      bottleneckSnapshot: mockBottleneckSnapshot({
        entries: [
          {
            toolingId: 'tool-1',
            toolingNumber: 'TL-100',
            dominantStage: 'SIMULATION',
            reason: 'DATA_GAP',
            severity: 'HIGH'
          },
          {
            toolingId: 'tool-2',
            toolingNumber: 'TL-200',
            dominantStage: 'DESIGN',
            reason: 'STAFFING',
            severity: 'MEDIUM'
          }
        ]
      })
    })

    const result = selectBottlenecksForToolingNumber(state, 'TL-200')
    expect(result).toHaveLength(1)
    expect(result[0].reason).toBe('STAFFING')
  })

  it('selectBottlenecksForToolingNumber returns empty array when snapshot missing', () => {
    const state = createState({ bottleneckSnapshot: null })

    const result = selectBottlenecksForToolingNumber(state, 'TL-100')
    expect(result).toHaveLength(0)
  })

  it('selectWorkflowIndex builds lookup map', () => {
    const status = mockWorkflowStatus({ toolingId: 'tool-9' })
    const state = createState({ workflowStatuses: [status] })

    const map = selectWorkflowIndex(state)
    expect(map.get('tool-9')).toEqual(status)
  })
})
