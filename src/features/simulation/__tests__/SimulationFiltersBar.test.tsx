// SimulationFiltersBar Tests
// Tests filter controls for Program, Plant, Unit hierarchy

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SimulationFiltersBar } from '../components/SimulationFiltersBar'
import { simulationStore } from '../simulationStore'
import type { SimulationFilters } from '../simulationSelectors'
import type { StationContext } from '../simulationStore'

// Mock data
const mockStations: StationContext[] = [
  {
    contextKey: 'STLA-S|Zaragoza|Rear Unit|BN_B05|010',
    program: 'STLA-S',
    plant: 'Zaragoza',
    unit: 'Rear Unit',
    line: 'BN_B05',
    station: '010',
    assetCounts: { total: 5, robots: 2, guns: 2, tools: 1, other: 0 },
    sourcingCounts: { reuse: 2, freeIssue: 0, newBuy: 2, unknown: 1 },
    assets: []
  },
  {
    contextKey: 'STLA-S|Zaragoza|Rear Unit|BN_B05|020',
    program: 'STLA-S',
    plant: 'Zaragoza',
    unit: 'Rear Unit',
    line: 'BN_B05',
    station: '020',
    assetCounts: { total: 3, robots: 1, guns: 1, tools: 1, other: 0 },
    sourcingCounts: { reuse: 1, freeIssue: 0, newBuy: 1, unknown: 1 },
    assets: []
  },
  {
    contextKey: 'STLA-S|Zaragoza|Underbody|BC_B04|010',
    program: 'STLA-S',
    plant: 'Zaragoza',
    unit: 'Underbody',
    line: 'BC_B04',
    station: '010',
    assetCounts: { total: 4, robots: 2, guns: 1, tools: 1, other: 0 },
    sourcingCounts: { reuse: 1, freeIssue: 1, newBuy: 1, unknown: 1 },
    assets: []
  },
  {
    contextKey: 'P1H|Detroit|Body|AA_A01|100',
    program: 'P1H',
    plant: 'Detroit',
    unit: 'Body',
    line: 'AA_A01',
    station: '100',
    assetCounts: { total: 2, robots: 1, guns: 1, tools: 0, other: 0 },
    sourcingCounts: { reuse: 0, freeIssue: 0, newBuy: 2, unknown: 0 },
    assets: []
  }
]

describe('SimulationFiltersBar', () => {
  beforeEach(() => {
    // Reset store with mock data
    simulationStore.setStations(mockStations)
  })

  it('renders filter controls', () => {
    const filters: SimulationFilters = {
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Program')).toBeInTheDocument()
    expect(screen.getByText('Plant')).toBeInTheDocument()
    expect(screen.getByText('Unit')).toBeInTheDocument()
  })

  it('shows all programs in program dropdown', () => {
    const filters: SimulationFilters = {
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    // Check that both programs are available as options
    expect(screen.getByRole('option', { name: 'All Programs' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'STLA-S' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'P1H' })).toBeInTheDocument()
  })

  it('calls onFiltersChange when program is selected', () => {
    const filters: SimulationFilters = {
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    // Find all comboboxes and get the program one (first one after search)
    const selects = screen.getAllByRole('combobox')
    const programSelect = selects[0] // First select is Program
    fireEvent.change(programSelect, { target: { value: 'STLA-S' } })

    expect(onChange).toHaveBeenCalledWith({
      program: 'STLA-S',
      plant: null,
      unit: null,
      searchTerm: ''
    })
  })

  it('clears child filters when parent filter changes', () => {
    const filters: SimulationFilters = {
      program: 'STLA-S',
      plant: 'Zaragoza',
      unit: 'Rear Unit',
      searchTerm: ''
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    // Change program - should clear plant and unit
    const selects = screen.getAllByRole('combobox')
    const programSelect = selects[0]
    fireEvent.change(programSelect, { target: { value: 'P1H' } })

    expect(onChange).toHaveBeenCalledWith({
      program: 'P1H',
      plant: null,
      unit: null,
      searchTerm: ''
    })
  })

  it('disables plant select when no program selected', () => {
    const filters: SimulationFilters = {
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    const selects = screen.getAllByRole('combobox')
    const plantSelect = selects[1] // Second select is Plant
    expect(plantSelect).toBeDisabled()
  })

  it('enables plant select when program selected', () => {
    const filters: SimulationFilters = {
      program: 'STLA-S',
      plant: null,
      unit: null,
      searchTerm: ''
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    const selects = screen.getAllByRole('combobox')
    const plantSelect = selects[1]
    expect(plantSelect).not.toBeDisabled()
  })

  it('updates search term on input', () => {
    const filters: SimulationFilters = {
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    const searchInput = screen.getByPlaceholderText(/station, line, engineer/i)
    fireEvent.change(searchInput, { target: { value: '010' } })

    expect(onChange).toHaveBeenCalledWith({
      program: null,
      plant: null,
      unit: null,
      searchTerm: '010'
    })
  })

  it('shows clear all button when filters are active', () => {
    const filters: SimulationFilters = {
      program: 'STLA-S',
      plant: null,
      unit: null,
      searchTerm: ''
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    expect(screen.getByText(/clear all/i)).toBeInTheDocument()
  })

  it('clears all filters when clear button clicked', () => {
    const filters: SimulationFilters = {
      program: 'STLA-S',
      plant: 'Zaragoza',
      unit: 'Rear Unit',
      searchTerm: 'test'
    }
    const onChange = vi.fn()

    render(<SimulationFiltersBar filters={filters} onFiltersChange={onChange} />)

    fireEvent.click(screen.getByText(/clear all/i))

    expect(onChange).toHaveBeenCalledWith({
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    })
  })
})
