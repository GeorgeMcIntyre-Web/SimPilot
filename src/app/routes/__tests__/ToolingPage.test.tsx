import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../ui/ThemeContext'
import { simPilotStore } from '../../../domain/simPilotStore'
import type { ToolingItem, ToolingSnapshot, ToolingWorkflowStatus } from '../../../domain/toolingTypes'
import { ToolingPage } from '../ToolingPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const baseTool = (overrides: Partial<ToolingItem> = {}): ToolingItem => ({
  id: overrides.id ?? `tool-${Math.random().toString(36).slice(2, 7)}`,
  toolingNumber: overrides.toolingNumber ?? 'TL-100',
  equipmentNumbers: overrides.equipmentNumbers ?? ['EQ-1'],
  gaDescription: overrides.gaDescription ?? 'Rear gate gripper',
  toolType: overrides.toolType ?? 'GRIPPER',
  equipmentType: overrides.equipmentType ?? 'EOAT',
  handedness: overrides.handedness ?? 'BOTH',
  designStage: overrides.designStage ?? 'LAYOUT_ONLY',
  simulationStatus: overrides.simulationStatus ?? { state: 'PLANNING', shortLabel: 'Layout review', percentComplete: 25 },
  hasAssets: overrides.hasAssets ?? true,
  hasReusePlan: overrides.hasReusePlan ?? false,
  reusePlanNotes: overrides.reusePlanNotes,
  context: overrides.context ?? {
    program: 'STLA-S',
    plant: 'Detroit',
    unit: 'Body',
    area: 'Underbody',
    station: 'B010'
  },
  timeline: overrides.timeline ?? {
    simulationDue: '2024-12-01'
  },
  simulationApps: overrides.simulationApps ?? ['Process Simulate'],
  simulationMethods: overrides.simulationMethods ?? ['OLP'],
  specialFunctions: overrides.specialFunctions ?? [],
  workflowStatusId: overrides.workflowStatusId
})

const hydrateStore = (tooling: ToolingItem[], workflows: ToolingWorkflowStatus[]) => {
  const snapshot: ToolingSnapshot = {
    asOf: '2024-01-01T00:00:00Z',
    items: tooling,
    source: 'test'
  }

  act(() => {
    simPilotStore.hydrate({
      toolingSnapshot: snapshot,
      workflowStatuses: workflows,
      bottleneckSnapshot: {
        asOf: '2024-01-01T00:00:00Z',
        entries: []
      },
      isLoading: false
    })
  })
}

const renderPage = () =>
  render(
    <ThemeProvider>
      <BrowserRouter>
        <ToolingPage />
      </BrowserRouter>
    </ThemeProvider>
  )

