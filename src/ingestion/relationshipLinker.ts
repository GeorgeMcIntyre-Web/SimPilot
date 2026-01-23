/**
 * Relationship Linker - Links assets (robots, tools) to simulation cells
 *
 * LINKING STRATEGY (V2 - Canonical IDs):
 * ----------------------------------------
 * Uses canonical stationId for deterministic, schema-agnostic matching.
 *
 * PRIMARY KEY: stationId (normalized "AREA|STATION")
 *   - Cells have stationId set during ingestion
 *   - Assets have stationId set during ingestion
 *   - Matching is O(1) via stationId index
 *
 * MATCHING RULES:
 *   1. If no stationId on cell → no link
 *   2. If no assets at stationId → no link
 *   3. If exactly one asset at stationId → auto-match
 *   4. If multiple assets at stationId → disambiguate by assetKind (prefer robots for cells)
 *   5. If still ambiguous → link to first, mark low confidence
 *
 * BENEFITS:
 *   - Works regardless of Excel column names
 *   - Robust to schema variations across OEMs
 *   - No dependency on raw areaName/stationCode parsing in linker
 */

import { Cell, Tool, Robot, IngestionWarning } from '../domain/core'
import { log } from '../lib/log'

type Asset = Robot | Tool

export interface LinkingResult {
    linkedCells: Cell[]
    linkCount: number
    totalCells: number
    stationCount: number
    ambiguousCount: number
    warnings: IngestionWarning[]
}


// ============================================================================
// INDEXING (V2 - Canonical StationId)
// ============================================================================

interface StationIndex {
    assetsByStationId: Map<string, Asset[]>
    stationCount: number
}

/**
 * Build station index for O(1) lookup using canonical stationId
 * Groups assets by stationId field (pre-normalized during ingestion)
 */
export function buildStationIndex(assets: Asset[]): StationIndex {
    const assetsByStationId = new Map<string, Asset[]>()

    for (const asset of assets) {
        // Guard: no stationId
        if (!asset.stationId) continue

        const existing = assetsByStationId.get(asset.stationId) || []
        existing.push(asset)
        assetsByStationId.set(asset.stationId, existing)
    }

    return {
        assetsByStationId,
        stationCount: assetsByStationId.size
    }
}

// ============================================================================
// MATCHING (V2 - StationId-based)
// ============================================================================

interface MatchContext {
    cell: Cell
    candidates: Asset[]
}

interface PickResult {
    asset: Asset | null
    isAmbiguous: boolean
    candidateCount: number
}

/**
 * Pick best asset for cell using disambiguation rules
 * Simplified since stationId already handles area+station normalization
 */
function pickBestAssetForCell(ctx: MatchContext): PickResult {
    // Guard: no candidates
    if (ctx.candidates.length === 0) {
        return { asset: null, isAmbiguous: false, candidateCount: 0 }
    }

    // Simple case: exactly one asset at station
    if (ctx.candidates.length === 1) {
        return { asset: ctx.candidates[0], isAmbiguous: false, candidateCount: 1 }
    }

    // Multiple candidates: prefer robots over tools (common case for simulation cells)
    const robots = ctx.candidates.filter(asset =>
        (asset as Robot).kind === 'ROBOT'
    )

    if (robots.length === 1) {
        return { asset: robots[0], isAmbiguous: false, candidateCount: ctx.candidates.length }
    }

    if (robots.length > 1) {
        // Multiple robots at same station - ambiguous
        return { asset: robots[0], isAmbiguous: true, candidateCount: ctx.candidates.length }
    }

    // No robots: return first tool (ambiguous if multiple tools)
    return {
        asset: ctx.candidates[0],
        isAmbiguous: ctx.candidates.length > 1,
        candidateCount: ctx.candidates.length
    }
}

/**
 * Find matching asset for a single cell using canonical stationId
 */
