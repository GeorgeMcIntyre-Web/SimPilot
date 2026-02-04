import { generateId, deriveCellStatus } from '../../domain/core'
import type { Project, Area, Cell, SimulationStatus } from '../../domain/core'
import { buildStationId, normalizeStationCode } from '../normalizers'
import type { ParsedSimulationRow } from './types'
import type { OverviewScheduleMetrics, SchedulePhase, ScheduleStatus } from '../../domain/core'
import { derivePhase, deriveScheduleStatusFromWeeks } from './scheduleHeuristics'

export function groupByCell(rows: ParsedSimulationRow[]): Map<string, ParsedSimulationRow[]> {
  const groups = new Map<string, ParsedSimulationRow[]>()
  for (const row of rows) {
    const cellKey = `${row.areaName}:${row.lineCode}:${row.stationCode}`
    const group = groups.get(cellKey)

    if (group) {
      group.push(row)
    } else {
      groups.set(cellKey, [row])
    }
  }
  return groups
}

export function detectIssues(rows: ParsedSimulationRow[]): boolean {
  if (rows.length === 0) {
    return false
  }

  // Collect all metric values
  const allValues: number[] = []

  for (const row of rows) {
    allValues.push(...Object.values(row.stageMetrics))
  }

  if (allValues.length === 0) {
    return false
  }

  // Calculate average and min
  const avg = allValues.reduce((sum, val) => sum + val, 0) / allValues.length
  const min = Math.min(...allValues)

  // Flag as issue if:
  // 1. Average is low (< 50%)
  // 2. Or there's high variance (min is < 50% of average and average > 30)
  if (avg < 50) {
    return true
  }

  if (min < avg * 0.5 && avg > 30) {
    return true
  }

  return false
}

export function buildEntities(
  parsedRows: ParsedSimulationRow[],
  projectName: string,
  customer: string,
  fileName: string,
  primarySheetName: string,
  overviewSchedule?: OverviewScheduleMetrics
): { project: Project; areas: Area[]; cells: Cell[] } {
  const cellGroups = groupByCell(parsedRows)

  const project: Project = {
    id: generateId('proj', customer, projectName.replace(/\s+/g, '-')),
    name: projectName,
    customer,
    status: 'Running',
    manager: 'Dale'
  }

  const areas: Area[] = []
  const cells: Cell[] = []
  const areaMap = new Map<string, Area>()

  for (const [, cellRows] of cellGroups) {
    const firstRow = cellRows[0]

    // Get or create area
    const areaKey = `${project.id}:${firstRow.areaName}`
    let area = areaMap.get(areaKey)

    if (!area) {
      area = {
        id: generateId(project.id, 'area', firstRow.areaName.replace(/\s+/g, '-')),
        projectId: project.id,
        name: firstRow.areaName, // Human readable name (e.g., UNDERBODY)
        code: firstRow.areaCode || firstRow.lineCode // Prefer Area Code (8X), fallback to Line Code
      }
      areaMap.set(areaKey, area)
      areas.push(area)
    }

    // Calculate average completion
    const allMetrics = cellRows.flatMap(r => Object.values(r.stageMetrics))
    const avgComplete = allMetrics.length > 0
      ? allMetrics.reduce((sum, val) => sum + val, 0) / allMetrics.length
      : 0

    // Pick the first non-empty application value for the station (usually consistent)
    const application = cellRows.find(r => r.application)?.application

    // Detect issues (e.g., some stages lagging significantly)
    const hasIssues = detectIssues(cellRows)

    // Merge metrics from all rows (multiple sheets may contribute to same cell)
    const mergedMetrics: Record<string, number> = {}
    for (const row of cellRows) {
      Object.assign(mergedMetrics, row.stageMetrics)
    }

    // Build simulation status with all merged metrics from all sheets
    const simulation: SimulationStatus = {
      percentComplete: Math.round(avgComplete),
      hasIssues,
      metrics: mergedMetrics,  // Contains metrics from all sheets (prefixed with sheet name)
      sourceFile: fileName,
      sheetName: primarySheetName,
      rowIndex: firstRow.sourceRowIndex,
      application
    }

    // Derive schedule info for Readiness Board (phase + risk status)
    const schedulePhase: SchedulePhase = derivePhase(simulation.percentComplete)
    const scheduleStatus: ScheduleStatus = deriveScheduleStatusFromWeeks(simulation.percentComplete, overviewSchedule)

    // Build canonical stationId
    const stationId = buildStationId(firstRow.areaName, firstRow.stationCode)

    // Build cell
    const cell: Cell = {
      id: generateId(area.id, 'cell', normalizeStationCode(firstRow.stationCode) || firstRow.stationCode),
      projectId: project.id,
      areaId: area.id,
      name: `${firstRow.areaName} - ${firstRow.stationCode}`,
      code: firstRow.stationCode,
      stationId,
      status: deriveCellStatus(simulation.percentComplete, hasIssues),
      assignedEngineer: firstRow.engineer,
      lineCode: firstRow.lineCode,
      lastUpdated: new Date().toISOString(),
      simulation,
      schedule: {
        phase: schedulePhase,
        status: scheduleStatus
      }
    }

    cells.push(cell)
  }

  return { project, areas, cells }
}
