// Simulation Adapter
// Populates simulation store from core store data
// Transforms cells/assets into StationContext hierarchy

import { useMemo, useEffect } from 'react'
import { useCoreStore, type CoreStoreState } from '../../domain/coreStore'
import {
  simulationStore,
  generateContextKey,
  type StationContext,
  type AssetCounts,
  type SourcingCounts,
  type SimulationStatusInfo
} from './simulationStore'
import type { Cell, Project, Area, UnifiedAsset } from '../../domain/core'

// ============================================================================
// TYPES
// ============================================================================

interface HierarchyParts {
  program: string
  plant: string
  unit: string
  line: string
  station: string
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Extract hierarchy parts from cell and project data
 * Uses available fields to derive Program/Plant/Unit/Line/Station
 */
function extractHierarchy(
  cell: Cell,
  project: Project | undefined,
  area: Area | undefined
): HierarchyParts {
  // Program: from project customer or name (e.g., "STLA-S")
  const program = project?.customer ?? project?.name ?? 'Unknown Program'
  
  // Plant: from project plant field or infer from area
  const plant = project?.plant ?? 'Unknown Plant'
  
  // Unit: from project name or area name (e.g., "Rear Unit", "Underbody")
  const unit = area?.name ?? project?.name ?? 'Unknown Unit'
  
  // Line: from cell lineCode or area code
  const line = cell.lineCode ?? area?.code ?? 'Default Line'
  
  // Station: from cell code or name
  const station = cell.code ?? cell.name
  
  return { program, plant, unit, line, station }
}

/**
 * Count assets by type for a cell
 */
function countAssets(assets: UnifiedAsset[]): AssetCounts {
  const counts: AssetCounts = { total: 0, robots: 0, guns: 0, tools: 0, other: 0 }
  
  for (const asset of assets) {
    counts.total++
    
    if (asset.kind === 'ROBOT') {
      counts.robots++
      continue
    }
    
    if (asset.kind === 'GUN') {
      counts.guns++
      continue
    }
    
    if (asset.kind === 'TOOL') {
      counts.tools++
      continue
    }
    
    counts.other++
  }
  
  return counts
}

/**
 * Count assets by sourcing type
 */
function countSourcing(assets: UnifiedAsset[]): SourcingCounts {
  const counts: SourcingCounts = { reuse: 0, freeIssue: 0, newBuy: 0, unknown: 0 }
  
  for (const asset of assets) {
    const sourcing = asset.sourcing ?? 'UNKNOWN'
    const tags = asset.metadata?.rawTags
    const hasFreeIssue = typeof tags === 'string' && tags.toLowerCase().includes('free')
    
    if (hasFreeIssue) {
      counts.freeIssue++
      continue
    }
    
    if (sourcing === 'REUSE') {
      counts.reuse++
      continue
    }
    
    if (sourcing === 'NEW_BUY') {
      counts.newBuy++
      continue
    }
    
    counts.unknown++
  }
  
  return counts
}

/**
 * Extract simulation status info from cell
 */
function extractSimulationStatus(cell: Cell): SimulationStatusInfo | undefined {
  if (cell.simulation === undefined) return undefined
  
  const sim = cell.simulation
  
  return {
    firstStageCompletion: sim.percentComplete,
    finalDeliverablesCompletion: sim.metrics?.['finalDeliverablesCompletion'] as number | undefined,
    dcsConfigured: sim.metrics?.['dcsConfigured'] === 'true' || sim.metrics?.['dcsConfigured'] === 'Yes' || sim.metrics?.['dcsConfigured'] === 1,
    engineer: cell.assignedEngineer,
    sourceFile: sim.sourceFile,
    sheetName: sim.sheetName
  }
}

/**
 * Get assets associated with a cell
 */
function getAssetsForCell(cellId: string, assets: UnifiedAsset[]): UnifiedAsset[] {
  return assets.filter(asset => asset.cellId === cellId)
}

/**
 * Get assets associated with a station by station number
 */
function getAssetsByStation(stationNumber: string, assets: UnifiedAsset[]): UnifiedAsset[] {
  const normalized = stationNumber.toLowerCase().trim()
  
  return assets.filter(asset => {
    const assetStation = asset.stationNumber?.toLowerCase().trim()
    if (assetStation === normalized) return true
    
    // Also check metadata for station code
    const metaStation = asset.metadata?.stationCode
    if (typeof metaStation === 'string' && metaStation.toLowerCase().trim() === normalized) {
      return true
    }
    
    return false
  })
}

// ============================================================================
// TRANSFORMATION
// ============================================================================

/**
 * Transform core store state into StationContext array
 */
export function transformToStationContexts(state: CoreStoreState): StationContext[] {
  const { projects, areas, cells, assets } = state
  
  // Build lookup maps
  const projectMap = new Map(projects.map(p => [p.id, p]))
  const areaMap = new Map(areas.map(a => [a.id, a]))
  
  const stationContexts: StationContext[] = []
  
  for (const cell of cells) {
    const project = projectMap.get(cell.projectId)
    const area = areaMap.get(cell.areaId)
    const hierarchy = extractHierarchy(cell, project, area)
    
    // Get assets for this cell
    const cellAssets = getAssetsForCell(cell.id, assets)
    
    // Also try by station number if no cell-linked assets found
    const stationAssets = cellAssets.length === 0
      ? getAssetsByStation(cell.code, assets)
      : cellAssets
    
    const context: StationContext = {
      contextKey: generateContextKey(hierarchy),
      program: hierarchy.program,
      plant: hierarchy.plant,
      unit: hierarchy.unit,
      line: hierarchy.line,
      station: hierarchy.station,
      simulationStatus: extractSimulationStatus(cell),
      assetCounts: countAssets(stationAssets),
      sourcingCounts: countSourcing(stationAssets),
      assets: stationAssets
    }
    
    stationContexts.push(context)
  }
  
  return stationContexts
}

// ============================================================================
// SYNC HOOK
// ============================================================================

/**
 * Hook to sync simulation store with core store
 * Call this once at app level to keep stores in sync
 */
export function useSimulationSync(): void {
  const coreState = useCoreStore()
  
  const stationContexts = useMemo(
    () => transformToStationContexts(coreState),
    [coreState]
  )
  
  useEffect(() => {
    simulationStore.setStations(stationContexts)
  }, [stationContexts])
}

/**
 * One-time sync function for imperative use
 * Note: This is a placeholder for imperative sync if needed
 */
export function syncSimulationStore(): void {
  // This function is a placeholder
  // Use useSimulationSync hook for reactive sync
}
