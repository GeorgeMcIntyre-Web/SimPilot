import { AlertCircle, CheckCircle2, Clock, Target } from 'lucide-react'
import { StatCard } from '../../../ui/components/StatCard'
import type { ReadinessStats } from '../types'
import type { ReactNode } from 'react'

export function StatCards({ stats }: { stats: ReadinessStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <GradientCard variant="indigoBlue">
        <StatCard
          title="Total Stations"
          value={stats.total}
          icon={<Target className="h-6 w-6 text-indigo-500" />}
          className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-indigo-500/50 transition-colors"
        />
      </GradientCard>
      <GradientCard variant="emeraldTeal">
        <StatCard
          title="On Track"
          value={stats.onTrack}
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
          className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-emerald-500/50 transition-colors"
        />
      </GradientCard>
      <GradientCard variant="amberOrange">
        <StatCard
          title="At Risk"
          value={stats.atRisk}
          icon={<AlertCircle className="h-6 w-6 text-amber-500" />}
          className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-amber-500/50 transition-colors"
        />
      </GradientCard>
      <GradientCard variant="rosePink">
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
  variant = 'indigoBlue',
}: {
  children: ReactNode
  variant?: 'indigoBlue' | 'emeraldTeal' | 'amberOrange' | 'rosePink'
}) {
  const gradientClass = {
    indigoBlue: 'from-indigo-500/20 to-blue-500/20',
    emeraldTeal: 'from-emerald-500/20 to-teal-500/20',
    amberOrange: 'from-amber-500/20 to-orange-500/20',
    rosePink: 'from-rose-500/20 to-pink-500/20',
  }[variant]

  return (
    <div className="relative group cursor-default">
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r ${gradientClass} rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000`}
      />
      {children}
    </div>
  )
}
