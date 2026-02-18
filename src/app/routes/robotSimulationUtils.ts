import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import {
  PanelMilestones,
  PanelType,
  calculateOverallCompletion,
} from '../../ingestion/simulationStatus/simulationStatusTypes'
import { StationRow } from './robotSimulationTypes'

export const formatRobotLabel = (cell: CellSnapshot): string => {
  const robotCaptions = (cell.robots || []).map((r) => r.caption || r.robotKey).filter(Boolean)
  if (robotCaptions.length > 0) {
    return Array.from(new Set(robotCaptions)).join(', ')
  }

  const rawRobot =
    (cell.simulationStatus?.raw as any)?.robotName ||
    (cell.simulationStatus?.raw as any)?.ROBOT ||
    ''
  const trimmed = typeof rawRobot === 'string' ? rawRobot.trim() : ''
  if (trimmed) return trimmed

  return '-'
}

export const getPanelCompletion = (
  panelMilestones: PanelMilestones | undefined,
  panelType: PanelType,
): number | null => {
  if (!panelMilestones) return null
  const group = panelMilestones[panelType]
  if (!group) return null

  if (typeof group.completion === 'number' && Number.isFinite(group.completion)) {
    return group.completion
  }
  const coerced = Number(group.completion)
  if (Number.isFinite(coerced)) return coerced

  const values = Object.values(group.milestones)
  const numericValues = values
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v))

  if (numericValues.length === 0) return null
  const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length
  return Math.round(avg)
}

export const getRowOverallCompletion = (row: StationRow): string => {
  const perRobotPanels = row.cell.simulationStatus?.robotPanelMilestones
  if (perRobotPanels) {
    let robotPanels = perRobotPanels[row.label]
    if (!robotPanels) {
      const upperLabel = row.label.toUpperCase()
      const matchKey = Object.keys(perRobotPanels).find((k) => k.toUpperCase() === upperLabel)
      if (matchKey) robotPanels = perRobotPanels[matchKey]
    }
    if (!robotPanels) return '-'
    const result = calculateOverallCompletion(robotPanels)
    return result !== null ? `${result}%` : '-'
  }

  const panelMilestones = row.cell.simulationStatus?.panelMilestones
  if (panelMilestones) {
    const result = calculateOverallCompletion(panelMilestones)
    return result !== null ? `${result}%` : '-'
  }

  const value = row.cell.simulationStatus?.firstStageCompletion
  if (typeof value !== 'number') return '-'
  return `${Math.round(value)}%`
}

export const getRowPanelMilestones = (row: StationRow, panelType: PanelType): number | null => {
  const perRobotPanels = row.cell.simulationStatus?.robotPanelMilestones
  if (perRobotPanels) {
    let robotPanels = perRobotPanels[row.label]
    if (!robotPanels) {
      const upperLabel = row.label.toUpperCase()
      const matchKey = Object.keys(perRobotPanels).find((k) => k.toUpperCase() === upperLabel)
      if (matchKey) robotPanels = perRobotPanels[matchKey]
    }
    if (!robotPanels) return null
    return getPanelCompletion(robotPanels, panelType)
  }

  return getPanelCompletion(row.cell.simulationStatus?.panelMilestones, panelType)
}

export const PANEL_CONFIGS: { title: string; panelType: PanelType; slug: string }[] = [
  { title: 'Robot Simulation', panelType: 'robotSimulation', slug: 'robot-simulation' },
  { title: 'Spot Welding', panelType: 'spotWelding', slug: 'spot-welding' },
  {
    title: 'Alternative Joining Applications',
    panelType: 'alternativeJoining',
    slug: 'alternative-joining-applications',
  },
  { title: 'Sealer', panelType: 'sealer', slug: 'sealer' },
  { title: 'Fixture', panelType: 'fixture', slug: 'fixture' },
  { title: 'Gripper', panelType: 'gripper', slug: 'gripper' },
  { title: 'Multi Resource Simulation', panelType: 'mrs', slug: 'mrs' },
  { title: 'OLP', panelType: 'olp', slug: 'olp' },
  { title: 'Documentation', panelType: 'documentation', slug: 'documentation' },
  { title: 'Layout', panelType: 'layout', slug: 'layout' },
  { title: 'Safety', panelType: 'safety', slug: 'safety' },
]
