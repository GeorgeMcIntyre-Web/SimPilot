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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2.5 shadow-sm">
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
  return (
    <div className="space-y-2.5 flex flex-col h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        <StatTile
          label="Total Assets"
          value={counts.total}
          accent="text-sky-600 dark:text-sky-300"
        />
        <StatTile
          label="New Buy"
          value={counts.bySourcing.NEW_BUY ?? 0}
          accent="text-blue-600 dark:text-blue-300"
          onClick={() => onFilterClick({ sourcing: 'NEW_BUY' })}
        />
        <StatTile
          label="Reuse"
          value={counts.bySourcing.REUSE ?? 0}
          accent="text-emerald-600 dark:text-emerald-300"
          onClick={() => onFilterClick({ sourcing: 'REUSE' })}
        />
        <StatTile
          label="Make"
          value={counts.bySourcing.MAKE ?? 0}
          accent="text-slate-700 dark:text-slate-200"
          onClick={() => onFilterClick({ sourcing: 'MAKE' })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <StatTile
          label="Unknown"
          value={counts.bySourcing.UNKNOWN ?? 0}
          accent="text-amber-600 dark:text-amber-300"
          onClick={() => onFilterClick({ sourcing: 'UNKNOWN' })}
        />
        <AlertTile value={counts.byReuseStatus.UNKNOWN ?? 0} />
      </div>
    </div>
  )
}

function StatTile({ label, value, accent, onClick }: { label: string; value: number | string; accent: string; onClick?: () => void }) {
  const interactive = Boolean(onClick)
  const body = (
    <div className="bg-white dark:bg-[#202937] rounded-lg border border-gray-200 dark:border-gray-700 p-3 h-full flex items-center justify-between shadow-sm">
      <div>
        <div className={"text-xl font-bold " + accent}>{value}</div>
        <div className="text-[11px] uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 font-semibold">{label}</div>
      </div>
      <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-200 via-indigo-200 to-emerald-200 dark:from-sky-900/40 dark:via-indigo-900/40 dark:to-emerald-900/40" />
    </div>
  )

  if (!interactive) return body

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-lg"
    >
      {body}
    </button>
  )
}

function AlertTile({ value }: { value: number }) {
  return (
    <div className="bg-white dark:bg-[#202937] rounded-lg border border-amber-200 dark:border-amber-700 p-3 h-full flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-amber-800 dark:text-amber-200">{value}</div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800 dark:text-amber-200 truncate">Unassigned reuse</div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-200/80 truncate">Assign reuse to track spend.</p>
        </div>
      </div>
      <div className="h-10 w-1 rounded-full bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 dark:from-amber-900/50 dark:via-amber-800/50 dark:to-amber-700/50" />
    </div>
  )
}
