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

import { Cell, Tool, Robot } from '../domain/core'

type Asset = Robot | Tool

export interface LinkingResult {
    linkedCells: Cell[]
    linkCount: number
    totalCells: number
    stationCount: number
}

// ============================================================================
// LEGACY NORMALIZATION (kept for backward compatibility)
// ============================================================================
// NOTE: New code should use normalizers.ts for canonical ID building

/**
 * @deprecated Use normalizers.ts normalizeStationCode instead
 */
export function normalizeStationCode(code: string | undefined | null): string {
    if (!code) return ''

    let normalized = code
        .toLowerCase()
        .replace(/^(op|station|st)[-_\s]*/i, '')
        .trim()

    normalized = normalized.replace(/(\d+)/g, (match) => {
        const num = parseInt(match, 10)
        return num.toString()
    })

    return normalized
}

/**
 * @deprecated Use normalizers.ts normalizeAreaName instead
 */
export function normalizeAreaName(name: string | undefined | null): string {
    if (!name) return ''

    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
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

/**
 * Pick best asset for cell using disambiguation rules
 * Simplified since stationId already handles area+station normalization
 */
function pickBestAssetForCell(ctx: MatchContext): Asset | null {
    // Guard: no candidates
    if (ctx.candidates.length === 0) {
        return null
    }

    // Simple case: exactly one asset at station
    if (ctx.candidates.length === 1) {
        return ctx.candidates[0]
    }

    // Multiple candidates: prefer robots over tools (common case for simulation cells)
    const robots = ctx.candidates.filter(asset =>
        (asset as Robot).kind === 'ROBOT'
    )

    if (robots.length === 1) {
        return robots[0]
    }

    if (robots.length > 1) {
        return robots[0]  // Low confidence, return first
    }

    // No robots: return first tool (low confidence)
    return ctx.candidates[0]
}

/**
 * Find matching asset for a single cell using canonical stationId
 */
function findMatchingAsset(
    cell: Cell,
    _areas: Map<string, string>,  // No longer needed with stationId
    index: StationIndex
): Asset | null {
    // Guard: no stationId on cell
    if (!cell.stationId) {
        return null
    }

    const candidates = index.assetsByStationId.get(cell.stationId)

    // Guard: no assets at this stationId
    if (!candidates || candidates.length === 0) {
        return null
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

    // Link each cell to matching asset
    let linkCount = 0
    const linkedCells = cells.map(cell => {
        const matchingAsset = findMatchingAsset(cell, areas, index)

        if (!matchingAsset) {
            return cell
        }

        linkCount++
        return mergeAssetIntoCell(cell, matchingAsset)
    })

    return {
        linkedCells,
        linkCount,
        totalCells: cells.length,
        stationCount: index.stationCount
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
