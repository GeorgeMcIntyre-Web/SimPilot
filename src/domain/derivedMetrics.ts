// Derived Metrics
// Business logic for calculating project and global simulation metrics

import { coreStore } from './coreStore'
import { Cell } from './core'

// ============================================================================
// CONSTANTS
// ============================================================================

const AT_RISK_THRESHOLD = 80

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectMetrics {
  projectId: string
  cellCount: number
  avgCompletion: number | null
  atRiskCellsCount: number
}

export interface GlobalSimulationMetrics {
  totalProjects: number
  totalCells: number
  avgCompletion: number | null
  atRiskCellsCount: number
}

export interface EngineerMetrics {
  engineerName: string
  projectIds: string[]
  cellCount: number
  atRiskCellsCount: number
  avgCompletion: number | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a cell is at risk
 */
function isCellAtRisk(cell: Cell): boolean {
  if (!cell.simulation) return false

  if (cell.simulation.hasIssues) return true
  if (cell.simulation.percentComplete < AT_RISK_THRESHOLD) return true

  return false
}

/**
 * Calculate average completion from cells with simulation data
 */
function calculateAvgCompletion(cells: Cell[]): number | null {
  const cellsWithSim = cells.filter(c => c.simulation && c.simulation.percentComplete >= 0)

  if (cellsWithSim.length === 0) return null

  const sum = cellsWithSim.reduce((acc, c) => acc + (c.simulation?.percentComplete || 0), 0)
  return Math.round(sum / cellsWithSim.length)
}

/**
 * Normalize engineer name for comparison and grouping
 */
function normalizeEngineerName(name: string | undefined): string {
  if (!name) return ''
  return name.trim()
}

// ============================================================================
// PROJECT METRICS
// ============================================================================

/**
 * Get metrics for a specific project
 */
export function getProjectMetrics(projectId: string): ProjectMetrics {
  const state = coreStore.getState()
  const projectCells = state.cells.filter(c => c.projectId === projectId)

  const avgCompletion = calculateAvgCompletion(projectCells)
  const atRiskCellsCount = projectCells.filter(isCellAtRisk).length

  return {
    projectId,
    cellCount: projectCells.length,
    avgCompletion,
    atRiskCellsCount
  }
}

/**
 * Get metrics for all projects
 */
export function getAllProjectMetrics(): ProjectMetrics[] {
  const state = coreStore.getState()
  return state.projects.map(p => getProjectMetrics(p.id))
}

// ============================================================================
// GLOBAL METRICS
// ============================================================================

/**
 * Get global simulation metrics across all projects
 */
export function getGlobalSimulationMetrics(): GlobalSimulationMetrics {
  const state = coreStore.getState()

  const avgCompletion = calculateAvgCompletion(state.cells)
  const atRiskCellsCount = state.cells.filter(isCellAtRisk).length

  return {
    totalProjects: state.projects.length,
    totalCells: state.cells.length,
    avgCompletion,
    atRiskCellsCount
  }
}

// ============================================================================
// ENGINEER METRICS
// ============================================================================

/**
 * Get metrics for all engineers
 */
export function getAllEngineerMetrics(): EngineerMetrics[] {
  const state = coreStore.getState()

  // Group cells by engineer
  const engineerGroups = new Map<string, Cell[]>()

  for (const cell of state.cells) {
    const normalized = normalizeEngineerName(cell.assignedEngineer)
    if (!normalized) continue

    const existing = engineerGroups.get(normalized)
    if (!existing) {
      engineerGroups.set(normalized, [cell])
      continue
    }

    existing.push(cell)
  }

  // Calculate metrics for each engineer
  const metrics: EngineerMetrics[] = []

  for (const [engineerName, cells] of engineerGroups) {
    const projectIds = Array.from(new Set(cells.map(c => c.projectId)))
    const avgCompletion = calculateAvgCompletion(cells)
    const atRiskCellsCount = cells.filter(isCellAtRisk).length

    metrics.push({
      engineerName,
      projectIds,
      cellCount: cells.length,
      atRiskCellsCount,
      avgCompletion
    })
  }

  return metrics
}

/**
 * Get metrics for a specific engineer
 */
export function getEngineerMetrics(engineerName: string): EngineerMetrics | undefined {
  const normalized = normalizeEngineerName(engineerName)
  if (!normalized) return undefined

  const allMetrics = getAllEngineerMetrics()
  return allMetrics.find(m => m.engineerName === normalized)
}
