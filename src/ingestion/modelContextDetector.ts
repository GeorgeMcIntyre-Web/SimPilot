/**
 * Model Context Detector
 * Infers ModelKey/PlantKey from filename or metadata
 */

/**
 * Infer ModelKey from filename or metadata (best-effort).
 *
 * Strategy:
 * 1. Scan filename for known Model patterns (e.g., "STLA-S", "GLC_X254")
 * 2. Normalize to consistent format (uppercase, underscore-separated)
 * 3. Return undefined if no Model detected
 *
 * Examples:
 * - "STLA-S_ToolList_2026-01.xlsx" → "STLA-S"
 * - "GLC X254 Tool List.xlsx" → "GLC_X254"
 * - "ToolList.xlsx" → undefined
 *
 * Note: This is heuristic-based and may miss some Models.
 * Future: Allow user selection if filename ambiguous.
 */
export function inferModelKeyFromFilename(filename: string): string | undefined {
    // Known Model patterns (extend as needed)
    const modelPatterns = [
        /STLA[-_]S/i,
        /GLC[-_]?X?254/i,
        /RANGER[-_]?P?703/i,
        /STLA[-_]LARGE/i,
        /STLA[-_]MEDIUM/i,
        /STLA[-_]SMALL/i
    ]

    for (const pattern of modelPatterns) {
        const match = filename.match(pattern)
        if (match) {
            // Normalize matched model (uppercase, replace spaces/hyphens with underscores)
            return match[0].toUpperCase().replace(/[-\s]+/g, '_')
        }
    }

    return undefined
}

/**
 * Infer PlantKey from filename or metadata (best-effort).
 *
 * Examples:
 * - "ZAR_ToolList.xlsx" → "ZAR"
 * - "Sterling_Heights_Robot_List.xlsx" → "STERLING_HEIGHTS"
 *
 * Note: Currently returns undefined - plant detection not yet implemented.
 * Future: Add plant pattern matching similar to model detection.
 */
export function inferPlantKeyFromFilename(_filename: string): string | undefined {
    // TODO: Implement plant key detection
    // Known plant patterns could include: ZAR, SHAP, etc.
    return undefined
}
