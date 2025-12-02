import { Search, Filter } from 'lucide-react'
import type { ToolingFilterState, ToolingFilterOptions } from './useToolingFilters'

interface ToolingFilterBarProps {
  filters: ToolingFilterState
  options: ToolingFilterOptions
  onFilterChange: <K extends keyof ToolingFilterState>(key: K, value: ToolingFilterState[K]) => void
  onReset: () => void
}

function renderSelect<T extends keyof ToolingFilterState>(
  params: {
    label: string
    id: string
    value: ToolingFilterState[T]
    options: string[]
    onChange: (value: ToolingFilterState[T]) => void
  }
) {
  return (
    <div className="flex flex-col">
      <label htmlFor={params.id} className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
        {params.label}
      </label>
      <select
        id={params.id}
        data-testid={params.id}
        value={params.value}
        onChange={(event) => params.onChange(event.target.value as ToolingFilterState[T])}
        className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      >
        <option value="">All</option>
        {params.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ToolingFilterBar({ filters, options, onFilterChange, onReset }: ToolingFilterBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm px-4 py-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            Search tooling
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              data-testid="tooling-search-input"
              onChange={(event) => onFilterChange('search', event.target.value)}
              placeholder="GA description, tooling or equipment number…"
              className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
        >
          <Filter className="h-4 w-4" />
          Clear filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {renderSelect({
          label: 'Program',
          id: 'tooling-filter-program',
          value: filters.program,
          options: options.programs,
          onChange: (value) => onFilterChange('program', value)
        })}

        {renderSelect({
          label: 'Plant',
          id: 'tooling-filter-plant',
          value: filters.plant,
          options: options.plants,
          onChange: (value) => onFilterChange('plant', value)
        })}

        {renderSelect({
          label: 'Unit',
          id: 'tooling-filter-unit',
          value: filters.unit,
          options: options.units,
          onChange: (value) => onFilterChange('unit', value)
        })}

        {renderSelect({
          label: 'Area',
          id: 'tooling-filter-area',
          value: filters.area,
          options: options.areas,
          onChange: (value) => onFilterChange('area', value)
        })}

        {renderSelect({
          label: 'Station',
          id: 'tooling-filter-station',
          value: filters.station,
          options: options.stations,
          onChange: (value) => onFilterChange('station', value)
        })}

        {renderSelect({
          label: 'Tool Type',
          id: 'tooling-filter-toolType',
          value: filters.toolType,
          options: options.toolTypes,
          onChange: (value) => onFilterChange('toolType', value)
        })}

        {renderSelect({
          label: 'Design Stage',
          id: 'tooling-filter-designStage',
          value: filters.designStage,
          options: options.designStages,
          onChange: (value) => onFilterChange('designStage', value as ToolingFilterState['designStage'])
        })}

        {renderSelect({
          label: 'Workflow Stage',
          id: 'tooling-filter-workflowStage',
          value: filters.workflowStage,
          options: options.workflowStages,
          onChange: (value) => onFilterChange('workflowStage', value as ToolingFilterState['workflowStage'])
        })}

        {renderSelect({
          label: 'Bottleneck Reason',
          id: 'tooling-filter-bottleneckReason',
          value: filters.bottleneckReason,
          options: options.bottleneckReasons,
          onChange: (value) => onFilterChange('bottleneckReason', value as ToolingFilterState['bottleneckReason'])
        })}
      </div>
    </div>
  )
}
