import { Activity } from 'lucide-react'

export function Chip({ label, onClear }: { label: string | undefined; onClear: () => void }) {
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest">
      {label}
      <button
        onClick={onClear}
        className="hover:text-indigo-900 dark:hover:text-white transition-colors"
      >
        <Activity className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}
