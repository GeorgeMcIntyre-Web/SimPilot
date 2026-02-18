import { cn } from '../../../../ui/lib/utils'

interface StatusMultiSelectProps {
  selected: Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>
  onChange: (val: Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>) => void
}

export function StatusMultiSelect({ selected, onChange }: StatusMultiSelectProps) {
  const options: Array<{ value: 'onTrack' | 'atRisk' | 'late' | 'unknown'; label: string }> = [
    { value: 'onTrack', label: 'ACTIVE' },
    { value: 'atRisk', label: 'AT RISK' },
    { value: 'late', label: 'DELAYED' },
    { value: 'unknown', label: 'PENDING' },
  ]

  const toggle = (value: (typeof options)[number]['value']) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value))
    else onChange([...selected, value])
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => toggle(opt.value)}
          className={cn(
            'px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
            selected.includes(opt.value)
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-white dark:bg-black/20 text-gray-400 border-gray-200 dark:border-white/10 hover:border-indigo-500/50',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
