import { randomUUID } from 'node:crypto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { DashboardBottlenecksPanel } from '../DashboardBottlenecksPanel'
import { simPilotStore } from '../../../domain/simPilotStore'
import type { SimPilotDataSnapshot } from '../../../domain/ExcelIngestionFacade'
import type {
  ToolingWorkflowStatus,
  WorkflowStage,
  StageStatusSnapshot,
  ToolingItem
} from '../../../domain/toolingTypes'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const baseSnapshotFields = {
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
  errors: []
} as const

const makeStage = (
  stage: WorkflowStage,
  percent: number,
  status: StageStatusSnapshot['status']
): StageStatusSnapshot => ({
  stage,
  percentComplete: percent,
  status,
  owner: stage === 'DESIGN' ? 'Layla' : stage === 'SIMULATION' ? 'Omar' : 'Ravi'
})

const makeLocation = (overrides?: Partial<ToolingWorkflowStatus['location']>) => ({
  program: 'ALPHA',
  plant: 'Jefferson North',
  unit: 'Body',
  line: 'Line 1',
  station: 'ST-100',
  area: 'Underbody',
  ...overrides
})

const makeTool = (overrides: Partial<ToolingItem>): ToolingItem => ({
  toolingId: overrides.toolingId ?? 'tool-1',
  toolingNumber: overrides.toolingNumber ?? 'TL-900',
  location: overrides.location ?? makeLocation(),
  metadata: overrides.metadata ?? { handedness: 'RH' },
  description: overrides.description,
  equipmentNumber: overrides.equipmentNumber,
  handedness: overrides.handedness,
  owner: overrides.owner ?? 'Taylor',
  supplier: overrides.supplier ?? 'Comau',
  ...overrides
})

const makeWorkflow = (overrides: Partial<ToolingWorkflowStatus>): ToolingWorkflowStatus => {
  const location = overrides.location ?? makeLocation()
  return {
    workflowId: overrides.workflowId ?? randomUUID(),
    toolingNumber: overrides.toolingNumber ?? 'TL-900',
    equipmentNumber: overrides.equipmentNumber ?? 'EQ-42',
    handedness: overrides.handedness ?? 'LH',
    stationKey: overrides.stationKey ?? 'ALPHA-UB-ST-100',
    program: overrides.program ?? location.program,
    area: overrides.area ?? location.area,
    station: overrides.station ?? location.station,
    location,
    designStage: overrides.designStage ?? makeStage('DESIGN', 20, 'BLOCKED'),
    simulationStage: overrides.simulationStage ?? makeStage('SIMULATION', 60, 'AT_RISK'),
    manufactureStage: overrides.manufactureStage ?? makeStage('MANUFACTURE', 80, 'ON_TRACK'),
    dominantStage: overrides.dominantStage ?? 'DESIGN',
    bottleneckReason: overrides.bottleneckReason ?? 'DESIGN_BLOCKED',
    severity: overrides.severity ?? 'HIGH',
    severityScore: overrides.severityScore ?? 95,
    tool: overrides.tool ?? makeTool({ toolingNumber: overrides.toolingNumber ?? 'TL-900', location })
  }
}

const makeSnapshot = (workflowStatuses: ToolingWorkflowStatus[]): SimPilotDataSnapshot => ({
  ...baseSnapshotFields,
  toolingSnapshot: {
    updatedAt: '2024-03-01T00:00:00.000Z',
    items: workflowStatuses.map(status =>
      status.tool ?? makeTool({ toolingNumber: status.toolingNumber, location: status.location })
    )
  },
  bottleneckSnapshot: {
    generatedAt: '2024-03-01T12:00:00.000Z',
    workflowStatuses
  }
})

const renderPanel = () =>
  render(
    <MemoryRouter>
      <DashboardBottlenecksPanel />
    </MemoryRouter>
  )

describe('DashboardBottlenecksPanel', () => {
  beforeEach(() => {
    act(() => {
      simPilotStore.clear()
    })
    mockNavigate.mockReset()
  })

  afterEach(() => {
    act(() => {
      simPilotStore.clear()
    })
  })

  it('shows loading state when store is loading', () => {
    act(() => {
      simPilotStore.setLoading(true)
    })
    renderPanel()
    expect(screen.getByTestId('bottlenecks-loading')).toBeInTheDocument()
  })

  it('shows empty state when snapshot has no bottlenecks', () => {
    act(() => {
      simPilotStore.setSnapshot(makeSnapshot([]))
    })
    renderPanel()
    expect(screen.getByTestId('bottlenecks-empty')).toBeInTheDocument()
  })

  it('renders a severe bottleneck with key fields', () => {
    const workflow = makeWorkflow({
      toolingNumber: 'TL-123',
      station: 'ST-210',
      area: 'Body Shop',
      program: 'BETA',
      bottleneckReason: 'SIMULATION_DEFECT'
    })
    act(() => {
      simPilotStore.setSnapshot(makeSnapshot([workflow]))
    })
    renderPanel()

    expect(screen.getByText(/TL-123/)).toBeInTheDocument()
    expect(screen.getByText(/Station ST-210/)).toBeInTheDocument()
    expect(screen.getAllByText('Simulation Defect').length).toBeGreaterThan(0)
  })

  it('filters by workflow stage', () => {
    const designWorkflow = makeWorkflow({
      workflowId: 'design',
      toolingNumber: 'TL-Design',
      dominantStage: 'DESIGN'
    })
    const simulationWorkflow = makeWorkflow({
      workflowId: 'simulation',
      toolingNumber: 'TL-Sim',
      dominantStage: 'SIMULATION',
      bottleneckReason: 'MANUFACTURE_CONSTRAINT'
    })
    act(() => {
      simPilotStore.setSnapshot(makeSnapshot([designWorkflow, simulationWorkflow]))
    })
    renderPanel()

    const designButton = screen.getByRole('button', { name: 'Design' })
    fireEvent.click(designButton)

    expect(screen.getByText(/TL-Design/)).toBeInTheDocument()
    expect(screen.queryByText(/TL-Sim/)).not.toBeInTheDocument()
  })

  it('navigates to simulation view with station context', () => {
    const workflow = makeWorkflow({
      toolingNumber: 'TL-Open',
      location: makeLocation({
        program: 'OMEGA',
        plant: 'Mack Assembly',
        unit: 'Framing',
        line: 'Line 2',
        station: 'ST-555'
      })
    })
    act(() => {
      simPilotStore.setSnapshot(makeSnapshot([workflow]))
    })
    renderPanel()

    const openButton = screen.getByRole('button', { name: /Open Station in Simulation/i })
    fireEvent.click(openButton)

    expect(mockNavigate).toHaveBeenCalledWith(
      '/simulation?program=OMEGA&plant=Mack+Assembly&unit=Framing&line=Line+2&station=ST-555'
    )
  })
})
