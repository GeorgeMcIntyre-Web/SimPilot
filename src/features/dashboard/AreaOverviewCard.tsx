// Area Overview Card
// Card showing station health breakdown for an area

import { Layers } from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import { AreaCounts } from './dashboardUtils'
import { EmptyState } from '../../ui/components/EmptyState'

interface AreaOverviewCardProps {
  areaKey: string
  counts: AreaCounts
  isSelected?: boolean
  onClick?: () => void
}

export function AreaOverviewCard({
  areaKey,
  counts,
  isSelected = false,
  onClick
}: AreaOverviewCardProps) {
  const { total, critical, atRisk, ok } = counts

  // Calculate percentage for progress bar
  const okPercent = total > 0 ? (ok / total) * 100 : 0
  const atRiskPercent = total > 0 ? (atRisk / total) * 100 : 0
  const criticalPercent = total > 0 ? (critical / total) * 100 : 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600',
        isSelected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500 ring-2 ring-indigo-500/20'
          : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
      )}
      role="button"
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'p-2 rounded-lg',
          isSelected
            ? 'bg-indigo-100 dark:bg-indigo-800'
            : 'bg-gray-100 dark:bg-gray-700'
        )}>
          <Layers className={cn(
            'h-4 w-4',
            isSelected
              ? 'text-indigo-600 dark:text-indigo-300'
              : 'text-gray-500 dark:text-gray-400'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {areaKey}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} station{total === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
        {okPercent > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${okPercent}%` }}
          />
        )}
        {atRiskPercent > 0 && (
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${atRiskPercent}%` }}
          />
        )}
        {criticalPercent > 0 && (
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: `${criticalPercent}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-gray-600 dark:text-gray-400">{ok} OK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-gray-600 dark:text-gray-400">{atRisk} Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="text-gray-600 dark:text-gray-400">{critical} Crit</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Area Cards Grid
// ============================================================================

interface AreaCardsGridProps {
  areas: Array<{
    areaKey: string
    counts: AreaCounts
  }>
  selectedArea: string | null
  onSelectArea: (areaKey: string | null) => void
}

export function AreaCardsGrid({
  areas,
  selectedArea,
  onSelectArea
}: AreaCardsGridProps) {
  const handleCardClick = (areaKey: string) => {
    // Toggle selection
    if (selectedArea === areaKey) {
      onSelectArea(null)
      return
    }
    onSelectArea(areaKey)
  }

  if (areas.length === 0) {
    return (
      <EmptyState
        title="No areas found"
        message="Load data to see area coverage and status."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {areas.map(({ areaKey, counts }) => (
        <AreaOverviewCard
          key={areaKey}
          areaKey={areaKey}
          counts={counts}
          isSelected={selectedArea === areaKey}
          onClick={() => handleCardClick(areaKey)}
        />
      ))}
    </div>
  )
}
