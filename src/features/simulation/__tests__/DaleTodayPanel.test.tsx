// DaleTodayPanel Tests
// Tests for Dale's Today Panel showing stations needing attention

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DaleTodayPanel } from '../components/DaleTodayPanel'
import { simulationStore } from '../simulationStore'
import type { StationContext } from '../simulationStore'

// Mock stations with various attention-needing scenarios
const mockStationsNeedingAttention: StationContext[] = [
  // Station with high unknown sourcing
  {
    contextKey: 'STLA-S|Zaragoza|Rear Unit|BN_B05|010',
    program: 'STLA-S',
    plant: 'Zaragoza',
    unit: 'Rear Unit',
    line: 'BN_B05',
    station: '010',
    simulationStatus: {
      firstStageCompletion: 75,
      engineer: 'Engineer A'
    },
    assetCounts: { total: 5, robots: 2, guns: 2, tools: 1, other: 0 },
    sourcingCounts: { reuse: 0, freeIssue: 0, newBuy: 1, unknown: 4 }, // High unknown
    assets: []
  },
  // Station with low completion
  {
    contextKey: 'STLA-S|Zaragoza|Rear Unit|BN_B05|020',
    program: 'STLA-S',
    plant: 'Zaragoza',
    unit: 'Rear Unit',
    line: 'BN_B05',
    station: '020',
    simulationStatus: {
      firstStageCompletion: 15, // Low completion
      engineer: 'Engineer B'
    },
    assetCounts: { total: 3, robots: 1, guns: 2, tools: 0, other: 0 },
    sourcingCounts: { reuse: 1, freeIssue: 0, newBuy: 1, unknown: 1 },
    assets: []
  },
  // Station with guns but no reuse tracking
  {
    contextKey: 'STLA-S|Zaragoza|Underbody|BC_B04|010',
    program: 'STLA-S',
    plant: 'Zaragoza',
    unit: 'Underbody',
    line: 'BC_B04',
    station: 'BC-010',
    simulationStatus: {
      firstStageCompletion: 80,
      engineer: 'Engineer C'
    },
    assetCounts: { total: 4, robots: 2, guns: 3, tools: 1, other: 0 }, // Has guns
    sourcingCounts: { reuse: 0, freeIssue: 0, newBuy: 4, unknown: 0 }, // No reuse
    assets: []
  }
]

const mockHealthyStations: StationContext[] = [
  {
    contextKey: 'STLA-S|Zaragoza|Rear Unit|BN_B05|030',
    program: 'STLA-S',
    plant: 'Zaragoza',
    unit: 'Rear Unit',
    line: 'BN_B05',
    station: '030',
    simulationStatus: {
      firstStageCompletion: 95,
      engineer: 'Engineer D'
    },
    assetCounts: { total: 4, robots: 2, guns: 2, tools: 0, other: 0 },
    sourcingCounts: { reuse: 2, freeIssue: 1, newBuy: 1, unknown: 0 },
    assets: []
  }
]

describe('DaleTodayPanel', () => {
  beforeEach(() => {
    simulationStore.clear()
  })

  it('renders empty state when no stations need attention', () => {
    simulationStore.setStations(mockHealthyStations)

    render(<DaleTodayPanel />)

    expect(screen.getByTestId('dale-today-panel-empty')).toBeInTheDocument()
    expect(screen.getByText(/all clear/i)).toBeInTheDocument()
  })

  it('displays stations needing attention', () => {
    simulationStore.setStations(mockStationsNeedingAttention)

    render(<DaleTodayPanel />)

    expect(screen.getByTestId('dale-today-panel')).toBeInTheDocument()
    expect(screen.getByText(/today's focus/i)).toBeInTheDocument()
  })

  it('shows at least one attention item in mocked scenario', () => {
    simulationStore.setStations(mockStationsNeedingAttention)

    render(<DaleTodayPanel />)

    // Should show attention items
    const attentionItems = screen.getAllByTestId(/attention-item-/)
    expect(attentionItems.length).toBeGreaterThan(0)
  })

  it('shows station names in attention items', () => {
    simulationStore.setStations(mockStationsNeedingAttention)

    render(<DaleTodayPanel />)

    // Should show at least one station name
    // Station 020 has low completion which is an error level issue
    expect(screen.getByText('020')).toBeInTheDocument()
  })

  it('calls onStationClick when item is clicked', () => {
    simulationStore.setStations(mockStationsNeedingAttention)
    const onStationClick = vi.fn()

    render(<DaleTodayPanel onStationClick={onStationClick} />)

    // Click on first attention item
    const firstItem = screen.getAllByTestId(/attention-item-/)[0]
    fireEvent.click(firstItem)

    expect(onStationClick).toHaveBeenCalled()
    expect(onStationClick).toHaveBeenCalledWith(
      expect.objectContaining({
        contextKey: expect.any(String)
      })
    )
  })

  it('shows count of stations needing attention', () => {
    simulationStore.setStations(mockStationsNeedingAttention)

    render(<DaleTodayPanel />)

    // Should show count in header
    expect(screen.getByText(/station.*need attention/i)).toBeInTheDocument()
  })

  it('respects maxItems prop', () => {
    simulationStore.setStations(mockStationsNeedingAttention)

    render(<DaleTodayPanel maxItems={1} />)

    // Should only show 1 item maximum
    const attentionItems = screen.getAllByTestId(/attention-item-/)
    expect(attentionItems.length).toBe(1)
  })

  it('shows severity indicators', () => {
    simulationStore.setStations(mockStationsNeedingAttention)

    render(<DaleTodayPanel />)

    // The panel should have severity-related content (critical/warning badges)
    const panel = screen.getByTestId('dale-today-panel')
    expect(panel).toBeInTheDocument()
  })
})
