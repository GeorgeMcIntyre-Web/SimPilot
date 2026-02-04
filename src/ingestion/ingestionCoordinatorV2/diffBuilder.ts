// Ingestion Coordinator V2 - Diff Builder
// Functions to build DiffResult from version comparison

import type { UnifiedAsset } from '../../domain/core'
import type { Cell } from '../../domain/core'
import type { DiffResult, ImportSourceType, DiffCreate, DiffUpdate, DiffDelete, DiffRenameOrMove, DiffAmbiguous } from '../../domain/uidTypes'
import type { ApplyResult } from '../applyIngestedData'
import type { FileIngestionResult } from '../ingestionTelemetry'
import { compareVersions, type VersionComparisonResult } from '../versionComparison'

/**
 * Build DiffResult from version comparison data
 */
export function buildDiffResultFromVersionComparison(
  importRunId: string,
  sourceFile: string,
  sourceType: ImportSourceType,
  versionComparison: VersionComparisonResult | undefined
): DiffResult {
  const creates: DiffCreate[] = []
  const updates: DiffUpdate[] = []
  const deletes: DiffDelete[] = []
  const renamesOrMoves: DiffRenameOrMove[] = []
  const ambiguous: DiffAmbiguous[] = []
  const plantKey = 'PLANT_UNKNOWN'

  if (versionComparison) {
    for (const change of versionComparison.cells) {
      const key = resolveCellKey(change.entity)
      if (change.type === 'ADDED') {
        creates.push({
          key,
          plantKey,
          entityType: 'station',
          attributes: change.entity,
          suggestedName: change.entity.name
        })
        continue
      }

      if (change.type === 'MODIFIED') {
        updates.push({
          uid: change.entity.id,
          key,
          plantKey,
          entityType: 'station',
          oldAttributes: change.oldEntity || {},
          newAttributes: change.entity,
          changedFields: (change.conflicts || []).map(c => c.field)
        })
        continue
      }

      if (change.type === 'REMOVED') {
        deletes.push({
          uid: change.entity.id,
          key,
          plantKey,
          entityType: 'station',
          lastSeen: change.entity.lastUpdated || new Date().toISOString()
        })
      }
    }

    const assetChanges = [...versionComparison.robots, ...versionComparison.tools]
    for (const change of assetChanges) {
      const entityType = change.entity.kind === 'ROBOT' ? 'robot' : 'tool'
      const key = change.entity.id

      if (change.type === 'ADDED') {
        creates.push({
          key,
          plantKey,
          entityType,
          attributes: change.entity,
          suggestedName: change.entity.name
        })
        continue
      }

      if (change.type === 'MODIFIED') {
        updates.push({
          uid: change.entity.id,
          key,
          plantKey,
          entityType,
          oldAttributes: change.oldEntity || {},
          newAttributes: change.entity,
          changedFields: (change.conflicts || []).map(c => c.field)
        })
        continue
      }

      if (change.type === 'REMOVED') {
        deletes.push({
          uid: change.entity.id,
          key,
          plantKey,
          entityType,
          lastSeen: (change.entity.metadata?.lastUpdated as string) || new Date().toISOString()
        })
      }
    }
  }

  const totalRows = creates.length + updates.length + deletes.length + renamesOrMoves.length + ambiguous.length

  return {
    importRunId,
    sourceFile,
    sourceType,
    plantKey,
    computedAt: new Date().toISOString(),
    creates,
    updates,
    deletes,
    renamesOrMoves,
    ambiguous,
    summary: {
      totalRows,
      created: creates.length,
      updated: updates.length,
      deleted: deletes.length,
      renamed: renamesOrMoves.length,
      ambiguous: ambiguous.length,
      skipped: 0
    }
  }
}

/**
 * Derive source type from file results
 */
export function deriveSourceType(fileResults: FileIngestionResult[]): ImportSourceType {
  const first = fileResults[0]
  if (!first || !first.scanSummary) return 'toolList'
  const category = first.scanSummary.category
  if (category === 'SIMULATION_STATUS') return 'simulationStatus'
  if (category === 'ROBOT_SPECS') return 'robotList'
  return 'toolList'
}

/**
 * Resolve cell key from cell entity
 */
function resolveCellKey(cell: Cell): string {
  return cell.stationId || cell.code || cell.id
}

/**
 * Build version comparison from apply result
 */
export function buildVersionComparison(
  applyResult: ApplyResult
): VersionComparisonResult {
  const newAssets: UnifiedAsset[] = [
    ...applyResult.robots.map(r => ({
      id: r.id,
      name: r.name,
      kind: 'ROBOT' as const,
      sourcing: r.sourcing,
      metadata: {
        ...(r.metadata || {}),
        function: r.metadata?.application,
        application: r.metadata?.application,
        applicationCode: r.metadata?.applicationCode,
        robotType: r.metadata?.robotType || r.metadata?.['Robot Type'],
        installStatus:
          r.metadata?.installStatus ||
          r.metadata?.['Install status'] ||
          r.metadata?.['Install Status'],
        applicationConcern:
          r.metadata?.applicationConcern ||
          r.metadata?.['Robot application concern'],
        comment:
          r.metadata?.comment ||
          r.metadata?.esowComment ||
          r.metadata?.['ESOW Comment'],
        areaGroup:
          r.areaName ||
          r.metadata?.areaGroup ||
          r.metadata?.areaFull ||
          r.metadata?.['Area']
      },
      areaId: r.areaId,
      areaName: r.areaName,
      cellId: r.cellId,
      stationNumber: r.stationNumber,
      oemModel: r.oemModel,
      description: r.description,
      sourceFile: r.sourceFile,
      sheetName: r.sheetName,
      rowIndex: r.rowIndex
    })),
    ...applyResult.tools.map(t => ({
      id: t.id,
      name: t.name,
      kind: t.kind,
      sourcing: t.sourcing,
      metadata: t.metadata || {},
      areaId: t.areaId,
      areaName: t.areaName,
      cellId: t.cellId,
      stationNumber: t.stationNumber,
      oemModel: t.oemModel,
      description: t.description,
      sourceFile: t.sourceFile,
      sheetName: t.sheetName,
      rowIndex: t.rowIndex
    }))
  ]

  return compareVersions(
    applyResult.projects,
    applyResult.areas,
    applyResult.cells,
    newAssets
  )
}
