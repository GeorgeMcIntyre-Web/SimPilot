import { useWarnings } from '../../domain/coreStore'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

export function EntropyGauge() {
    const warnings = useWarnings()

    // Calculate entropy score (0-100)
    // Low score = flowing, high score = turbulent
    const score = Math.min(warnings.length * 10, 100)

    // Determine state
    const state = score < 30 ? 'flowing' : score < 70 ? 'moderate' : 'turbulent'

    const config = {
        flowing: {
            color: 'from-emerald-500 to-cyan-500',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            textColor: 'text-emerald-700 dark:text-emerald-300',
            icon: TrendingDown,
            label: 'Flowing 🌊',
            description: 'System is clean'
        },
        moderate: {
            color: 'from-yellow-500 to-orange-500',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            textColor: 'text-yellow-700 dark:text-yellow-300',
            icon: Activity,
            label: 'Active ⚡',
            description: 'Some attention needed'
        },
        turbulent: {
            color: 'from-orange-500 to-red-500',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            textColor: 'text-red-700 dark:text-red-300',
            icon: TrendingUp,
            label: 'Turbulent 🌪️',
            description: 'Review warnings'
        }
    }

    const current = config[state]
    const Icon = current.icon

    return (
        <div className={`${current.bgColor} rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700`}>
            <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${current.textColor}`} />
                <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className={`text-sm font-semibold ${current.textColor}`}>
                            {current.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {current.description}
                        </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${current.color} transition-all duration-500`}
                            style={{ width: `${score}%` }}
                        />
                    </div>
                </div>
                {warnings.length > 0 && (
                    <span className={`text-xs font-bold ${current.textColor}`}>
                        {warnings.length}
                    </span>
                )}
            </div>
        </div>
    )
}
