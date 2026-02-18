import { Target } from 'lucide-react'
import { PHASE_LABELS } from '../constants'
import type { SchedulePhase } from '../../../domain/core'
import type { StationReadinessItem } from '../types'
import { StationReadinessCard } from './StationReadinessCard'

interface BoardColumnsProps {
  grouped: Array<{ phase: SchedulePhase; items: StationReadinessItem[] }>
}

export function BoardColumns({ grouped }: BoardColumnsProps) {
  if (grouped.length === 0) return null

  return (
    <div className="max-h-[1200px] overflow-x-auto pb-4 custom-scrollbar">
      <div className="flex gap-4 min-w-max h-full">
        {grouped.map(({ phase, items }) => (
          <div
            key={phase}
            className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="px-4 py-3 bg-gray-50/50 dark:bg-black/20 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] truncate pr-2">
                {PHASE_LABELS[phase]}
              </h3>
              <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[9px] font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                {items.length}
              </span>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[70vh]">
              {items.map((item) => (
                <StationReadinessCard key={item.station.contextKey} item={item} density="compact" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmptyBoardState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl">
      <div className="p-4 rounded-full bg-gray-50 dark:bg-white/5 mb-4">
        <Target className="h-8 w-8 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        No Stations Nodes Found
      </h3>
      <p className="text-xs text-gray-500 mt-1">Adjust filters to monitor deployment</p>
    </div>
  )
}
