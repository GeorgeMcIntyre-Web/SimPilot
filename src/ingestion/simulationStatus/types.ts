import type { Project, Area, Cell, IngestionWarning } from '../../domain/core'
import type { OverviewScheduleMetrics } from '../../domain/core'
import type { SemanticLayerArtifact } from '../semanticLayer'

export interface SimulationMetric {
  /** Exact header text (preserving typos) */
  label: string
  /** 0-100 if parsed successfully, null otherwise */
  percent: number | null
  /** Original cell value before normalization */
  rawValue: string | number | boolean | null
}

export interface VacuumParsedRow {
  areaCode: string
  areaName: string
  assemblyLine?: string
  stationKey: string
  robotCaption?: string
  application?: string
  personResponsible?: string
  metrics: SimulationMetric[]
  sourceRowIndex: number
}

// Legacy type for backward compatibility
export interface ParsedSimulationRow {
  engineer?: string
  areaCode?: string
  areaName: string
  lineCode: string
  stationCode: string
  robotName?: string
  application?: string
  stageMetrics: Record<string, number>
  sourceRowIndex: number
}

export interface SimulationRobot {
  stationKey: string
  robotCaption: string
  areaKey?: string
  application?: string
  sourceRowIndex: number
}

export interface SimulationStatusResult {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  warnings: IngestionWarning[]
  vacuumRows?: VacuumParsedRow[]
  robotsFromSimStatus?: SimulationRobot[]
  overviewSchedule?: OverviewScheduleMetrics
  semanticLayer?: SemanticLayerArtifact
}

export interface BuildEntitiesInput {
  parsedRows: ParsedSimulationRow[]
  projectName: string
  customer: string
  fileName: string
  overviewSchedule?: OverviewScheduleMetrics
}

export interface BuildEntitiesResult {
  project: Project
  areas: Area[]
  cells: Cell[]
}