function findMatchingAsset(
    cell: Cell,
    _areas: Map<string, string>,  // No longer needed with stationId
    index: StationIndex
): PickResult {
    // Guard: no stationId on cell
    if (!cell.stationId) {
        return { asset: null, isAmbiguous: false, candidateCount: 0 }
    }

    const candidates = index.assetsByStationId.get(cell.stationId)

    // Guard: no assets at this stationId
    if (!candidates || candidates.length === 0) {
        return { asset: null, isAmbiguous: false, candidateCount: 0 }
    }

    const ctx: MatchContext = {
        cell,
        candidates
    }

    return pickBestAssetForCell(ctx)
}

/**
 * Merge asset data into cell
 * Enriches cell with sourcing, OEM model, and metadata from asset
 */
function mergeAssetIntoCell(cell: Cell, asset: Asset): Cell {
    return {
        ...cell,
        sourcing: asset.sourcing || cell.sourcing,
        metadata: {
            ...cell.metadata,
            ...asset.metadata,
            'Linked Asset ID': asset.id,
            'Linked Asset Name': asset.name,
            ...(asset.oemModel ? { 'OEM Model': asset.oemModel } : {})
        }
    }
}

// ============================================================================
// MAIN LINKING FUNCTION
// ============================================================================

/**
 * Link assets to simulation cells using station-first matching
 *
 * @param cells - Simulation cells from SimulationStatus files
 * @param assets - Tools and robots from asset files
 * @param areas - Area lookup for resolving cell area names
 * @returns Enriched cells with merged asset data and statistics
 */
export function linkAssetsToSimulation(
    cells: Cell[],
    assets: Asset[],
    areas: Map<string, string>
): LinkingResult {
    // Build station index
    const index = buildStationIndex(assets)
    const warnings: IngestionWarning[] = []

    // Link each cell to matching asset
    let linkCount = 0
    let ambiguousCount = 0
    const maxAmbiguousWarnings = 10
    let ambiguousWarningsLogged = 0

    const linkedCells = cells.map(cell => {
        const result = findMatchingAsset(cell, areas, index)

        if (!result.asset) {
            return cell
        }

        // Track ambiguous matches
        if (result.isAmbiguous) {
            ambiguousCount++

            // Log warning for ambiguous matches (limit to avoid flooding)
            if (ambiguousWarningsLogged < maxAmbiguousWarnings) {
                warnings.push({
                    id: `ambiguous-link-${cell.id}-${Date.now()}`,
                    kind: 'LINKING_AMBIGUOUS',
                    fileName: result.asset.sourceFile,
                    message: `Station ${cell.stationId ?? cell.code} has ${result.candidateCount} candidate assets - using "${result.asset.name}"`,
                    details: {
                        cellId: cell.id,
                        stationId: cell.stationId ?? '',
                        candidateCount: result.candidateCount,
                        selectedAsset: result.asset.name
                    },
                    createdAt: new Date().toISOString()
                })
                ambiguousWarningsLogged++
            }

            log.debug(`[Relational Linker] Ambiguous match at ${cell.stationId}: ${result.candidateCount} candidates, selected ${result.asset.name}`)
        }

        linkCount++
        return mergeAssetIntoCell(cell, result.asset)
    })

    // Summary warning if more ambiguous matches than we logged
    if (ambiguousCount > maxAmbiguousWarnings) {
        warnings.push({
            id: `ambiguous-summary-${Date.now()}`,
            kind: 'LINKING_AMBIGUOUS',
            fileName: '',
            message: `... and ${ambiguousCount - maxAmbiguousWarnings} more stations have ambiguous asset matches`,
            createdAt: new Date().toISOString()
        })
    }

    if (ambiguousCount > 0) {
        log.warn(`[Relational Linker] ${ambiguousCount} stations have ambiguous asset matches (multiple assets at same station)`)
    }

    return {
        linkedCells,
        linkCount,
        totalCells: cells.length,
        stationCount: index.stationCount,
        ambiguousCount,
        warnings
    }
}

/**
 * Get human-readable linking statistics
 */
export function getLinkingStats(result: LinkingResult): string {
    const percentage = result.totalCells > 0
        ? Math.round((result.linkCount / result.totalCells) * 100)
        : 0

    return `Linked ${result.linkCount}/${result.totalCells} cells (${percentage}%) across ${result.stationCount} stations`
}
