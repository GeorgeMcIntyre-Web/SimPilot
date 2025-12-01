/**
 * Relationship Linker - Links assets (robots, tools) to simulation cells
 * 
 * This module implements the "Relational Engine" that connects data across
 * isolated Excel files (Simulation Status, Robot Lists, Tool Lists).
 * 
 * Algorithm:
 * 1. Index assets by normalized station code for O(1) lookup
 * 2. For each simulation cell, find matching assets by station + robot/device name
 * 3. Merge sourcing, OEM model, and metadata from asset into cell
 * 
 * Normalization handles variations like:
 * - Station: "010" vs "10" vs "OP-10"
 * - Robot: "R01" vs "R-01" vs "Robot 01"
 */

import { Cell, Tool, Robot } from '../domain/core'

type Asset = Robot | Tool

/**
 * Normalize station code for fuzzy matching
 * Examples:
 * - "010" → "10"
 * - "OP-20" → "20"
 * - "Station 030" → "30"
 */
export function normalizeStationCode(code: string | undefined): string {
    if (!code) return ''

    // Remove common prefixes and normalize
    return code
        .toLowerCase()
        .replace(/^(op|station|st)[-_\s]*/i, '')  // Remove "OP-", "Station ", etc.
        .replace(/^0+/, '')                        // Remove leading zeros
        .trim()
}

/**
 * Normalize robot/device name for fuzzy matching
 * Examples:
 * - "R01" → "r01"
 * - "R-01" → "r01"
 * - "Robot 01" → "r01"
 */
export function normalizeRobotName(name: string | undefined): string {
    if (!name) return ''

    return name
        .toLowerCase()
        .replace(/^(robot|device)[-_\s]*/i, '')   // Remove "Robot ", "Device ", etc.
        .replace(/[-_\s]/g, '')                    // Remove separators
        .trim()
}

/**
 * Find asset matching the given cell by station and robot/device name
 */
function findMatchingAsset(
    cell: Cell,
    assetsByStation: Map<string, Asset[]>
): Asset | null {
    const normalizedStation = normalizeStationCode(cell.code)
    const assetsAtStation = assetsByStation.get(normalizedStation)

    if (!assetsAtStation || assetsAtStation.length === 0) {
        return null
    }

    // Try to match by robot name or device name
    const normalizedCellRobot = normalizeRobotName(cell.name)

    const match = assetsAtStation.find(asset => {
        const normalizedAssetName = normalizeRobotName(asset.name)

        // Match if robot names align
        if (normalizedAssetName && normalizedAssetName === normalizedCellRobot) {
            return true
        }

        // Also check alternative name fields if they exist
        // (some Excel files use different column names)
        return false
    })

    return match || null
}

/**
 * Merge asset data into simulation cell
 * Copies sourcing, OEM model, and metadata from asset to cell
 */
function mergeAssetIntoCell(cell: Cell, asset: Asset): Cell {
    return {
        ...cell,
        // Copy sourcing status (REUSE, NEW_BUY, etc.)
        sourcing: asset.sourcing || cell.sourcing,

        // Copy OEM model (e.g., "Fanuc R-2000i/210F")
        // TODO: Uncomment when oemModel exists on Cell type
        // oemModel: asset.oemModel || cell.oemModel,

        // Merge metadata (keep existing + add asset metadata)
        metadata: {
            ...cell.metadata,
            ...asset.metadata,

            // Track which asset was linked (for debugging)
            'Asset Link ID': asset.id,
            'Asset Name': asset.name,

            // If asset has OEM model, include it
            ...(asset.oemModel ? { 'OEM Model': asset.oemModel } : {})
        }
    }
}

/**
 * Link assets to simulation cells using station + robot matching
 * 
 * @param cells - Simulation cells (from SimulationStatus Excel files)
 * @param assets - Tools/Robots (from RobotList, ToolList, Zangenpool, etc.)
 * @returns Enriched cells with merged asset data + link statistics
 */
export function linkAssetsToSimulation(
    cells: Cell[],
    assets: Asset[]
): { linkedCells: Cell[], linkCount: number, totalCells: number } {
    // Build index: normalized station → assets at that station
    const assetsByStation = new Map<string, Asset[]>()

    for (const asset of assets) {
        const normalizedStation = normalizeStationCode(asset.stationCode)

        if (!normalizedStation) continue

        const existing = assetsByStation.get(normalizedStation) || []
        existing.push(asset)
        assetsByStation.set(normalizedStation, existing)
    }

    // Link each cell to matching asset(s)
    let linkCount = 0
    const linkedCells = cells.map(cell => {
        const matchingAsset = findMatchingAsset(cell, assetsByStation)

        if (matchingAsset) {
            linkCount++
            return mergeAssetIntoCell(cell, matchingAsset)
        }

        // No match found - return cell unchanged
        return cell
    })

    return {
        linkedCells,
        linkCount,
        totalCells: cells.length
    }
}

/**
 * Get linking statistics for user feedback
 */
export function getLinkingStats(
    linkCount: number,
    totalCells: number
): string {
    const percentage = totalCells > 0
        ? Math.round((linkCount / totalCells) * 100)
        : 0

    return `Linked ${linkCount}/${totalCells} items (${percentage}%)`
}
