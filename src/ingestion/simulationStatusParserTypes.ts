/**
 * Simulation Status Parser Types
 * Type definitions for simulation status parsing
 */

import {
    Project,
    Area,
    Cell,
    IngestionWarning,
    OverviewScheduleMetrics
} from '../domain/core'

// ============================================================================
// VACUUM PARSER TYPES
// ============================================================================

/**
 * A single metric vacuumed from a non-core column.
 */
export interface SimulationMetric {
    /** Exact header text (preserving typos) */
    label: string
    /** 0-100 if parsed successfully, null otherwise */
    percent: number | null
    /** Original cell value before normalization */
    rawValue: string | number | boolean | null
}

/**
 * A parsed row with core fields + vacuum-captured metrics.
 */
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

/**
 * Legacy type for backward compatibility
 */
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

/**
 * Robot extracted from simulation status (station + robot combination)
 */
export interface SimulationRobot {
    stationKey: string
    robotCaption: string
    areaKey?: string
    application?: string
    sourceRowIndex: number
}

/**
 * Result of parsing simulation status files
 */
export interface SimulationStatusResult {
    projects: Project[]
    areas: Area[]
    cells: Cell[]
    warnings: IngestionWarning[]
    /** Vacuum-parsed rows for advanced consumers */
    vacuumRows?: VacuumParsedRow[]
    /** Robots extracted from simulation status (one per unique station+robot combination) */
    robotsFromSimStatus?: SimulationRobot[]
    /** High-level schedule info pulled from OVERVIEW sheet */
    overviewSchedule?: OverviewScheduleMetrics
}

// ============================================================================
// CORE FIELDS (Known Columns)
// ============================================================================

/**
 * Column name aliases for flexible matching
 */
export const COLUMN_ALIASES: Record<string, string[]> = {
    'AREA_CODE': ['AREA', 'AREA CODE', 'ZONE', 'SHORT NAME'],
    'AREA_NAME': ['AREA NAME', 'AREA DESCRIPTION', 'FULL NAME'],
    'ASSEMBLY LINE': ['ASSEMBLY LINE', 'LINE', 'LINE CODE'],
    'STATION': ['STATION NO. NEW', 'STATION', 'STATION CODE', 'STATION KEY', 'STATION NO.'],
    'ROBOT': ['ROBOT', 'ROBOT CAPTION', 'ROBOT NAME'],
    'APPLICATION': ['APPLICATION', 'APP'],
    'PERSONS RESPONSIBLE': ['PERSONS RESPONSIBLE', 'PERSON RESPONSIBLE', 'ENGINEER', 'RESPONSIBLE']
}

/**
 * Required headers for finding the header row
 * AREA and ASSEMBLY LINE are optional - can be derived or missing
 */
export const REQUIRED_HEADERS = [
    'STATION',
    'ROBOT'
]

/**
 * Priority order for simulation sheet detection
 */
export const SIMULATION_SHEET_PRIORITY = ['SIMULATION', 'MRS_OLP', 'DOCUMENTATION', 'SAFETY_LAYOUT']
