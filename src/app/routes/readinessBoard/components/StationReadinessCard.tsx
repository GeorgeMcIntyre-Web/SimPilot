import { Calendar, Clock, User, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../../ui/lib/utils'
import type { StationReadinessItem } from '../types'

interface StationReadinessCardProps {
  item: StationReadinessItem
  density: 'compact' | 'comfortable'
}

export function StationReadinessCard({ item }: StationReadinessCardProps) {
  const engineer = item.station.simulationStatus?.engineer
  const completion = item.completion ?? undefined
  const totalTools = item.station.assetCounts.tools + item.station.assetCounts.other
  const navigate = useNavigate()

  const statusLabel =
    item.status === 'onTrack'
      ? 'Active'
      : item.status === 'atRisk'
        ? 'At Risk'
        : item.status === 'late'
          ? 'Delayed'
          : 'Pending'

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'onTrack':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dot-emerald-500'
      case 'atRisk':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20 dot-amber-500'
      case 'late':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20 dot-rose-500'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20 dot-gray-400'
    }
  }

  const styles = getStatusStyle(item.status)

  return (
    <div
      onClick={() =>
        navigate(
          `/projects/${item.projectId ?? ''}/cells/${encodeURIComponent(item.station.cellId)}`,
        )
      }
      className={cn(
        'group relative rounded-2xl border p-4 transition-all cursor-pointer overflow-hidden',
        'bg-white dark:bg-white/5',
        'border-gray-100 dark:border-white/5',
        'hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1',
      )}
    >
      {item.status === 'late' && (
        <div className="absolute top-0 right-0 p-1">
          <div className="h-1 w-1 rounded-full bg-rose-500 animate-ping" />
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {item.station.station}
          </h4>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">
            {item.projectName || 'Unassigned Node'}
          </div>
        </div>

        {completion !== undefined && (
          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums">
              {completion}%
            </span>
          </div>
        )}
      </div>

      <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            (completion ?? 0) >= 90
              ? 'bg-emerald-500'
              : (completion ?? 0) >= 50
                ? 'bg-indigo-500'
                : 'bg-rose-500',
          )}
          style={{ width: `${completion ?? 0}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-white/5 pt-3">
        <div className="flex items-center gap-3">
          {engineer ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3 w-3 text-gray-400" />
              <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-tight truncate">
                {engineer}
              </span>
            </div>
          ) : (
            <span className="text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">
              UNASSIGNED
            </span>
          )}

          {totalTools > 0 && (
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-indigo-500/50" />
              <span className="text-[9px] font-black text-gray-900 dark:text-white tabular-nums">
                {totalTools}
              </span>
            </div>
          )}
        </div>

        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border',
            styles,
          )}
        >
          <div className={cn('h-1 w-1 rounded-full', styles.split('dot-')[1])} />
          {statusLabel}
        </span>
      </div>

      {(item.daysLate !== undefined && item.daysLate > 0) || item.daysToDue !== undefined ? (
        <div className="mt-3 flex items-center justify-end">
          {item.daysLate && item.daysLate > 0 ? (
            <div className="flex items-center gap-1 py-1 px-2 rounded-md bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest border border-rose-500/20">
              <Clock className="h-2.5 w-2.5" />
              Critical: {item.daysLate}d Overdue
            </div>
          ) : item.daysToDue !== undefined ? (
            <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest">
              <Calendar className="h-2.5 w-2.5" />
              Due in {item.daysToDue}d
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
