import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, Activity, Layers, Target, ChevronRight } from 'lucide-react'
import { EmptyState } from '../../ui/components/EmptyState'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { log } from '../../lib/log'
import { StatCard } from '../../ui/components/StatCard'
import RobotSimulationStationsTable from './RobotSimulationStationsTable'
import {
  formatRobotLabel,
  getRowOverallCompletion,
  getRowPanelMilestones,
  PANEL_CONFIGS,
} from './robotSimulationUtils'
import { StationRow } from './robotSimulationTypes'

function RobotSimulationPage() {
  const { cells, loading, hasData } = useCrossRefData()

  const tableCells = useMemo(() => {
    if (!hasData) return []
    return cells.filter((c) => {
      const sim = c.simulationStatus
      if (!sim) return false
      return (
        sim.firstStageCompletion != null ||
        sim.panelMilestones != null ||
        (sim.application != null && sim.application.trim() !== '') ||
        (sim.engineer != null && sim.engineer.trim() !== '')
      )
    })
  }, [cells, hasData])

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedRow, setSelectedRow] = useState<StationRow | null>(null)

  useEffect(() => {
    if (selectedRow) {
      const cell = selectedRow.cell
      log.debug('[RobotSimulationPage] Selected row:', {
        stationKey: cell.stationKey,
        displayCode: cell.displayCode,
        hasSimulationStatus: !!cell.simulationStatus,
        hasPanelMilestones: !!cell.simulationStatus?.panelMilestones,
        panelMilestones: cell.simulationStatus?.panelMilestones,
        robotSimulationCompletion:
          cell.simulationStatus?.panelMilestones?.robotSimulation?.completion,
      })
    }
  }, [selectedRow])

  useEffect(() => {
    if (hasData && cells.length > 0) {
      const cellsWithPanelMilestones = cells.filter((c) => c.simulationStatus?.panelMilestones)
      log.debug('[RobotSimulationPage] Cells loaded:', {
        totalCells: cells.length,
        cellsWithSimulationStatus: cells.filter((c) => c.simulationStatus).length,
        cellsWithPanelMilestones: cellsWithPanelMilestones.length,
        sampleCell: cells[0]
          ? {
              stationKey: cells[0].stationKey,
              hasPanelMilestones: !!cells[0].simulationStatus?.panelMilestones,
            }
          : null,
      })
    }
  }, [hasData, cells])

  useEffect(() => {
    if (!hasData || selectedRow) return
    const stationParam = searchParams.get('station')
    const robotParam = searchParams.get('robot')
    if (!stationParam || !robotParam) return

    const matchCell = cells.find((c) => c.stationKey === stationParam)
    if (!matchCell) return

    const candidateLabels: string[] = []
    if (matchCell.robots && matchCell.robots.length > 0) {
      for (const robot of matchCell.robots) {
        candidateLabels.push(formatRobotLabel({ ...matchCell, robots: [robot] }))
      }
    } else {
      candidateLabels.push(formatRobotLabel(matchCell))
    }

    const labelMatch = candidateLabels.find((l) => l === robotParam)
    if (!labelMatch) return

    const row: StationRow = {
      cell: matchCell,
      label: labelMatch,
      application: matchCell.simulationStatus?.application ?? 'Unknown',
    }
    setSelectedRow(row)
  }, [hasData, cells, selectedRow, searchParams])

  if (!loading && tableCells.length === 0) {
    return (
      <div className="space-y-8 pb-4">
        <div className="flex flex-col gap-4">
          <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              SimPilot
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 dark:text-gray-200">Robot Status</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
                Robot <span className="text-indigo-600 dark:text-indigo-400">Status</span>
              </h1>
            </div>
          </div>
        </div>

        <EmptyState
          title="No Robot Data"
          message="Load simulation data from the Data Loader to see robot status here."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
          icon={<Bot className="h-7 w-7" />}
        />
      </div>
    )
  }

  const avgCompletion =
    tableCells.length > 0
      ? Math.round(
          tableCells.reduce((acc, c) => acc + (c.simulationStatus?.firstStageCompletion || 0), 0) /
            tableCells.length,
        )
      : 0

  return (
    <div className="space-y-8 pb-4">
      <div className="flex flex-col gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            SimPilot
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 dark:text-gray-200">Robot Status</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              Robot <span className="text-indigo-600 dark:text-indigo-400">Status</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">
                  Sync Status
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                  Active Connection
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Total Robots"
            value={tableCells.length}
            icon={<Bot className="h-6 w-6 text-indigo-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Stations"
            value={new Set(tableCells.map((c) => c.stationKey)).size}
            icon={<Target className="h-6 w-6 text-emerald-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Avg Sync"
            value={`${avgCompletion}%`}
            icon={<Activity className="h-6 w-6 text-amber-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-amber-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Project Areas"
            value={new Set(tableCells.map((c) => c.areaKey)).size}
            icon={<Layers className="h-6 w-6 text-purple-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        <section className="lg:basis-[65%] lg:max-w-[65%] bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm p-4 flex flex-col h-fit">
          <div className="overflow-hidden min-h-0">
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading stations...</div>
            ) : (
              <RobotSimulationStationsTable
                cells={tableCells}
                onSelect={(row) => setSelectedRow(row)}
              />
            )}
          </div>
        </section>

        <section className="flex-1 lg:flex-none lg:basis-[35%] lg:max-w-[35%] bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm p-4 flex flex-col min-h-0 h-full overflow-hidden">
          {selectedRow ? (
            <div className="space-y-4 flex-1 min-h-0 h-full">
              <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 p-4 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                      {selectedRow.label}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                        <Target className="h-3 w-3" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                        Station {selectedRow.cell.stationKey}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    {(() => {
                      const completion = parseFloat(getRowOverallCompletion(selectedRow)) || 0
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-white text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                            completion >= 100
                              ? 'bg-green-500'
                              : completion >= 50
                                ? 'bg-indigo-500'
                                : completion > 0
                                  ? 'bg-amber-400'
                                  : 'bg-gray-400'
                          }`}
                        >
                          {getRowOverallCompletion(selectedRow)}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                <div className="my-4 border-t border-gray-200 dark:border-white/5" />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                      Simulator
                    </span>
                    <Link
                      to={`/engineers?highlightEngineer=${encodeURIComponent(selectedRow.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED')}`}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight hover:underline flex items-center gap-1.5"
                    >
                      {selectedRow.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'}
                    </Link>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                      Application
                    </span>
                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      {selectedRow.cell.simulationStatus?.application ?? 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-1 min-h-0 max-h-[535px] overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 gap-3">
                  {PANEL_CONFIGS.map(({ title, panelType, slug }) => {
                    const completion = getRowPanelMilestones(selectedRow, panelType)
                    const hasData = completion !== null
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/robot-simulation/${slug}?robot=${encodeURIComponent(selectedRow.label)}&station=${encodeURIComponent(selectedRow.cell.stationKey)}`,
                          )
                        }
                        className="w-full text-left rounded-xl border border-gray-500/70 bg-[rgb(32,41,55)] p-4 hover:border-gray-400 hover:bg-[rgb(38,49,65)] transition-all group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-black text-gray-200 uppercase tracking-tight group-hover:text-indigo-300 transition-colors">
                            {title}
                          </span>
                          <span
                            className={
                              hasData
                                ? 'text-xs font-black tabular-nums text-gray-100'
                                : 'text-xs font-black tabular-nums text-gray-500'
                            }
                          >
                            {hasData ? `${completion}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              hasData
                                ? completion >= 100
                                  ? 'bg-green-500'
                                  : completion >= 50
                                    ? 'bg-indigo-500'
                                    : completion > 0
                                      ? 'bg-amber-400'
                                      : 'bg-gray-300 dark:bg-gray-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                            style={{ width: hasData ? `${completion}%` : '0%' }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="p-4 rounded-full bg-gray-50 dark:bg-white/5 text-gray-300 mb-4">
                <Bot className="h-12 w-12 opacity-20" />
              </div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                Select Robot
              </h3>
              <p className="text-[10px] font-bold text-gray-500 max-w-[200px] mt-2">
                Pick a robot from the registry to view its simulation status.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default RobotSimulationPage
