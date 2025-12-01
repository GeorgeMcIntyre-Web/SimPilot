import { Target } from 'lucide-react'
import { EntropyGauge } from './EntropyGauge'
import { FlowerArt } from './FlowerArt'
import { useCells } from '../hooks/useDomainData'
import { Cell } from '../../domain/core'

/**
 * ZenFocusHeader - Clean, elegant dashboard header
 * Replaces cluttered DaleTodayPanel and DaleValuePropPanel
 * 
 * Layout: FlowerArt (left) | EntropyGauge (center) | Top Priority (right)
 */
export function ZenFocusHeader() {
    const cells = useCells()

    // Find the #1 priority: worst cell (lowest completion with issues)
    const topPriority = cells
        .filter((c: Cell) => c.simulation?.hasIssues || (c.simulation && c.simulation.percentComplete < 100 && c.status === 'Blocked'))
        .sort((a, b) => (a.simulation?.percentComplete || 0) - (b.simulation?.percentComplete || 0))
    [0]

    return (
        <div className="relative overflow-hidden rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-rose-100 dark:border-rose-900/30 shadow-lg mb-8 animate-fade-in">
            {/* Glassmorphism effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-rose-50/50 via-transparent to-transparent dark:from-rose-900/10" />

            <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 py-6 px-8">
                {/* Left: FlowerArt */}
                <div className="hidden lg:flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-300">
                    <FlowerArt className="w-32 h-32" />
                </div>

                {/* Center: EntropyGauge */}
                <div className="flex flex-col items-center justify-center space-y-3">
                    <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        System Entropy
                    </h2>
                    <div className="w-full max-w-xs">
                        <EntropyGauge />
                    </div>
                </div>

                {/* Right: Top Priority */}
                <div className="flex flex-col items-start lg:items-end justify-center space-y-2">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-rose-500" />
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Top Focus
                        </span>
                    </div>
                    {topPriority ? (
                        <div className="text-left lg:text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {topPriority.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                {topPriority.simulation?.percentComplete}% complete · {topPriority.assignedEngineer || 'Unassigned'}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            ✨ All clear – no critical cells
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
