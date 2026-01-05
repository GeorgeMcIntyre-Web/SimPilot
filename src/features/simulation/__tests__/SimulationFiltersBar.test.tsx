// SimulationFiltersBar Tests
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SimulationFiltersBar } from '../components/SimulationFiltersBar'
import { usePrograms, usePlants, useUnits } from '../simulationStore'

// Mock the selectors
vi.mock('../simulationStore', () => ({
  usePrograms: vi.fn(),
  usePlants: vi.fn(),
  useUnits: vi.fn()
}))

const defaultFilters = {
  program: null,
  plant: null,
  unit: null,
  searchTerm: ''
}

describe('SimulationFiltersBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
      ; (usePrograms as any).mockReturnValue([])
      ; (usePlants as any).mockReturnValue([])
      ; (useUnits as any).mockReturnValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders all filter controls', () => {
    render(
      <SimulationFiltersBar
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
      />
    )

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Station, line...')).toBeInTheDocument()
    expect(screen.getByText('Program')).toBeInTheDocument()
    expect(screen.getByText('Plant')).toBeInTheDocument()
    expect(screen.getByText('Unit')).toBeInTheDocument()
  })

  it('populates program dropdown', () => {
    ; (usePrograms as any).mockReturnValue(['ProgramA', 'ProgramB'])
    render(
      <SimulationFiltersBar
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
      />
    )

    expect(screen.getByText('ProgramA')).toBeInTheDocument()
    expect(screen.getByText('ProgramB')).toBeInTheDocument()
  })

  it('calls onFiltersChange when program selected', () => {
    ; (usePrograms as any).mockReturnValue(['ProgramA'])
    const onChange = vi.fn()

    render(
      <SimulationFiltersBar
        filters={defaultFilters}
        onFiltersChange={onChange}
      />
    )

    const selects = screen.getAllByRole('combobox')
    // 0: Program, 1: Plant, 2: Unit
    const programSelect = selects[0]

    fireEvent.change(programSelect, { target: { value: 'ProgramA' } })

    expect(onChange).toHaveBeenCalledWith({
      ...defaultFilters,
      program: 'ProgramA',
      plant: null,
      unit: null
    })
  })

  it('updates search term on input', () => {
    const onChange = vi.fn()
    render(
      <SimulationFiltersBar
        filters={defaultFilters}
        onFiltersChange={onChange}
      />
    )

    const input = screen.getByPlaceholderText('Station, line...')
    fireEvent.change(input, { target: { value: 'Test' } })

    expect(onChange).toHaveBeenCalledWith({
      ...defaultFilters,
      searchTerm: 'Test'
    })
  })

  it('enables plant select when program selected', () => {
    ; (usePrograms as any).mockReturnValue(['ProgramA'])
      ; (usePlants as any).mockReturnValue(['Plant1'])

    const filters = { ...defaultFilters, program: 'ProgramA' }

    render(
      <SimulationFiltersBar
        filters={filters}
        onFiltersChange={vi.fn()}
      />
    )

    const selects = screen.getAllByRole('combobox')
    const plantSelect = selects[1]

    expect(plantSelect).not.toBeDisabled()
    expect(screen.getByText('Plant1')).toBeInTheDocument()
  })

  it('clears all filters when Clear All clicked', () => {
    const filters = { program: 'P1', plant: 'Plant1', unit: 'U1', searchTerm: 'search' }
    const onChange = vi.fn()

    render(
      <SimulationFiltersBar
        filters={filters}
        onFiltersChange={onChange}
      />
    )

    const clearBtn = screen.getByText('Clear all')
    fireEvent.click(clearBtn)

    expect(onChange).toHaveBeenCalledWith({
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    })
  })
})
