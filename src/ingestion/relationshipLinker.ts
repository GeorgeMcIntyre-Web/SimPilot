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

/**
 * Disambiguation strategy for selecting an asset when multiple candidates exist.
 * Returns the selected asset and whether the selection is ambiguous.
 */
export type DisambiguationStrategy = (candidates: Asset[]) => {
    selected: Asset
    isAmbiguous: boolean
}

/**
 * Default disambiguation strategy: prefer robots over tools.
 * If multiple robots exist, selects the first one and marks as ambiguous.
 */
export const defaultDisambiguationStrategy: DisambiguationStrategy = (candidates) => {
    const robots = candidates.filter(asset => (asset as Robot).kind === 'ROBOT')

    if (robots.length === 1) {
        return { selected: robots[0], isAmbiguous: false }
    }

    if (robots.length > 1) {
        return { selected: robots[0], isAmbiguous: true }
    }

    // No robots: return first tool (ambiguous if multiple tools)
    return {
        selected: candidates[0],
        isAmbiguous: candidates.length > 1
    }
}

/**
 * Logger interface for dependency injection.
 * Allows custom logging implementations for testing and flexibility.
 */
export interface Logger {
    debug: (message: string) => void
    warn: (message: string) => void
}

/**
 * ID generator function type for creating unique warning IDs.
 * Injectable for deterministic testing.
 */
export type IdGenerator = () => string

/**
 * Default ID generator using timestamp.
 */
export const defaultIdGenerator: IdGenerator = () => Date.now().toString()

export interface LinkingOptions {
    maxAmbiguousWarnings?: number
    disambiguationStrategy?: DisambiguationStrategy
    logger?: Logger
    idGenerator?: IdGenerator
}


// ============================================================================
// WARNING COLLECTOR (Single Responsibility)
// ============================================================================

interface AmbiguousMatchInfo {
    cellId: string
    stationId: string
    candidateCount: number
    selectedAssetName: string
    sourceFile: string
}

class WarningCollector {
    private warnings: IngestionWarning[] = []
    private ambiguousCount = 0
    private readonly maxWarnings: number
    private readonly logger: Logger
    private readonly idGenerator: IdGenerator

    constructor(maxWarnings = 10, logger: Logger = log, idGenerator: IdGenerator = defaultIdGenerator) {
        this.maxWarnings = maxWarnings
        this.logger = logger
        this.idGenerator = idGenerator
    }

    addAmbiguousMatch(info: AmbiguousMatchInfo): void {
        this.ambiguousCount++

        if (this.warnings.length < this.maxWarnings) {
            this.warnings.push({
                id: `ambiguous-link-${info.cellId}-${this.idGenerator()}`,
                kind: 'LINKING_AMBIGUOUS',
                fileName: info.sourceFile,
                message: `Station ${info.stationId} has ${info.candidateCount} candidate assets - using "${info.selectedAssetName}"`,
                details: {
                    cellId: info.cellId,
                    stationId: info.stationId,
                    candidateCount: info.candidateCount,
                    selectedAsset: info.selectedAssetName
                },
                createdAt: new Date().toISOString()
            })
        }
    }

    finalize(): { warnings: IngestionWarning[]; ambiguousCount: number } {
        if (this.ambiguousCount > this.maxWarnings) {
            this.warnings.push({
                id: `ambiguous-summary-${this.idGenerator()}`,
                kind: 'LINKING_AMBIGUOUS',
                fileName: '',
                message: `... and ${this.ambiguousCount - this.maxWarnings} more stations have ambiguous asset matches`,
                createdAt: new Date().toISOString()
            })
        }

        if (this.ambiguousCount > 0) {
            this.logger.warn(`[Relational Linker] ${this.ambiguousCount} stations have ambiguous asset matches (multiple assets at same station)`)
        }

        return {
            warnings: this.warnings,
            ambiguousCount: this.ambiguousCount
        }
    }
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
 * Pick best asset for cell using disambiguation strategy
 * Simplified since stationId already handles area+station normalization
 */
function pickBestAssetForCell(
    ctx: MatchContext,
    disambiguate: DisambiguationStrategy
): PickResult {
    // Guard: no candidates
    if (ctx.candidates.length === 0) {
        return { asset: null, isAmbiguous: false, candidateCount: 0 }
    }

    // Simple case: exactly one asset at station
    if (ctx.candidates.length === 1) {
        return { asset: ctx.candidates[0], isAmbiguous: false, candidateCount: 1 }
    }

    // Multiple candidates: use disambiguation strategy
    const { selected, isAmbiguous } = disambiguate(ctx.candidates)

    return {
        asset: selected,
        isAmbiguous,
        candidateCount: ctx.candidates.length
    }
}

/**
 * Find matching asset for a single cell using canonical stationId
 */
function findMatchingAsset(
    cell: Cell,
    index: StationIndex,
    disambiguate: DisambiguationStrategy
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

    return pickBestAssetForCell(ctx, disambiguate)
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

const DEFAULT_LINKING_OPTIONS: Required<LinkingOptions> = {
    maxAmbiguousWarnings: 10,
    disambiguationStrategy: defaultDisambiguationStrategy,
    logger: log,
    idGenerator: defaultIdGenerator
}

/**
 * Link assets to simulation cells using station-first matching
 *
 * @param cells - Simulation cells from SimulationStatus files
 * @param assets - Tools and robots from asset files
 * @param options - Optional configuration for linking behavior
 * @returns Enriched cells with merged asset data and statistics
 */
export function linkAssetsToSimulation(
    cells: Cell[],
    assets: Asset[],
    options: LinkingOptions = {}
): LinkingResult {
    const opts = { ...DEFAULT_LINKING_OPTIONS, ...options }

    // Build station index
    const index = buildStationIndex(assets)
    const warningCollector = new WarningCollector(opts.maxAmbiguousWarnings, opts.logger, opts.idGenerator)

    // Link each cell to matching asset
    let linkCount = 0

    const linkedCells = cells.map(cell => {
        const result = findMatchingAsset(cell, index, opts.disambiguationStrategy)

        if (!result.asset) {
            return cell
        }

        // Track ambiguous matches
        if (result.isAmbiguous) {
            warningCollector.addAmbiguousMatch({
                cellId: cell.id,
                stationId: cell.stationId ?? cell.code,
                candidateCount: result.candidateCount,
                selectedAssetName: result.asset.name,
                sourceFile: result.asset.sourceFile
            })

            opts.logger.debug(`[Relational Linker] Ambiguous match at ${cell.stationId}: ${result.candidateCount} candidates, selected ${result.asset.name}`)
        }

        linkCount++
        return mergeAssetIntoCell(cell, result.asset)
    })

    const { warnings, ambiguousCount } = warningCollector.finalize()

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
