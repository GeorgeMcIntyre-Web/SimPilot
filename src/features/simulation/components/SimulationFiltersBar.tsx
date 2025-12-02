// Simulation Filters Bar
// Filter controls for Program, Plant, Unit hierarchy
// Uses derived selectors for filter options

import { Search, X, Filter } from 'lucide-react'
import { usePrograms, usePlants, useUnits } from '../simulationStore'
import type { SimulationFilters } from '../simulationSelectors'

// ============================================================================
// TYPES
// ============================================================================

interface SimulationFiltersBarProps {
  filters: SimulationFilters
  onFiltersChange: (filters: SimulationFilters) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SimulationFiltersBar({
  filters,
  onFiltersChange
}: SimulationFiltersBarProps) {
  const programs = usePrograms()
  const plants = usePlants(filters.program)
  const units = useUnits(filters.program, filters.plant)

  const handleProgramChange = (program: string | null) => {
    onFiltersChange({
      ...filters,
      program,
      plant: null,
      unit: null
    })
  }

  const handlePlantChange = (plant: string | null) => {
    onFiltersChange({
      ...filters,
      plant,
      unit: null
    })
  }

  const handleUnitChange = (unit: string | null) => {
    onFiltersChange({
      ...filters,
      unit
    })
  }

  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({
      ...filters,
      searchTerm
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    })
  }

  const hasActiveFilters = filters.program !== null ||
    filters.plant !== null ||
    filters.unit !== null ||
    filters.searchTerm !== ''

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="ml-auto text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Station, line, engineer..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Program Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Program
          </label>
          <select
            value={filters.program ?? ''}
            onChange={(e) => handleProgramChange(e.target.value === '' ? null : e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Programs</option>
            {programs.map(program => (
              <option key={program} value={program}>{program}</option>
            ))}
          </select>
        </div>

        {/* Plant Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Plant
          </label>
          <select
            value={filters.plant ?? ''}
            onChange={(e) => handlePlantChange(e.target.value === '' ? null : e.target.value)}
            disabled={filters.program === null}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Plants</option>
            {plants.map(plant => (
              <option key={plant} value={plant}>{plant}</option>
            ))}
          </select>
        </div>

        {/* Unit Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unit
          </label>
          <select
            value={filters.unit ?? ''}
            onChange={(e) => handleUnitChange(e.target.value === '' ? null : e.target.value)}
            disabled={filters.plant === null}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Units</option>
            {units.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
