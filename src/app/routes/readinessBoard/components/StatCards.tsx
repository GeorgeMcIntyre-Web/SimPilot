import { AlertCircle, CheckCircle2, Clock, Target } from 'lucide-react'
import { StatCard } from '../../../ui/components/StatCard'
import type { ReadinessStats } from '../types'

export function StatCards({ stats }: { stats: ReadinessStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <GradientCard>
        <StatCard
          title="Total Stations"
          value={stats.total}
          icon={<Target className="h-6 w-6 text-indigo-500" />}
          className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-indigo-500/50 transition-colors"
        />
      </GradientCard>
      <GradientCard from="emerald" to="teal">
        <StatCard
          title="On Track"
          value={stats.onTrack}
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
          className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-emerald-500/50 transition-colors"
        />
      </GradientCard>
      <GradientCard from="amber" to="orange">
        <StatCard
          title="At Risk"
          value={stats.atRisk}
          icon={<AlertCircle className="h-6 w-6 text-amber-500" />}
          className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-amber-500/50 transition-colors"
        />
      </GradientCard>
      <GradientCard from="rose" to="pink">
        <StatCard
          title="Late"
          value={stats.late}
          icon={<Clock className="h-6 w-6 text-rose-500" />}
          className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-rose-500/50 transition-colors"
        />
      </GradientCard>
    </div>
  )
}

function GradientCard({
  children,
  from = 'indigo',
  to = 'blue',
}: {
  children: React.ReactNode
  from?: string
  to?: string
}) {
  return (
    <div className="relative group cursor-default">
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r from-${from}-500/20 to-${to}-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000`}
      />
      {children}
    </div>
  )
}
