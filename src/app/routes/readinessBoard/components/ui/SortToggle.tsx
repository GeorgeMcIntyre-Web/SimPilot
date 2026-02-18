import { cn } from '../../../../ui/lib/utils'

interface SortToggleProps {
  sortMode: 'risk' | 'due'
  onChange: (mode: 'risk' | 'due') => void
}

export function SortToggle({ sortMode, onChange }: SortToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-white/10 px-1 py-1 bg-white dark:bg-black/20 shadow-sm">
      <button
        onClick={() => onChange('risk')}
        className={cn(
          'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
          sortMode === 'risk'
            ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
        )}
      >
        RISK
      </button>
      <button
        onClick={() => onChange('due')}
        className={cn(
          'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
          sortMode === 'due'
            ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
        )}
      >
        DUE
      </button>
    </div>
  )
}
