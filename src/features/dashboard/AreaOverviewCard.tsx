// Area Overview Card
// Card showing station health breakdown for an area

import { useEffect, useMemo, useRef, useState } from 'react'
import { Layers, AlertTriangle } from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import { AreaCounts } from './dashboardUtils'
import { EmptyState } from '../../ui/components/EmptyState'
import { FixedSizeGrid as VirtualGrid } from 'react-window'

interface AreaOverviewCardProps {
  areaKey: string
  counts: AreaCounts
  isSelected?: boolean
  onClick?: () => void
  density?: 'comfortable' | 'compact'
}

export function AreaOverviewCard({
  areaKey,
  counts,
  isSelected = false,
  onClick,
  density = 'comfortable'
}: AreaOverviewCardProps) {
  const { total, critical, atRisk, ok } = counts
  const healthState =
    critical > 0
      ? {
          label: 'Critical',
          badge: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800',
          iconClass: 'text-rose-500'
        }
      : atRisk > 0
        ? {
            label: 'Watch',
            badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
            iconClass: 'text-amber-500'
          }
        : {
            label: 'Healthy',
            badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800',
            iconClass: 'text-emerald-500'
          }

  // Calculate percentage for progress bar
  const okPercent = total > 0 ? (ok / total) * 100 : 0
  const atRiskPercent = total > 0 ? (atRisk / total) * 100 : 0
  const criticalPercent = total > 0 ? (critical / total) * 100 : 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border transition-all duration-200 cursor-pointer',
        density === 'compact' ? 'p-2.5' : 'p-3',
        'hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600',
        isSelected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500 ring-2 ring-indigo-500/20'
          : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
      )}
      role="button"
      tabIndex={0}
      title={areaKey}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          'p-2 rounded-lg flex items-center justify-center',
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
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className="font-semibold text-gray-900 dark:text-white leading-tight whitespace-normal line-clamp-2"
                title={areaKey}
              >
                {areaKey}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {ok} healthy · {atRisk} risk · {critical} critical
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap border border-indigo-100 dark:border-indigo-700">
              {total} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', healthState.badge)}>
              <AlertTriangle className={cn('h-3.5 w-3.5', healthState.iconClass)} />
              {healthState.label}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
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
      {density === 'comfortable' ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-gray-700 dark:text-gray-300 font-semibold">{ok}</span>
            <span className="text-gray-500 dark:text-gray-400">OK</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-gray-700 dark:text-gray-300 font-semibold">{atRisk}</span>
            <span className="text-gray-500 dark:text-gray-400">Risk</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-gray-700 dark:text-gray-300 font-semibold">{critical}</span>
            <span className="text-gray-500 dark:text-gray-400">Crit</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">{ok}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">{atRisk}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">{critical}</span>
          </div>
        </div>
      )}
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
  density?: 'comfortable' | 'compact'
}

export function AreaCardsGrid({
  areas,
  selectedArea,
  onSelectArea,
  density = 'comfortable'
}: AreaCardsGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const gap = 12 // matches gap-3
  const cardHeight = density === 'compact' ? 148 : 172
  const rowHeight = cardHeight + gap
  const maxRowsVisible = 3
  const maxGridHeight = rowHeight * maxRowsVisible - gap

  const columns = useMemo(() => {
    if (containerWidth >= 1400) return 4
    if (containerWidth >= 1100) return 3
    if (containerWidth >= 640) return 2
    return 1
  }, [containerWidth])

  const virtualize = containerWidth > 0 && areas.length > 20

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

  if (!virtualize) {
    return (
      <div
        ref={containerRef}
        className="overflow-y-auto custom-scrollbar"
        style={{ maxHeight: maxGridHeight }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {areas.map(({ areaKey, counts }) => (
            <AreaOverviewCard
              key={areaKey}
              areaKey={areaKey}
              counts={counts}
              isSelected={selectedArea === areaKey}
              density={density}
              onClick={() => handleCardClick(areaKey)}
            />
          ))}
        </div>
      </div>
    )
  }

  // Virtualized grid for large datasets
  const usableWidth = Math.max(containerWidth - gap * (columns - 1), 0)
  const itemWidth = Math.max(Math.floor(usableWidth / columns), 120)
  const columnWidth = itemWidth
  const rowCount = Math.ceil(areas.length / columns)
  const fullHeight = Math.max(rowCount * rowHeight - gap, cardHeight)
  const height = Math.min(fullHeight, maxGridHeight)
  const gridWidth = containerWidth

  return (
    <div ref={containerRef}>
      <VirtualGrid
        columnCount={columns}
        columnWidth={columnWidth}
        height={height}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={gridWidth}
        className="custom-scrollbar"
      >
        {({ columnIndex, rowIndex, style }) => {
          const idx = rowIndex * columns + columnIndex
          if (idx >= areas.length) return null
          const { areaKey, counts } = areas[idx]

          const adjustedStyle = {
            ...style,
            width: itemWidth,
            height: cardHeight,
            padding: gap / 2,
            boxSizing: 'border-box'
          }

          return (
            <div style={adjustedStyle}>
              <AreaOverviewCard
                areaKey={areaKey}
                counts={counts}
                isSelected={selectedArea === areaKey}
                density={density}
                onClick={() => handleCardClick(areaKey)}
              />
            </div>
          )
        }}
      </VirtualGrid>
    </div>
  )
}
