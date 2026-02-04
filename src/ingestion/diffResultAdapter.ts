/**
 * Diff Result Adapter
 * Converts version comparison results to DiffResult format
 */

import { Cell } from '../domain/core'
import {
    DiffResult,
    DiffCreate,
    DiffUpdate,
    DiffDelete,
    DiffRenameOrMove,
    DiffAmbiguous,
    ImportSourceType
} from '../domain/uidTypes'
import { VersionComparisonResult } from './versionComparison'

/**
 * Build a DiffResult from a VersionComparisonResult.
 *
 * This adapter converts the version comparison format to the DiffResult format
 * used for tracking import changes.
 */
export function buildDiffResultFromVersionComparison(
    importRunId: string,
    sourceFile: string,
    sourceType: ImportSourceType,
    versionComparison: VersionComparisonResult | undefined,
    plantKey: string = 'PLANT_UNKNOWN'
): DiffResult {
    const creates: DiffCreate[] = []
    const updates: DiffUpdate[] = []
    const deletes: DiffDelete[] = []
    const renamesOrMoves: DiffRenameOrMove[] = []
    const ambiguous: DiffAmbiguous[] = []

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
                    lastSeen: (change.entity as any).lastUpdated || change.entity.metadata?.lastUpdated || new Date().toISOString()
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
 * Resolve a unique key for a cell, preferring stationId, then code, then id.
 */
export function resolveCellKey(cell: Cell): string {
    return cell.stationId || cell.code || cell.id
}