describe('ToolingPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    act(() => {
      simPilotStore.clear()
    })
  })

  afterEach(() => {
    act(() => {
      simPilotStore.clear()
    })
  })

  it('shows loading state', () => {
    act(() => {
      simPilotStore.setLoading(true)
    })
    renderPage()
    expect(screen.getByTestId('tooling-loading-state')).toBeInTheDocument()
  })

  it('shows empty state when no tooling exists', () => {
    renderPage()
    expect(screen.getByText('No tooling ingested')).toBeInTheDocument()
  })

  it('renders tooling table with data', () => {
    hydrateStore(
      [
        baseTool({ toolingNumber: 'TL-001', id: 'tool-1' }),
        baseTool({ toolingNumber: 'TL-002', id: 'tool-2', context: { program: 'P1MX', area: 'Framing', unit: 'Body', plant: 'Windsor', station: 'F020' } })
      ],
      [
        {
          id: 'workflow-tool-1',
          toolingId: 'tool-1',
          toolingNumber: 'TL-001',
          dominantStage: 'DESIGN',
          bottleneckReason: 'DATA_GAP',
          severity: 'HIGH',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'workflow-tool-2',
          toolingId: 'tool-2',
          toolingNumber: 'TL-002',
          dominantStage: 'SIMULATION',
          bottleneckReason: 'NONE',
          severity: 'LOW',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
    )

    renderPage()

    expect(screen.getByText('Tooling workflow')).toBeInTheDocument()
    expect(screen.getByText('TL-001')).toBeInTheDocument()
    expect(screen.getByText('TL-002')).toBeInTheDocument()
  })

  it('filters by design stage', () => {
    hydrateStore(
      [
        baseTool({ toolingNumber: 'TL-001', id: 'tool-1', designStage: 'LAYOUT_ONLY' }),
        baseTool({ toolingNumber: 'TL-002', id: 'tool-2', designStage: 'SIM_READY' })
      ],
      [
        {
          id: 'workflow-tool-1',
          toolingId: 'tool-1',
          toolingNumber: 'TL-001',
          dominantStage: 'DESIGN',
          severity: 'LOW',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'workflow-tool-2',
          toolingId: 'tool-2',
          toolingNumber: 'TL-002',
          dominantStage: 'SIMULATION',
          severity: 'LOW',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
    )

    renderPage()

    const stageSelect = screen.getByTestId('tooling-filter-designStage')
    fireEvent.change(stageSelect, { target: { value: 'LAYOUT_ONLY' } })

    expect(screen.getByText('TL-001')).toBeInTheDocument()
    expect(screen.queryByText('TL-002')).not.toBeInTheDocument()
  })

  it('filters by workflow stage', () => {
    hydrateStore(
      [
        baseTool({ toolingNumber: 'TL-001', id: 'tool-1' }),
        baseTool({ toolingNumber: 'TL-002', id: 'tool-2' })
      ],
      [
        {
          id: 'workflow-tool-1',
          toolingId: 'tool-1',
          toolingNumber: 'TL-001',
          dominantStage: 'SIMULATION',
          severity: 'LOW',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'workflow-tool-2',
          toolingId: 'tool-2',
          toolingNumber: 'TL-002',
          dominantStage: 'DESIGN',
          severity: 'LOW',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
    )

    renderPage()

    const workflowSelect = screen.getByTestId('tooling-filter-workflowStage')
    fireEvent.change(workflowSelect, { target: { value: 'SIMULATION' } })

    expect(screen.getByText('TL-001')).toBeInTheDocument()
    expect(screen.queryByText('TL-002')).not.toBeInTheDocument()
  })

  it('searches by tooling number', () => {
    hydrateStore(
      [
        baseTool({ toolingNumber: 'GA-900', id: 'tool-1' }),
        baseTool({ toolingNumber: 'GA-901', id: 'tool-2' })
      ],
      []
    )

    renderPage()

    const searchInput = screen.getByTestId('tooling-search-input')
    fireEvent.change(searchInput, { target: { value: 'GA-900' } })

    expect(screen.getByText('GA-900')).toBeInTheDocument()
    expect(screen.queryByText('GA-901')).not.toBeInTheDocument()
  })

  it('opens detail drawer and navigates via CTA', () => {
    hydrateStore(
      [
        baseTool({
          toolingNumber: 'TL-portal',
          id: 'tool-1',
          context: { program: 'STLA-S', plant: 'Detroit', unit: 'Body', area: 'Underbody', station: 'B010' }
        })
      ],
      [
        {
          id: 'workflow-tool-1',
          toolingId: 'tool-1',
          toolingNumber: 'TL-portal',
          dominantStage: 'SIMULATION',
          bottleneckReason: 'DATA_GAP',
          severity: 'HIGH',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
    )

    renderPage()

    fireEvent.click(screen.getByText('TL-portal'))
    expect(screen.getByTestId('tooling-detail-drawer')).toBeInTheDocument()

    const cta = screen.getByText('Open Station in Simulation Board')
    fireEvent.click(cta)

    expect(mockNavigate).toHaveBeenCalled()
    const firstCall = mockNavigate.mock.calls[0][0]
    expect(firstCall).toContain('/simulation')
    expect(firstCall).toContain('area=Underbody')
    expect(firstCall).toContain('station=B010')
  })
})
