/**
 * Robot Simulation Status Page
 *
 * Displays robot-by-robot simulation milestone tracking.
 * Uses the new simulation status store (robot-level milestone data).
 */

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
  AlertCircle,
  ExternalLink,
  Bot,
} from 'lucide-react'
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
      <PageHeader
        title="Robot Simulation Status"
        subtitle="Track robot-by-robot simulation milestone completion."
        actions={
          <button
            onClick={handleClearData}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Clear Data
          </button>
        }
      />

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Robots" value={stats.totalRobots} icon="🤖" />
        <StatCard label="Stations" value={stats.totalStations} icon="📍" />
        <StatCard label="Average Completion" value={`${stats.averageCompletion}%`} icon="📊" />
        <StatCard label="Areas" value={stats.totalAreas} icon="🏭" />
      </div>

      {/* Application Type Breakdown */}
      {stats.byApplication.size > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="typography-label text-gray-900 dark:text-gray-100 mb-4">
            By Application Type
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from(stats.byApplication.entries()).map(([app, data]) => (
              <div key={app} className="text-center">
                <div className="typography-metric text-gray-900 dark:text-gray-100">
                  {data.count}
                </div>
                <div className="typography-body text-gray-700 dark:text-gray-300">{app}</div>
                <div className="typography-caption text-gray-500 dark:text-gray-500">
                  {data.avgCompletion}% avg
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Robots by Station */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Station List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="typography-title-sm text-gray-900 dark:text-gray-100">
              Stations & Robots
            </h3>
            <p className="typography-subtitle text-gray-500 dark:text-gray-400 mt-1">
              Click to expand station details
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {Array.from(byStation.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([stationKey, robots]) => {
                const isExpanded = expandedStations.has(stationKey)
                const avgCompletion = Math.round(
                  robots.reduce((sum, r) => sum + r.overallCompletion, 0) / robots.length,
                )

                return (
                  <div key={stationKey}>
                    <button
                      onClick={() => toggleStation(stationKey)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="typography-body-strong text-gray-900 dark:text-gray-100">
                            Station {stationKey.replace('|', '-')}
                          </div>
                          <div className="typography-subtitle text-gray-500 dark:text-gray-400">
                            {robots.length} robot{robots.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="typography-body-strong text-gray-900 dark:text-gray-100">
                          {avgCompletion}%
                        </div>
                        <div className="typography-caption text-gray-500 dark:text-gray-400">
                          avg
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 space-y-2">
                        {robots
                          .sort((a, b) => a.robotFullId.localeCompare(b.robotFullId))
                          .map((robot) => (
                            <button
                              key={robot.robotFullId}
                              onClick={() => handleRobotRowClick(robot)}
                              className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                                selectedRobotId === robot.robotFullId
                                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {robot.overallCompletion === 100 ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : robot.overallCompletion === 0 ? (
                                    <Circle className="h-5 w-5 text-gray-400" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                                  )}
                                  <div>
                                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                      {robot.robotFullId}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {robot.application}
                                    </div>
                                    {(() => {
                                      const cell = cellByStationCode.get(
                                        robot.stationFull.toUpperCase(),
                                      )
                                      if (!cell) return null
                                      return (
                                        <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-300 mt-1">
                                          <ExternalLink className="h-3 w-3" />
                                          <Link
                                            to={`/projects/${cell.projectId}/cells/${encodeURIComponent(cell.id)}`}
                                            className="hover:underline"
                                          >
                                            View station {robot.stationFull}
                                          </Link>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {robot.overallCompletion}%
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>

        {/* Robot Detail */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="typography-title-sm text-gray-900 dark:text-gray-100">Robot Details</h3>
            {selectedRobot && (
              <p className="typography-subtitle text-gray-500 dark:text-gray-400 mt-1">
                {selectedRobot.robotFullId}
              </p>
            )}
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {selectedRobot ? (
              <RobotDetail robot={selectedRobot} />
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Select a robot to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <div className="typography-metric text-gray-900 dark:text-gray-100">{value}</div>
          <div className="typography-caption text-gray-600 dark:text-gray-400 mt-1">{label}</div>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}

function RobotDetail({ robot }: { robot: SimulationStatusEntity }) {
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

  return (
    <div className="space-y-6">
      {/* Robot Info */}
      <div>
        <h4 className="typography-label text-gray-700 dark:text-gray-300 mb-3">Information</h4>
        <dl className="space-y-2 typography-body">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Robot ID:</dt>
            <dd className="typography-body-strong text-gray-900 dark:text-gray-100">
              {robot.robotFullId}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Station:</dt>
            <dd className="typography-body-strong text-gray-900 dark:text-gray-100">
              {robot.stationFull}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Application:</dt>
            <dd className="typography-body-strong text-gray-900 dark:text-gray-100">
              {robot.application}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Owner:</dt>
            <dd className="typography-body-strong text-gray-900 dark:text-gray-100">
              <Link
                to={`/engineers?highlightEngineer=${encodeURIComponent(robot.responsiblePerson || 'UNASSIGNED')}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {robot.responsiblePerson || 'UNASSIGNED'}
              </Link>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Overall:</dt>
            <dd className="typography-body-strong text-gray-900 dark:text-gray-100">
              {robot.overallCompletion}%
            </dd>
          </div>
        </dl>
      </div>

      {/* Milestone Summary */}
      <div>
        <h4 className="typography-label text-gray-700 dark:text-gray-300 mb-3">
          Milestone Summary
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="typography-title-sm text-green-700 dark:text-green-400">
              {completed}
            </div>
            <div className="typography-caption text-green-600 dark:text-green-500">Completed</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="typography-title-sm text-yellow-700 dark:text-yellow-400">
              {inProgress}
            </div>
            <div className="typography-caption text-yellow-600 dark:text-yellow-500">
              In Progress
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="typography-title-sm text-gray-700 dark:text-gray-400">{notStarted}</div>
            <div className="typography-caption text-gray-600 dark:text-gray-500">Not Started</div>
          </div>
        </div>
      </div>

      {/* Linked Tooling */}
      {robot.linkedToolingEntityKeys.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Linked Tooling ({robot.linkedToolingEntityKeys.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {robot.linkedToolingEntityKeys.map((key: string) => (
              <div
                key={key}
                className="text-xs font-mono px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
              >
                {key}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones */}
      <div>
        <h4 className="typography-label text-gray-700 dark:text-gray-300 mb-3">
          Milestones ({milestones.length})
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {milestones.map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="typography-caption text-gray-700 dark:text-gray-300">
                  {formatMilestoneName(key)}
                </span>
                <span className="typography-body-strong text-gray-900 dark:text-gray-100">
                  {value}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    value === 100
                      ? 'bg-green-500'
                      : value > 0
                        ? 'bg-yellow-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RobotSimulationStatusPage
