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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="w-full h-10 pl-10 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="Search by name, station, area, model..."
            value={filters.searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {filters.searchTerm.length > 0 && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="asset-type-filter"
            data-testid="asset-type-filter"
            value={filters.assetKind}
            onChange={(e) => onKindChange(e.target.value as 'ALL' | 'ROBOT' | 'GUN' | 'TOOL' | 'OTHER')}
            className="h-10 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="ALL">All Types</option>
            <option value="ROBOT">Robots</option>
            <option value="GUN">Guns</option>
            <option value="TOOL">Tools</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            id="sourcing-filter"
            data-testid="sourcing-filter"
            value={filters.sourcing}
            onChange={(e) => onSourcingChange(e.target.value as EquipmentSourcing | 'ALL')}
            className="h-10 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="ALL">All Sourcing</option>
            <option value="NEW_BUY">New Buy</option>
            <option value="REUSE">Reuse</option>
            <option value="MAKE">Make</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          <select
            id="reuse-status-filter"
            data-testid="reuse-status-filter"
            value={filters.reuseStatus}
            onChange={(e) => onReuseStatusChange(e.target.value as ReuseAllocationStatus | 'ALL')}
            className="h-10 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="ALL">All Reuse</option>
            <option value="AVAILABLE">Available</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="IN_USE">In Use</option>
            <option value="RESERVED">Reserved</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          {availableLines.length > 0 && (
            <select
              id="line-filter"
              data-testid="line-filter"
              value={filters.line ?? ''}
              onChange={(e) => onLineChange(e.target.value === '' ? null : e.target.value)}
              className="h-10 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Lines</option>
              {availableLines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => onOnlyBottlenecksChange(!onlyBottlenecks)}
            aria-pressed={onlyBottlenecks}
            className={cn(
              'inline-flex items-center gap-2 h-10 px-3 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap',
              onlyBottlenecks
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            data-testid="bottleneck-only-filter"
            title="Toggle to show only bottleneck tools"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Only bottlenecks
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {availablePrograms.length > 0 && (
          <select
            id="program-filter"
            data-testid="program-filter"
            value={filters.program ?? ''}
            onChange={(e) => onProgramChange(e.target.value === '' ? null : e.target.value)}
            className="h-10 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Programs</option>
            {availablePrograms.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
        )}

        {availableAreas.length > 0 && (
          <select
            id="area-filter"
            data-testid="area-filter"
            value={filters.area ?? ''}
            onChange={(e) => onAreaChange(e.target.value === '' ? null : e.target.value)}
            className="h-10 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Areas</option>
            {availableAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 h-10 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  )
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
