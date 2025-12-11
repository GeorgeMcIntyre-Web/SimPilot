import { cn } from '../../ui/lib/utils'
import {
  Search,
  X,
  AlertTriangle,
  ShoppingCart,
  Recycle,
  Hammer,
  HelpCircle
} from 'lucide-react'
import type { EquipmentSourcing } from '../../domain/UnifiedModel'
import type { ReuseAllocationStatus } from '../../ingestion/excelIngestionTypes'
import type { UseAssetsFiltersReturn } from './useAssetsFilters'

type FilterBarProps = {
  filters: UseAssetsFiltersReturn['filters']
  availableAreas: string[]
  availableLines: string[]
  availablePrograms: string[]
  hasActiveFilters: boolean
  onlyBottlenecks: boolean
  onSearchChange: (term: string) => void
  onKindChange: (kind: 'ALL' | 'ROBOT' | 'GUN' | 'TOOL' | 'OTHER') => void
  onSourcingChange: (sourcing: EquipmentSourcing | 'ALL') => void
  onReuseStatusChange: (status: ReuseAllocationStatus | 'ALL') => void
  onAreaChange: (area: string | null) => void
  onLineChange: (line: string | null) => void
  onProgramChange: (program: string | null) => void
  onOnlyBottlenecksChange: (isActive: boolean) => void
  onClearFilters: () => void
}

export function AssetsFilterBar({
  filters,
  availableAreas,
  availableLines,
  availablePrograms,
  hasActiveFilters,
  onlyBottlenecks,
  onSearchChange,
  onKindChange,
  onSourcingChange,
  onReuseStatusChange,
  onAreaChange,
  onLineChange,
  onProgramChange,
  onOnlyBottlenecksChange,
  onClearFilters
}: FilterBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 space-y-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <input
          type="text"
          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-7 py-1 text-xs border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Search by name, station, area, model..."
          value={filters.searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {filters.searchTerm.length > 0 && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label htmlFor="asset-type-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                Type
              </label>
              <select
                id="asset-type-filter"
                data-testid="asset-type-filter"
                value={filters.assetKind}
                onChange={(e) => onKindChange(e.target.value as 'ALL' | 'ROBOT' | 'GUN' | 'TOOL' | 'OTHER')}
                className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value="ALL">All Types</option>
                <option value="ROBOT">Robots</option>
                <option value="GUN">Guns</option>
                <option value="TOOL">Tools</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="sourcing-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                Sourcing
              </label>
              <select
                id="sourcing-filter"
                data-testid="sourcing-filter"
                value={filters.sourcing}
                onChange={(e) => onSourcingChange(e.target.value as EquipmentSourcing | 'ALL')}
                className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value="ALL">All Sourcing</option>
                <option value="NEW_BUY">New Buy</option>
                <option value="REUSE">Reuse</option>
                <option value="MAKE">Make</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
          </div>

          <div className={cn('grid gap-1.5', availableLines.length > 0 ? 'grid-cols-3' : 'grid-cols-2')}>
            <div className={cn(availableLines.length > 0 ? '' : 'col-span-2')}>
              <label htmlFor="reuse-status-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                Reuse Status
              </label>
              <select
                id="reuse-status-filter"
                data-testid="reuse-status-filter"
                value={filters.reuseStatus}
                onChange={(e) => onReuseStatusChange(e.target.value as ReuseAllocationStatus | 'ALL')}
                className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ALLOCATED">Allocated</option>
                <option value="IN_USE">In Use</option>
                <option value="RESERVED">Reserved</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>

            {availableLines.length > 0 && (
              <div>
                <label htmlFor="line-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                  Line
                </label>
                <select
                  id="line-filter"
                  data-testid="line-filter"
                  value={filters.line ?? ''}
                  onChange={(e) => onLineChange(e.target.value === '' ? null : e.target.value)}
                  className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="">All Lines</option>
                  {availableLines.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {availableLines.length > 0 && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onOnlyBottlenecksChange(!onlyBottlenecks)}
                  aria-pressed={onlyBottlenecks}
                  className={cn(
                    'inline-flex items-center justify-between gap-2 rounded border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap',
                    'border-gray-300 bg-white text-gray-700 hover:border-amber-400 hover:text-amber-600',
                    'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-amber-400 dark:hover:text-amber-300'
                  )}
                  data-testid="bottleneck-only-filter"
                  title="Toggle to show only bottleneck tools"
                >
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Only bottlenecks
                  </span>
                  <span
                    className={cn(
                      'relative inline-flex h-4 w-8 items-center rounded-full border border-gray-300 dark:border-gray-600 transition-colors',
                      onlyBottlenecks ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  >
                    <span
                      className={cn(
                        'h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform',
                        onlyBottlenecks ? 'translate-x-3.5' : 'translate-x-0.5'
                      )}
                    />
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="space-y-1.5">
            {availablePrograms.length > 0 && (
              <div>
                <label htmlFor="program-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                  Program / Project
                </label>
                <select
                  id="program-filter"
                  data-testid="program-filter"
                  value={filters.program ?? ''}
                  onChange={(e) => onProgramChange(e.target.value === '' ? null : e.target.value)}
                  className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="">All Programs</option>
                  {availablePrograms.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {availableAreas.length > 0 && (
              <div>
                <label htmlFor="area-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                  Area
                </label>
                <select
                  id="area-filter"
                  data-testid="area-filter"
                  value={filters.area ?? ''}
                  onChange={(e) => onAreaChange(e.target.value === '' ? null : e.target.value)}
                  className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="">All Areas</option>
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="pt-1.5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClearFilters}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}

type SummaryStripProps = {
  counts: UseAssetsFiltersReturn['counts']
  onFilterClick: (filter: { sourcing?: EquipmentSourcing; reuseStatus?: ReuseAllocationStatus }) => void
}

export function AssetsSummaryStrip({ counts, onFilterClick }: SummaryStripProps) {
  const reuseCount = counts.bySourcing.REUSE ?? 0

  return (
    <div className="space-y-2 flex flex-col h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          onClick={() => onFilterClick({ sourcing: 'NEW_BUY' })}
          className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-3 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-500">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {counts.bySourcing.NEW_BUY ?? 0}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  New Buy
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => onFilterClick({ sourcing: 'REUSE' })}
          className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-3 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-500">
              <Recycle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {reuseCount}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  Reuse
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          onClick={() => onFilterClick({ sourcing: 'MAKE' })}
          className="rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 p-3 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-gray-500 dark:text-gray-400">
              <Hammer className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-700 dark:text-gray-300">
                  {counts.bySourcing.MAKE ?? 0}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  Make
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => onFilterClick({ sourcing: 'UNKNOWN' })}
          className={cn(
            'rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 p-3 transition-all hover:shadow-md cursor-pointer',
            counts.bySourcing.UNKNOWN ? 'ring-1 ring-amber-300 dark:ring-amber-400/60' : ''
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-gray-500 dark:text-gray-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-700 dark:text-gray-300">
                  {counts.bySourcing.UNKNOWN ?? 0}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  Unknown
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {counts.byReuseStatus.UNKNOWN ?? 0}
              </span>
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
                Unassigned tooling (unknown reuse)
              </span>
            </div>
            <p className="text-xs text-amber-700/80 dark:text-amber-200/80 mt-1">
              Assign a reuse status to track spend vs reuse targets.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
