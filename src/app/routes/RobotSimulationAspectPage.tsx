import { useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import {
  PanelType,
  PANEL_SLUG_TO_TYPE,
  PANEL_MILESTONE_DEFINITIONS,
  MilestoneValue,
} from '../../ingestion/simulationStatus/simulationStatusTypes'

type MilestoneField = { label: string; percent: MilestoneValue }

const friendlyTitle = (aspect?: string): string => {
  if (!aspect) return 'Aspect'
  return aspect
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Get color class based on completion value
 */
const getProgressColorClass = (percent: MilestoneValue): string => {
  if (percent === null) return 'bg-gray-300 dark:bg-gray-600'
  if (percent === 100) return 'bg-green-500'
  if (percent > 0) return 'bg-blue-500'
  return 'bg-gray-300 dark:bg-gray-600'
}

/**
 * Get text color class based on completion value
 */
const getTextColorClass = (percent: MilestoneValue): string => {
  if (percent === null) return 'text-gray-400 dark:text-gray-500'
  if (percent === 100) return 'text-green-600 dark:text-green-400'
  if (percent > 0) return 'text-blue-600 dark:text-blue-400'
  return 'text-gray-500 dark:text-gray-400'
}

function RobotSimulationAspectPage() {
  const { aspect } = useParams<{ aspect: string }>()
  const [searchParams] = useSearchParams()
  const robot = searchParams.get('robot') || 'Unknown Robot'
  const stationKey = searchParams.get('station') || ''

  const { cells, hasData } = useCrossRefData()

  const title = useMemo(() => friendlyTitle(aspect), [aspect])

  // Get panel type from URL slug
  const panelType: PanelType | null = useMemo(() => {
    if (!aspect) return null
    return PANEL_SLUG_TO_TYPE[aspect] || null
  }, [aspect])

  // Find the cell and get panel milestones
  const { fields, completedCount, totalCount, panelCompletion } = useMemo(() => {
    const result: {
      fields: MilestoneField[]
      completedCount: number
      totalCount: number
      panelCompletion: number | null
    } = {
      fields: [],
      completedCount: 0,
      totalCount: 0,
      panelCompletion: null,
    }

    if (!panelType || !hasData) {
      // Return milestone definitions with null values
      const definitions = panelType ? PANEL_MILESTONE_DEFINITIONS[panelType] : {}
      result.fields = Object.values(definitions).map(label => ({ label, percent: null }))
      result.totalCount = result.fields.length
      return result
    }

    // Find the cell by station key
    const cell = cells.find(c => c.stationKey === stationKey)

    // Try per-robot panel milestones first
    const robotPanels = cell?.simulationStatus?.robotPanelMilestones
      ? cell.simulationStatus.robotPanelMilestones[robot]
      : undefined
    const panelGroup = robotPanels?.[panelType] || cell?.simulationStatus?.panelMilestones?.[panelType]
    if (!panelGroup) {
      const definitions = PANEL_MILESTONE_DEFINITIONS[panelType]
      result.fields = Object.values(definitions).map(label => ({ label, percent: null }))
      result.totalCount = result.fields.length
      return result
    }

    // Get the milestone definitions for this panel
    const definitions = PANEL_MILESTONE_DEFINITIONS[panelType]
    const milestoneLabels = Object.values(definitions)

    // Build fields with actual values
    result.fields = milestoneLabels.map(label => {
      const percent = panelGroup.milestones[label] ?? null
      return { label, percent }
    })

    result.totalCount = result.fields.length
    result.completedCount = result.fields.filter(f => f.percent === 100).length
    const hasNumeric = result.fields.some(f => typeof f.percent === 'number')
    result.panelCompletion = hasNumeric ? panelGroup.completion : null

    return result
  }, [panelType, hasData, cells, stationKey])

  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Robot
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">
              {robot}
            </div>
          </div>
          {panelCompletion !== null && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">Panel Completion</div>
                {panelCompletion === null ? (
                  <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">N/A</div>
                ) : (
                  <div className={`text-2xl font-bold ${panelCompletion === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {panelCompletion}%
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {panelCompletion === null
                  ? 'No applicable milestones'
                  : `(${completedCount}/${totalCount} milestones)`}
              </div>
            </div>
          )}
        </div>

        {fields.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map(({ label, percent }) => (
              <div
                key={label}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white gap-2">
                  <span className="truncate pr-3" title={label}>{label}</span>
                  <span className={`flex-shrink-0 ${getTextColorClass(percent)}`}>
                    {typeof percent === 'number' ? `${percent}%` : '—'}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColorClass(percent)}`}
                    style={{ width: typeof percent === 'number' ? `${percent}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
            No milestones defined for this aspect yet.
          </div>
        )}

        <Link
          to="/robot-simulation"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm mt-4"
        >
          &larr; Back to Robot Simulation
        </Link>
      </div>
    </div>
  )
}

export default RobotSimulationAspectPage
