import { Check, AlertTriangle } from 'lucide-react'
import { FlagsList } from '../../../ui/components/FlagBadge'

interface FlagsSectionProps {
  flags: any[]
}

export function FlagsSection({ flags }: FlagsSectionProps) {
  return (
    <section className="bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900/40 rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-900/10 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-rose-500" />
        <h3 className="text-sm font-bold text-rose-800 dark:text-rose-400 uppercase tracking-tight">
          Issues of concern ({flags.length})
        </h3>
      </div>
      <div className="p-5 max-h-[480px] overflow-y-auto custom-scrollbar">
        <FlagsList flags={flags} compact />
        {flags.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 mb-3">
              <Check className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 italic">
              No flags reported
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Cross-reference validation is clear.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
