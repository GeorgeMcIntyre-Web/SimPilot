// Area Overview Card
// Card showing station health breakdown for an area

import { useEffect, useMemo, useRef, useState } from 'react'
import { Layers, ArrowUpRight, ShieldCheck, Activity, Zap } from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import { AreaCounts } from './dashboardUtils'
import { EmptyState } from '../../ui/components/EmptyState'
import { FixedSizeGrid as VirtualGrid } from 'react-window'

interface AreaOverviewCardProps {
  areaKey: string
  displayTitle?: string
  counts: AreaCounts
  isSelected?: boolean
  onClick?: () => void
  onOverviewClick?: (areaKey: string) => void
  density?: 'comfortable' | 'compact'
}

export function AreaOverviewCard({
  areaKey,
  displayTitle,
  counts,
  isSelected = false,
  onClick,
  onOverviewClick,
  density = 'comfortable',
}: AreaOverviewCardProps) {
  const { total, critical, atRisk, ok } = counts
  const healthState =
    critical > 0
      ? {
          label: 'Critical',
          badge:
            'bg-rose-50/50 text-rose-700 border border-rose-200/50 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/50',
          icon: <Zap className="h-3.5 w-3.5 text-rose-500" />,
          glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
        }
      : atRisk > 0
        ? {
            label: 'Watch',
            badge:
              'bg-amber-50/50 text-amber-700 border border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50',
            icon: <Activity className="h-3.5 w-3.5 text-amber-500" />,
            glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
          }
        : {
            label: 'Stable',
            badge:
              'bg-emerald-50/50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50',
            icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />,
            glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
          }

  const okPercent = total > 0 ? (ok / total) * 100 : 0
  const atRiskPercent = total > 0 ? (atRisk / total) * 100 : 0
  const criticalPercent = total > 0 ? (critical / total) * 100 : 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden',
        density === 'compact' ? 'p-3' : 'p-4',
        isSelected
          ? 'border-indigo-500 bg-white dark:bg-[rgb(31,41,55)] shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20'
          : 'border-gray-200 bg-white dark:bg-[rgb(31,41,55)] dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/40',
        healthState.glow,
      )}
      role="button"
      tabIndex={0}
    >
      {/* Dynamic Background Blur */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-2xl opacity-40" />

      {/* Header */}
      <div className="flex items-start gap-4 mb-4 relative z-10">
        <div
          className={cn(
            'p-2.5 rounded-xl flex items-center justify-center transition-colors duration-300',
            isSelected
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
          )}
        >
          <Layers className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className="text-sm font-black text-gray-900 dark:text-white leading-tight tracking-tight whitespace-normal line-clamp-1"
                title={displayTitle || areaKey}
              >
                {displayTitle || areaKey}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                {total} Stations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300',
                healthState.badge,
              )}
            >
              {healthState.icon}
              {healthState.label}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden flex shadow-inner relative z-10">
        {okPercent > 0 && (
          <div
            className="bg-emerald-500 relative overflow-hidden"
            style={{ width: `${okPercent}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
        )}
        {atRiskPercent > 0 && (
          <div
            className="bg-amber-500 relative overflow-hidden"
            style={{ width: `${atRiskPercent}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
        )}
        {criticalPercent > 0 && (
          <div
            className="bg-rose-500 relative overflow-hidden"
            style={{ width: `${criticalPercent}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
        )}
      </div>

      {/* Legend & Actions */}
      <div className="mt-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{ok}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>{atRisk}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>{critical}</span>
          </div>
        </div>

        {onOverviewClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOverviewClick(areaKey)
            }}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all duration-200 border border-transparent"
          >
            View
            <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
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
    displayTitle?: string
    counts: AreaCounts
  }>
  selectedArea: string | null
  onSelectArea: (areaKey: string | null) => void
  onViewOverview?: (areaKey: string) => void
  density?: 'comfortable' | 'compact'
}

export function AreaCardsGrid({
  areas,
  selectedArea,
  onSelectArea,
  onViewOverview,
  density = 'comfortable',
}: AreaCardsGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const gap = 12 // matches gap-3
  const cardHeight = density === 'compact' ? 148 : 172
  const rowHeight = cardHeight + gap
  const maxRowsVisible = 2.85
  const maxGridHeight = rowHeight * maxRowsVisible

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
      <EmptyState title="No areas found" message="Load data to see area coverage and status." />
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
          {areas.map(({ areaKey, displayTitle, counts }) => (
            <AreaOverviewCard
              key={areaKey}
              areaKey={areaKey}
              displayTitle={displayTitle}
              counts={counts}
              isSelected={selectedArea === areaKey}
              density={density}
              onClick={() => handleCardClick(areaKey)}
              onOverviewClick={onViewOverview}
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
          const { areaKey, displayTitle, counts } = areas[idx]

          const adjustedStyle: React.CSSProperties = {
            ...style,
            width: itemWidth,
            height: cardHeight,
            padding: gap / 2,
            boxSizing: 'border-box',
          }
          return (
            <div style={adjustedStyle}>
              <AreaOverviewCard
                areaKey={areaKey}
                displayTitle={displayTitle}
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
