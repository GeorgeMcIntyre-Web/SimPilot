// SimulationDetailDrawer Tests
// Tests for station detail drawer showing context and assets

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SimulationDetailDrawer } from '../components/SimulationDetailDrawer'
import type { StationContext } from '../simulationStore'
import { toolingBottleneckStore } from '../../../domain/toolingBottleneckStore'

// Wrapper with Router
function renderWithRouter(ui: React.ReactNode) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

const mockStation: StationContext = {
  contextKey: 'STLA-S|Zaragoza|Rear Unit|BN_B05|010',
  program: 'STLA-S',
  plant: 'Zaragoza',
  unit: 'Rear Unit',
  line: 'BN_B05',
  station: '010',
  simulationStatus: {
    firstStageCompletion: 75,
    finalDeliverablesCompletion: 50,
    dcsConfigured: true,
    engineer: 'John Smith',
    sourceFile: 'Simulation_Status.xlsx',
    sheetName: 'SIMULATION'
  },
  assetCounts: {
    total: 8,
    robots: 3,
    guns: 2,
    tools: 2,
    other: 1
  },
  sourcingCounts: {
    reuse: 2,
    freeIssue: 1,
    newBuy: 3,
    unknown: 2
  },
  assets: []
}

describe('SimulationDetailDrawer', () => {
  it('renders nothing when station is null', () => {
    const { container } = renderWithRouter(
      <SimulationDetailDrawer station={null} isOpen={true} onClose={() => {}} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders station details when open', () => {
    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(screen.getByTestId('simulation-detail-drawer')).toBeInTheDocument()
    expect(screen.getByText('010')).toBeInTheDocument()
  })

  it('shows full simulation context breadcrumb', () => {
    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    // Use getAllByText since some text may appear multiple times
    expect(screen.getAllByText('STLA-S').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Zaragoza').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rear Unit').length).toBeGreaterThan(0)
    expect(screen.getAllByText('BN_B05').length).toBeGreaterThan(0)
  })

  it('displays asset counts correctly', () => {
    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    // Check asset labels are displayed
    expect(screen.getByText('Robots')).toBeInTheDocument()
    expect(screen.getByText('Guns')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('shows sourcing breakdown section', () => {
    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Sourcing')).toBeInTheDocument()
    expect(screen.getByText(/reuse.*free issue/i)).toBeInTheDocument()
    expect(screen.getByText(/new buy/i)).toBeInTheDocument()
    expect(screen.getByText(/unknown/i)).toBeInTheDocument()
  })

  it('displays simulation status section', () => {
    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Simulation Status')).toBeInTheDocument()
    expect(screen.getByText(/1st stage completion/i)).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows engineer name', () => {
    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()

    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={onClose}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('has View Related Assets button', () => {
    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    const viewAssetsButton = screen.getByRole('button', { name: /view related assets/i })
    expect(viewAssetsButton).toBeInTheDocument()
  })

  it('handles station without simulation status', () => {
    const stationNoSimStatus: StationContext = {
      ...mockStation,
      simulationStatus: undefined
    }

    renderWithRouter(
      <SimulationDetailDrawer
        station={stationNoSimStatus}
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(screen.getByText(/no simulation status data/i)).toBeInTheDocument()
  })
})

describe('SimulationDetailDrawer tooling bottlenecks', () => {
  beforeEach(() => {
    toolingBottleneckStore.clear()
  })

  function seedBottleneck() {
    toolingBottleneckStore.loadSnapshot({
      statuses: [
        {
          toolingNumber: 'T-100',
          toolType: 'Gripper',
          stationKey: mockStation.contextKey,
          stationNumber: mockStation.station,
          dominantStage: 'DESIGN',
          bottleneckReason: 'BUILD_AHEAD_OF_SIM',
          severity: 'critical',
          designStage: { stage: 'DESIGN', status: 'BLOCKED' },
          simulationStage: { stage: 'SIMULATION', status: 'ON_TRACK' }
        }
      ]
    })
  }

  it('shows tooling button when bottlenecks exist', () => {
    seedBottleneck()

    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(screen.getByTestId('view-tooling-bottlenecks')).toBeInTheDocument()
  })

  it('opens tooling drawer and lists entries', () => {
    seedBottleneck()

    renderWithRouter(
      <SimulationDetailDrawer
        station={mockStation}
        isOpen={true}
        onClose={() => {}}
      />
    )

    fireEvent.click(screen.getByTestId('view-tooling-bottlenecks'))

    expect(screen.getByTestId('tooling-bottleneck-drawer')).toBeInTheDocument()
    expect(screen.getByText('T-100')).toBeInTheDocument()
    expect(screen.getByText(/Build ahead/i)).toBeInTheDocument()
  })
})
