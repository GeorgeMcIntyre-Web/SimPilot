// SimPilot Snapshot Builder
// Builds a SimPilotDataSnapshot from the local in-memory stores (coreStore)
// so the dashboard bottlenecks panel can operate on real ingested Excel data.

import { coreStore } from './coreStore'
import { simPilotStore } from './simPilotStore'
import type { SimPilotDataSnapshot } from './ExcelIngestionFacade'
import type { WorkflowItem, StageStatusSnapshot, WorkflowStatus } from './workflowTypes'
import { analyzeWorkflowBottlenecks } from './workflowBottleneckLinker'
import {
  createEmptyBottleneckSnapshot,
  createEmptyToolingSnapshot
} from './toolingTypes'
import type { SimplifiedAsset } from '../ingestion/parsers/reuseLinker'

/**
 * Hydrate simPilotStore with a snapshot derived from coreStore data.
 * This uses only locally ingested Excel data already present in memory.
 */
export function syncSimPilotStoreFromLocalData(): void {
  const snapshot = buildSimPilotSnapshotFromLocalData()
  simPilotStore.setSnapshot(snapshot)
}

/**
 * Build a SimPilotDataSnapshot from the current coreStore state.
 * Focuses on tooling assets; robots are ignored for bottleneck UI.
 */
export function buildSimPilotSnapshotFromLocalData(): SimPilotDataSnapshot {
  const coreState = coreStore.getState()
  const projectsById = new Map(coreState.projects.map(p => [p.id, p]))
  const areasById = new Map(coreState.areas.map(a => [a.id, a]))
  const cellsById = new Map(coreState.cells.map(c => [c.id, c]))

  // Map tooling assets (non-robot unified assets) to workflow items
  const toolingAssets = coreState.assets.filter(a => a.kind !== 'ROBOT')
  const workflowItems: WorkflowItem[] = toolingAssets.map(asset => {
    const cell = asset.cellId ? cellsById.get(asset.cellId) : undefined
    const project = cell ? projectsById.get(cell.projectId) : undefined
    const area = cell ? areasById.get(cell.areaId) : undefined
    const simulationStatus = cell?.simulation

    const simulationStage = buildStageSnapshotFromSimulation(simulationStatus)
    const designStage = buildDesignStageSnapshot(simulationStatus)
    const manufactureStage = buildManufactureStageSnapshot()

    const contextKey = buildSimulationContextKey({
      projectName: project?.name,
      areaName: area?.name,
      lineCode: cell?.lineCode,
      stationCode: cell?.code
    })

    // Check if asset is reuse by checking metadata or sourcing
    const isReuse = asset.sourcing === 'REUSE' || Boolean(asset.metadata?.reuseStatus)

    return {
      id: asset.id,
      kind: 'TOOLING',
      simulationContextKey: contextKey,
      name: asset.name || asset.id,
      itemNumber: asset.stationNumber || asset.name,
      equipmentNumber: asset.toolId || undefined,
      handedness: undefined,
      designStageStatus: designStage,
      simulationStageStatus: simulationStage,
      manufactureStageStatus: manufactureStage,
      externalSupplierName: undefined,
      isReuse,
      hasAssets: true,
      metadata: asset.metadata || {}
    }
  })

  const workflowSnapshot = {
    generatedAt: new Date().toISOString(),
    items: workflowItems
  }

  const workflowBottleneckSnapshot = {
    generatedAt: workflowSnapshot.generatedAt,
    bottlenecks: analyzeWorkflowBottlenecks(workflowItems)
  }

  // Legacy snapshots kept minimal; dashboard uses workflowBottleneckSnapshot
  const toolingSnapshot = createEmptyToolingSnapshot()
  const bottleneckSnapshot = createEmptyBottleneckSnapshot()

  // Map unified assets to SimplifiedAsset for API completeness
  const simplifiedAssets: SimplifiedAsset[] = toolingAssets.map(asset => {
    const cell = asset.cellId ? cellsById.get(asset.cellId) : undefined
    const project = cell ? projectsById.get(cell.projectId) : undefined
    return {
      project: project?.name ?? null,
      line: cell?.lineCode || null,
      station: asset.stationNumber || null,
      robotNumber: null,
      gunId: asset.toolId || null,
      partNumber: asset.name || null,
      model: asset.oemModel || null,
      serialNumber: null,
      detailedKind: asset.kind,
      tags: []
    }
  })

  return {
    assets: simplifiedAssets,
    reuseSummary: {
      total: 0,
      byType: {},
      byStatus: {
        AVAILABLE: 0,
        ALLOCATED: 0,
        IN_USE: 0,
        RESERVED: 0,
        UNKNOWN: 0
      },
      unmatchedReuseCount: 0
    },
    linkingStats: {
      totalAssets: simplifiedAssets.length,
      assetsWithReuseInfo: 0,
      matchedReuseRecords: 0,
      unmatchedReuseRecords: 0
    },
    errors: [],
    toolingSnapshot,
    bottleneckSnapshot,
    workflowSnapshot,
    workflowBottleneckSnapshot
  }
}

function buildSimulationContextKey(input: {
  projectName?: string
  areaName?: string
  lineCode?: string
  stationCode?: string
}): string {
  const project = sanitizeKeyPart(input.projectName, 'PRG')
  const plant = 'PLANT'
  const unit = sanitizeKeyPart(input.areaName, 'UNIT')
  const line = sanitizeKeyPart(input.lineCode, 'LINE')
  const station = sanitizeKeyPart(input.stationCode, 'STATION')
  return [project, plant, unit, line, station].join('|')
}

function sanitizeKeyPart(value: string | undefined, fallback: string): string {
  const trimmed = value?.toString().trim()
  if (trimmed === undefined || trimmed.length === 0) {
    return fallback
  }
  return trimmed.replace(/\s+/g, '_')
}

function buildStageSnapshotFromSimulation(sim?: { percentComplete: number }): StageStatusSnapshot {
  if (sim === undefined || sim === null) {
    return makeStageSnapshot('SIMULATION', 'NOT_STARTED', null)
  }

  const pct = clampPercent(sim.percentComplete)
  if (pct >= 100) {
    return makeStageSnapshot('SIMULATION', 'COMPLETE', 100)
  }
  if (pct <= 0) {
    return makeStageSnapshot('SIMULATION', 'NOT_STARTED', 0)
  }
  return makeStageSnapshot('SIMULATION', 'IN_PROGRESS', pct)
}

function buildDesignStageSnapshot(sim?: { percentComplete: number }): StageStatusSnapshot {
  if (sim === undefined || sim === null) {
    return makeStageSnapshot('DESIGN', 'NOT_STARTED', null)
  }

  const pct = clampPercent(sim.percentComplete)
  if (pct >= 100) {
    return makeStageSnapshot('DESIGN', 'COMPLETE', 100)
  }
  return makeStageSnapshot('DESIGN', 'IN_PROGRESS', pct)
}

function buildManufactureStageSnapshot(): StageStatusSnapshot {
  return makeStageSnapshot('MANUFACTURE', 'NOT_STARTED', null)
}

function makeStageSnapshot(
  stage: StageStatusSnapshot['stage'],
  status: WorkflowStatus,
  percentComplete: number | null
): StageStatusSnapshot {
  return {
    stage,
    status,
    percentComplete
  }
}

function clampPercent(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(num) === false) {
    return 0
  }
  if (num < 0) return 0
  if (num > 100) return 100
  return num
}
