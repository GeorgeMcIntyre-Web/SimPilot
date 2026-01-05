// DaleTodayPanel Tests
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DaleTodayPanel } from '../components/DaleTodayPanel'
import { useStationsNeedingAttention } from '../simulationSelectors'

// Mock the selectors
vi.mock('../simulationSelectors', () => ({
  useStationsNeedingAttention: vi.fn()
}))

// Simple mock data factory to avoid reference issues
const createMockItem = (station: string, severity: 'error' | 'warning' = 'error', key = 'key1') => ({
  station: {
    contextKey: key,
    program: 'P1',
    plant: 'Plant1',
    unit: 'Unit1',
    line: 'Line1',
    station: station,
    assetCounts: { total: 1, robots: 0, guns: 0, tools: 0, other: 0 },
    sourcingCounts: { reuse: 0, freeIssue: 0, newBuy: 0, unknown: 0 },
    assets: []
  },
  severity,
  reason: 'Test reason'
})

describe('DaleTodayPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
      ; (useStationsNeedingAttention as any).mockReturnValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders empty state when no stations need attention', () => {
    ; (useStationsNeedingAttention as any).mockReturnValue([])
    render(<DaleTodayPanel />)
    expect(screen.getByTestId('dale-today-panel-empty')).toBeInTheDocument()
    expect(screen.getByText(/all clear/i)).toBeInTheDocument()
  })

  it('displays stations needing attention', () => {
    const items = [createMockItem('010', 'error', 'k1')]
      ; (useStationsNeedingAttention as any).mockReturnValue(items)

    render(<DaleTodayPanel />)
    expect(screen.getByTestId('dale-today-panel')).toBeInTheDocument()
    expect(screen.getByText(/today's focus/i)).toBeInTheDocument()
  })

  it('shows station names in attention items', () => {
    const items = [createMockItem('020', 'error', 'k1')]
      ; (useStationsNeedingAttention as any).mockReturnValue(items)

    render(<DaleTodayPanel />)
    expect(screen.getByText('020')).toBeInTheDocument()
  })

  it('shows count of stations needing attention', () => {
    const items = [createMockItem('010', 'error', 'k1'), createMockItem('020', 'error', 'k2')]
      ; (useStationsNeedingAttention as any).mockReturnValue(items)

    render(<DaleTodayPanel />)
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('respects maxItems prop', () => {
    const items = [createMockItem('010', 'error', 'k1'), createMockItem('020', 'error', 'k2')]
      ; (useStationsNeedingAttention as any).mockReturnValue(items)

    render(<DaleTodayPanel maxItems={1} />)
    const renderItems = screen.getAllByTestId(/attention-item-/)
    expect(renderItems.length).toBe(1)
  })

  it('shows severity indicators', () => {
    const items = [createMockItem('010', 'error', 'k1')]
      ; (useStationsNeedingAttention as any).mockReturnValue(items)

    render(<DaleTodayPanel />)
    expect(screen.getByTestId('attention-item-k1')).toBeInTheDocument()
  })

  it('calls onStationClick when item is clicked', () => {
    const items = [createMockItem('010', 'error', 'k1')]
      ; (useStationsNeedingAttention as any).mockReturnValue(items)
    const onStationClick = vi.fn()

    render(<DaleTodayPanel onStationClick={onStationClick} />)

    const btn = screen.getByTestId('attention-item-k1')
    fireEvent.click(btn)

    expect(onStationClick).toHaveBeenCalledTimes(1)
    expect(onStationClick).toHaveBeenCalledWith(items[0].station)
  })
})
