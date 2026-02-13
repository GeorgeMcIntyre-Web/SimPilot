/**
 * Robot Simulation Status Page
 *
 * Displays robot-by-robot simulation milestone tracking.
 * Uses the new simulation status store (robot-level milestone data).
 */

import { StatCard } from '../../ui/components/StatCard'
import { PageHeader } from '../../ui/components/PageHeader'
import { EmptyState } from '../../ui/components/EmptyState'
import {
  useSimulationStatusStats,
  useSimulationStatusGroupedByStation,
  useSimulationStatusEntities,
  simulationStatusStore,
} from '../../ingestion/simulationStatus'
import type { SimulationStatusEntity } from '../../ingestion/simulationStatus'
import { useState, useMemo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Bot,
  Target,
  PieChart,
  Layers,
  Zap,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import { PageHint } from '../../ui/components/PageHint'
import { Link, useNavigate } from 'react-router-dom'
import { useCells } from '../../ui/hooks/useDomainData'
import { log } from '../../lib/log'

export function RobotSimulationStatusPage() {
  const navigate = useNavigate()
  const stats = useSimulationStatusStats()
  const byStation = useSimulationStatusGroupedByStation()
  const allEntities = useSimulationStatusEntities()
  const hasRobots = allEntities.length > 0
  const cells = useCells()
  const [expandedStations, setExpandedStations] = useState<Set<string>>(new Set())
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null)
  const cellByStationCode = useMemo(() => {
    const map = new Map<string, { id: string; projectId: string }>()
    cells.forEach((c) => {
      const code = c.code?.toUpperCase()
      if (code) {
        map.set(code, { id: c.id, projectId: c.projectId })
      }
    })
    return map
  }, [cells])
  const handleRobotRowClick = (robot: SimulationStatusEntity) => {
    setSelectedRobotId(robot.robotFullId)
    log.debug('[RobotSimulationStatus] Row click', {
      robotId: robot.robotFullId,
      station: robot.stationFull,
      area: robot.area,
      application: robot.application,
      overallCompletion: robot.overallCompletion,
      linkedTooling: robot.linkedToolingEntityKeys,
      responsiblePerson: robot.responsiblePerson || 'UNASSIGNED',
      source: robot.source,
      milestones: robot.milestones,
    })
  }

  const toggleStation = (stationKey: string) => {
    const newExpanded = new Set(expandedStations)
    if (newExpanded.has(stationKey)) {
      newExpanded.delete(stationKey)
    } else {
      newExpanded.add(stationKey)
    }
    setExpandedStations(newExpanded)
  }

  const selectedRobot = useMemo(() => {
    if (!selectedRobotId) return null
    return allEntities.find((e) => e.robotFullId === selectedRobotId)
  }, [allEntities, selectedRobotId])

  const handleClearData = () => {
    if (window.confirm('Clear all robot simulation status data?')) {
      simulationStatusStore.clear()
      setSelectedRobotId(null)
    }
  }

  if (!hasRobots) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Robot Simulation Status"
          subtitle={
            <PageHint
              standardText="Track robot-by-robot simulation milestone completion"
              flowerText="Your robots are waiting for their milestones"
            />
          }
        />
        <EmptyState
          title="No Data Loaded"
          message="Load a Simulation Status file in the Data Loader to see robot milestones here."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
          icon={<Bot className="h-7 w-7" />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 dark:text-gray-200">Robot Status</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-1">
              Simulation Integrity
            </h2>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              Robot <span className="text-indigo-600 dark:text-indigo-400">Status</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearData}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all duration-200"
            >
              <Zap className="h-3 w-3" />
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Overall Statistics Overlay */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-5 group-hover:opacity-15 transition duration-1000" />
          <StatCard
            title="Total Robots"
            value={stats.totalRobots}
            icon={<Bot className="h-6 w-6" />}
            className="relative border-none bg-white dark:bg-[rgb(31,41,55)] shadow-md"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-5 group-hover:opacity-15 transition duration-1000" />
          <StatCard
            title="Active Stations"
            value={stats.totalStations}
            icon={<Target className="h-6 w-6" />}
            className="relative border-none bg-white dark:bg-[rgb(31,41,55)] shadow-md"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-5 group-hover:opacity-15 transition duration-1000" />
          <StatCard
            title="Avg Completion"
            value={`${stats.averageCompletion}%`}
            icon={<Activity className="h-6 w-6" />}
            className="relative border-none bg-white dark:bg-[rgb(31,41,55)] shadow-md"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-500 to-slate-500 rounded-2xl blur opacity-5 group-hover:opacity-15 transition duration-1000" />
          <StatCard
            title="Project Areas"
            value={stats.totalAreas}
            icon={<Layers className="h-6 w-6" />}
            className="relative border-none bg-white dark:bg-[rgb(31,41,55)] shadow-md"
          />
        </div>
      </div>

      {stats.byApplication.size > 0 && (
        <section className="bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden p-6 transition-all duration-300">
          <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Application Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {Array.from(stats.byApplication.entries()).map(([app, data]) => (
              <div key={app} className="group flex flex-col items-center text-center">
                <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-1 transition-transform group-hover:scale-110">
                  {data.count}
                </div>
                <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">
                  {app}
                </div>
                <div className="w-full h-1 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${data.avgCompletion}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-gray-400 mt-2">
                  {data.avgCompletion}% AVG
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Robots by Station Overlay Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Station List */}
        <div className="lg:col-span-2 bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 relative z-10">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              Stations & Units
            </h3>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
              {byStation.size} Integrated Workcells
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/5 max-h-[700px] overflow-y-auto custom-scrollbar">
            {Array.from(byStation.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([stationKey, robots]) => {
                const isExpanded = expandedStations.has(stationKey)
                const avgCompletion = Math.round(
                  robots.reduce((sum, r) => sum + r.overallCompletion, 0) / robots.length,
                )

                return (
                  <div key={stationKey} className="transition-all">
                    <button
                      onClick={() => toggleStation(stationKey)}
                      className={cn(
                        'w-full px-6 py-4 flex items-center justify-between transition-colors text-left group',
                        isExpanded
                          ? 'bg-indigo-50/50 dark:bg-indigo-500/5'
                          : 'hover:bg-gray-50 dark:hover:bg-white/5',
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            isExpanded
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:bg-indigo-500 group-hover:text-white',
                          )}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            Node {stationKey.replace('|', '-')}
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            {robots.length} Units Connected
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            'text-lg font-black tabular-nums leading-none',
                            avgCompletion >= 90
                              ? 'text-emerald-500'
                              : avgCompletion >= 50
                                ? 'text-amber-500'
                                : 'text-gray-400',
                          )}
                        >
                          {avgCompletion}%
                        </div>
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          AVG SYNC
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-gray-50/30 dark:bg-black/20 px-4 py-3 space-y-2 border-t border-gray-100 dark:border-white/5">
                        {robots
                          .sort((a, b) => a.robotFullId.localeCompare(b.robotFullId))
                          .map((robot) => (
                            <button
                              key={robot.robotFullId}
                              onClick={() => handleRobotRowClick(robot)}
                              className={cn(
                                'w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 group relative overflow-hidden',
                                selectedRobotId === robot.robotFullId
                                  ? 'border-indigo-500 bg-white dark:bg-[rgb(31,41,55)] shadow-lg ring-1 ring-indigo-500/20'
                                  : 'border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30',
                              )}
                            >
                              <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={cn(
                                      'p-2 rounded-lg',
                                      robot.overallCompletion === 100
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : robot.overallCompletion > 0
                                          ? 'bg-amber-500/10 text-amber-500'
                                          : 'bg-gray-100 dark:bg-white/5 text-gray-400',
                                    )}
                                  >
                                    <Bot className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                      {robot.robotFullId}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                      {robot.application}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-sm font-black tabular-nums text-gray-900 dark:text-white">
                                  {robot.overallCompletion}%
                                </div>
                              </div>
                              {/* Background progress indicator */}
                              <div
                                className="absolute left-0 bottom-0 h-0.5 bg-indigo-500/20 transition-all duration-500"
                                style={{ width: `${robot.overallCompletion}%` }}
                              />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>

        {/* Robot Detail Overlay */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden sticky top-8">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  Robot Intelligence
                </h3>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                  Detailed Technical Execution
                </p>
              </div>
              {selectedRobot && (
                <div className="px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest">
                  {selectedRobot.robotFullId}
                </div>
              )}
            </div>
            <div className="p-8 max-h-[700px] overflow-y-auto custom-scrollbar">
              {selectedRobot ? (
                <RobotDetail robot={selectedRobot} cellByStationCode={cellByStationCode} />
              ) : (
                <div className="text-center py-24">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gray-50 dark:bg-white/5 text-gray-300 mb-6">
                    <Bot className="h-10 w-10 opacity-20" />
                  </div>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                    Select a robot to view intelligence
                  </h4>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RobotDetail({
  robot,
  cellByStationCode,
}: {
  robot: SimulationStatusEntity
  cellByStationCode: Map<string, { id: string; projectId: string }>
}) {
  const milestones = Object.entries(robot.milestones).filter(([_, value]) => value !== null) as [
    string,
    number,
  ][]
  const completed = milestones.filter(([_, value]) => value === 100).length
  const inProgress = milestones.filter(([_, value]) => value > 0 && value < 100).length
  const notStarted = milestones.filter(([_, value]) => value === 0).length

  const formatMilestoneName = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  const linkedCell = cellByStationCode.get(robot.stationFull.toUpperCase())

  return (
    <div className="space-y-10">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Completed
            </span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
            {completed}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 group hover:border-amber-500/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              In Sync
            </span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
            {inProgress}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 group hover:border-gray-500/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-lg bg-gray-500/10 text-gray-500">
              <Circle className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Pending
            </span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
            {notStarted}
          </div>
        </div>
      </div>

      {/* Robot Profile Section */}
      <section className="space-y-4">
        <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Unit Profile
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Unit ID', value: robot.robotFullId, accent: 'indigo' },
            { label: 'Workcell', value: robot.stationFull, sub: linkedCell && 'Active Node' },
            { label: 'Specialization', value: robot.application },
            {
              label: 'System Owner',
              value: robot.responsiblePerson || 'UNASSIGNED',
              highlight: true,
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5"
            >
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                {item.label}
              </div>
              <div
                className={cn(
                  'text-sm font-black tracking-tight uppercase',
                  item.highlight
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-900 dark:text-white',
                )}
              >
                {item.value}
              </div>
              {item.sub && (
                <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">
                  {item.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Navigation Shortcuts */}
      {linkedCell && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-600/5 border border-indigo-500/20">
          <Zap className="h-4 w-4 text-indigo-500" />
          <div className="flex-1">
            <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Active Workcell Integration
            </p>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
              Direct link to 3D simulation and station node.
            </p>
          </div>
          <Link
            to={`/projects/${linkedCell.projectId}/cells/${encodeURIComponent(linkedCell.id)}`}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
          >
            Go to Site
          </Link>
        </div>
      )}

      {/* Linked Tooling */}
      {robot.linkedToolingEntityKeys.length > 0 && (
        <section className="space-y-4">
          <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Connected Assets
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {robot.linkedToolingEntityKeys.map((key: string) => (
              <div
                key={key}
                className="text-[10px] font-black text-gray-500 dark:text-gray-400 px-3 py-2 bg-gray-100 dark:bg-white/5 rounded-lg border border-transparent hover:border-indigo-500/30 transition-colors cursor-default truncate uppercase tracking-tighter"
                title={key}
              >
                {key}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Technical Execution Milestones */}
      <section className="space-y-4">
        <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Technical Progress
        </h4>
        <div className="space-y-4">
          {milestones.map(([key, value]) => (
            <div key={key} className="group">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {formatMilestoneName(key)}
                </span>
                <span className="text-xs font-black tabular-nums text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded-md">
                  {value}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden relative border border-gray-200/5 dark:border-white/5">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out',
                    value === 100
                      ? 'bg-emerald-500'
                      : value > 0
                        ? 'bg-indigo-500'
                        : 'bg-gray-300 dark:bg-gray-700',
                  )}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default RobotSimulationStatusPage
