// Snapshot Capture Service
// Captures a DailySnapshot from the current state after ingestion

import { coreStore } from '../coreStore'
import { buildCrossRef } from '../crossRef'
import {
  CellSnapshot,
  SimulationStatusSnapshot,
  ToolSnapshot,
  RobotSnapshot,
  WeldGunSnapshot,
  RiserSnapshot,
  GunForceSnapshot,
  CrossRefInput
} from '../crossRef/CrossRefTypes'
import { Cell, UnifiedAsset } from '../core'
import { DailySnapshot } from './snapshotTypes'
import { createDailySnapshot, snapshotStore } from './snapshotStore'
import { captureAndPersistSnapshot } from '../../persistence/snapshotPersistence'

// ============================================================================
// PUBLIC API
// ============================================================================

export interface CaptureSnapshotOptions {
  /** User or automation that triggered the capture */
  capturedBy?: string
  
  /** Source files that contributed to this snapshot */
  sourceFiles?: string[]
  
  /** Optional description for the snapshot */
  description?: string
  
  /** Skip persistence (for testing) */
  skipPersistence?: boolean
}

/**
 * Capture a snapshot of the current project state.
 * Call this after ingestion completes successfully.
 * 
 * This will:
 * 1. Build CrossRef from current store data
 * 2. Create a DailySnapshot
 * 3. Persist to IndexedDB
 * 
 * @param projectId - The project to capture
 * @param options - Capture options
 * @returns The captured snapshot
 */
export async function captureProjectSnapshot(
  projectId: string,
  options: CaptureSnapshotOptions = {}
): Promise<DailySnapshot | null> {
  const state = coreStore.getState()
  
  // Get project cells
  const projectCells = state.cells.filter(c => c.projectId === projectId)
  if (projectCells.length === 0) {
    console.warn(`[CaptureSnapshot] No cells found for project ${projectId}`)
    return null
  }
  
  // Get project assets
  const projectAssets = state.assets.filter(a => 
    projectCells.some(c => c.areaId === a.areaId || c.id === a.cellId)
  )
  
  // Build CrossRef input from store data
  const crossRefInput = buildCrossRefInputFromStore(projectCells, projectAssets as UnifiedAsset[])
  
  // Run CrossRef engine
  const crossRefResult = buildCrossRef(crossRefInput)
  
  // Create snapshot
  const snapshot = createDailySnapshot(
    projectId,
    crossRefResult.cells,
    crossRefResult.globalFlags,
    {
      capturedBy: options.capturedBy ?? 'system',
      sourceFiles: options.sourceFiles,
      description: options.description
    }
  )
  
  // Persist
  if (!options.skipPersistence) {
    await captureAndPersistSnapshot(snapshot)
    console.log(`[CaptureSnapshot] Captured snapshot ${snapshot.id} for project ${projectId}`)
  } else {
    snapshotStore.addSnapshot(snapshot)
  }
  
  return snapshot
}

/**
 * Capture snapshots for all loaded projects.
 * Useful for initial import that loads multiple projects.
 */
export async function captureAllProjectSnapshots(
  options: CaptureSnapshotOptions = {}
): Promise<DailySnapshot[]> {
  const state = coreStore.getState()
  const snapshots: DailySnapshot[] = []
  
  for (const project of state.projects) {
    const snapshot = await captureProjectSnapshot(project.id, options)
    if (snapshot) {
      snapshots.push(snapshot)
    }
  }
  
  return snapshots
}

// ============================================================================
// CROSSREF INPUT BUILDING
// ============================================================================

/**
 * Build CrossRef input from coreStore data.
 * Transforms Cell/UnifiedAsset entities to CrossRef snapshot format.
 */
function buildCrossRefInputFromStore(
  cells: Cell[],
  assets: UnifiedAsset[]
): CrossRefInput {
  const simulationStatusRows: SimulationStatusSnapshot[] = []
  const toolingRows: ToolSnapshot[] = []
  const robotSpecsRows: RobotSnapshot[] = []
  const weldGunRows: WeldGunSnapshot[] = []
  const gunForceRows: GunForceSnapshot[] = []
  const riserRows: RiserSnapshot[] = []
  
  // Convert cells to SimulationStatusSnapshot
  for (const cell of cells) {
    const stationKey = cell.code || cell.id
    
    simulationStatusRows.push({
      stationKey,
      areaKey: cell.areaId,
      lineCode: cell.lineCode,
      engineer: cell.assignedEngineer,
      firstStageCompletion: cell.simulation?.percentComplete,
      finalDeliverablesCompletion: cell.simulation?.percentComplete, // TODO: separate tracking
      dcsConfigured: cell.simulation?.metrics?.['DCS CONFIGURED'] === 100,
      raw: cell
    })
  }
  
  // Convert assets to appropriate CrossRef types
  for (const asset of assets) {
    const stationKey = asset.stationNumber || ''
    const rawData = asset as unknown as Record<string, unknown>
    
    if (asset.kind === 'ROBOT') {
      robotSpecsRows.push({
        stationKey,
        robotKey: asset.id,
        caption: asset.name,
        oemModel: asset.oemModel,
        hasDressPackInfo: Boolean(asset.metadata?.dressPackConfigured),
        raw: rawData
      })
      continue
    }
    
    if (asset.kind === 'GUN') {
      weldGunRows.push({
        stationKey,
        gunKey: asset.id,
        deviceName: asset.name,
        raw: rawData
      })
      continue
    }
    
    if (asset.kind === 'TOOL') {
      toolingRows.push({
        stationKey,
        areaKey: asset.areaId,
        toolId: asset.id,
        toolType: asset.description,
        raw: rawData
      })
      continue
    }
    
    // Handle risers
    if (asset.description?.toLowerCase().includes('riser')) {
      riserRows.push({
        stationKey,
        areaKey: asset.areaId,
        raw: rawData
      })
    }
  }
  
  return {
    simulationStatusRows,
    toolingRows,
    robotSpecsRows,
    weldGunRows,
    gunForceRows,
    riserRows
  }
}

// ============================================================================
// DIRECT CAPTURE FROM CROSSREF RESULT
// ============================================================================

/**
 * Capture a snapshot directly from a CrossRef result.
 * Use this when you've already run CrossRef independently.
 */
export async function captureFromCrossRefResult(
  projectId: string,
  cells: CellSnapshot[],
  globalFlags: import('../crossRef/CrossRefTypes').CrossRefFlag[],
  options: CaptureSnapshotOptions = {}
): Promise<DailySnapshot> {
  const snapshot = createDailySnapshot(
    projectId,
    cells,
    globalFlags,
    {
      capturedBy: options.capturedBy ?? 'system',
      sourceFiles: options.sourceFiles,
      description: options.description
    }
  )
  
  if (!options.skipPersistence) {
    await captureAndPersistSnapshot(snapshot)
  } else {
    snapshotStore.addSnapshot(snapshot)
  }
  
  return snapshot
}
