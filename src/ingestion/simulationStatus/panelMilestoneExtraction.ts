/**
 * Panel milestone extraction and merging across Simulation Status sheets.
 */
import {
  MilestoneGroup,
  MilestoneValue,
  PanelMilestones,
  PanelType,
  ROBOT_SIMULATION_MILESTONES,
  SPOT_WELDING_MILESTONES,
  SEALER_MILESTONES,
  ALTERNATIVE_JOINING_MILESTONES,
  GRIPPER_MILESTONES,
  FIXTURE_MILESTONES,
  MRS_MILESTONES,
  OLP_MILESTONES,
  DOCUMENTATION_MILESTONES,
  LAYOUT_MILESTONES,
  SAFETY_MILESTONES,
  SimulationStatusEntity,
  createEmptyPanelMilestones,
  calculateGroupCompletion,
} from './simulationStatusTypes'
import { normalizeNumber, getColumnValue, normalizeStr, parseRobotIdentifier } from './parserUtils'

function extractPanelMilestones(
  raw: Record<string, unknown>,
  milestoneDefinitions: Record<string, string>
): MilestoneGroup {
  const milestones: Record<string, MilestoneValue> = {}

  for (const [_key, columnName] of Object.entries(milestoneDefinitions)) {
    const value = getColumnValue(raw, columnName)
    milestones[columnName] = normalizeNumber(value)
  }

  return {
    milestones,
    completion: calculateGroupCompletion(milestones),
  }
}

export function extractSimulationSheetPanels(raw: Record<string, unknown>): Partial<PanelMilestones> {
  return {
    robotSimulation: extractPanelMilestones(raw, ROBOT_SIMULATION_MILESTONES),
    spotWelding: extractPanelMilestones(raw, SPOT_WELDING_MILESTONES),
    sealer: extractPanelMilestones(raw, SEALER_MILESTONES),
    alternativeJoining: extractPanelMilestones(raw, ALTERNATIVE_JOINING_MILESTONES),
    gripper: extractPanelMilestones(raw, GRIPPER_MILESTONES),
    fixture: extractPanelMilestones(raw, FIXTURE_MILESTONES),
  }
}

export function extractMrsOlpSheetPanels(raw: Record<string, unknown>): Partial<PanelMilestones> {
  return {
    mrs: extractPanelMilestones(raw, MRS_MILESTONES),
    olp: extractPanelMilestones(raw, OLP_MILESTONES),
  }
}

export function extractDocumentationSheetPanels(raw: Record<string, unknown>): Partial<PanelMilestones> {
  return {
    documentation: extractPanelMilestones(raw, DOCUMENTATION_MILESTONES),
  }
}

export function extractSafetyLayoutSheetPanels(raw: Record<string, unknown>): Partial<PanelMilestones> {
  return {
    safety: extractPanelMilestones(raw, SAFETY_MILESTONES),
    layout: extractPanelMilestones(raw, LAYOUT_MILESTONES),
  }
}

export interface SheetPanelParseResult {
  robotKey: string
  stationKey: string
  area: string
  responsiblePerson: string
  application: string
  panels: Partial<PanelMilestones>
}

export function parseSheetForPanels(
  rows: Record<string, unknown>[],
  sheetType: 'SIMULATION' | 'MRS_OLP' | 'DOCUMENTATION' | 'SAFETY_LAYOUT'
): SheetPanelParseResult[] {
  const results: SheetPanelParseResult[] = []

  for (const raw of rows) {
    const robotFullId = normalizeStr(raw['ROBOT'])
    const stationFull = normalizeStr(raw['STATION'])

    if (!robotFullId || !stationFull) continue

    const parsedRobot = parseRobotIdentifier(robotFullId)
    if (!parsedRobot) continue

    let panels: Partial<PanelMilestones>
    switch (sheetType) {
      case 'SIMULATION':
        panels = extractSimulationSheetPanels(raw)
        break
      case 'MRS_OLP':
        panels = extractMrsOlpSheetPanels(raw)
        break
      case 'DOCUMENTATION':
        panels = extractDocumentationSheetPanels(raw)
        break
      case 'SAFETY_LAYOUT':
        panels = extractSafetyLayoutSheetPanels(raw)
        break
    }

    results.push({
      robotKey: robotFullId,
      stationKey: stationFull,
      area: parsedRobot.area,
      responsiblePerson: normalizeStr(raw['PERS. RESPONSIBLE']),
      application: normalizeStr(raw['APPLICATION']),
      panels,
    })
  }

  return results
}

export function mergePanelMilestonesByRobot(
  sheetResults: SheetPanelParseResult[][]
): Map<string, PanelMilestones> {
  const robotPanels = new Map<string, PanelMilestones>()

  for (const results of sheetResults) {
    for (const result of results) {
      let existing = robotPanels.get(result.robotKey)

      if (!existing) {
        existing = createEmptyPanelMilestones()
        robotPanels.set(result.robotKey, existing)
      }

      for (const [panelKey, panelData] of Object.entries(result.panels)) {
        if (panelData) {
          existing[panelKey as PanelType] = panelData
        }
      }
    }
  }

  return robotPanels
}

export function calculateOverallPanelCompletion(panels: PanelMilestones): number {
  const allMilestones: number[] = []

  for (const panel of Object.values(panels)) {
    const milestoneValues = Object.values(panel.milestones).filter((v): v is number => typeof v === 'number')
    allMilestones.push(...milestoneValues)
  }

  if (allMilestones.length === 0) return 0

  const completedCount = allMilestones.filter(v => v === 100).length
  return Math.round((completedCount / allMilestones.length) * 100)
}

export function attachPanelMilestonesToEntities(
  entities: SimulationStatusEntity[],
  robotPanels: Map<string, PanelMilestones>
): void {
  for (const entity of entities) {
    const panels = robotPanels.get(entity.robotFullId)
    if (panels) {
      entity.panelMilestones = panels
    }
  }
}
