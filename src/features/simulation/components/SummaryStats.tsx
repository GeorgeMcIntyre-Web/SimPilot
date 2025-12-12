import React from 'react'

interface SummaryStatsProps {
  totalStations: number
  totalRobots: number
  totalGuns: number
  totalReuse: number
  avgCompletion: number | null
}

export function SummaryStats({
  totalStations,
  totalRobots,
  totalGuns,
  totalReuse,
  avgCompletion
}: SummaryStatsProps) {
  const renderCard = (stat: { label: string; value: number | string; accent: string }) => (
    <div
      key={stat.label}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 h-full flex items-center justify-between shadow-sm"
    >
      <div>
        <div className={`text-xl font-bold ${stat.accent}`}>{stat.value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
      </div>
      <div className="h-10 w-1 rounded-full bg-gradient-to-b from-blue-200 via-purple-200 to-emerald-200 dark:from-blue-900/40 dark:via-purple-900/40 dark:to-emerald-900/40" />
    </div>
  )

  const stats = [
    { label: 'Stations', value: totalStations, accent: 'text-sky-600 dark:text-sky-400' },
    { label: 'Robots', value: totalRobots, accent: 'text-purple-600 dark:text-purple-400' },
    { label: 'Weld Guns', value: totalGuns, accent: 'text-amber-600 dark:text-amber-400' },
    { label: 'Reuse Items', value: totalReuse, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Avg Completion', value: avgCompletion !== null ? `${avgCompletion}%` : '—', accent: 'text-blue-600 dark:text-blue-400' }
  ]

  return (
    <div className="grid grid-cols-1 gap-3 h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderCard(stats[0])}
        {renderCard(stats[1])}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderCard(stats[2])}
        {renderCard(stats[3])}
      </div>
      {renderCard(stats[4])}
    </div>
  )
}
