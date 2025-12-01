/**
 * SimBridge Domain Adapter
 * Best-effort heuristics to map study paths to SimPilot domain entities.
 */

/**
 * Infer Project ID from a study path
 * Heuristic: Looks for known project codes in the path.
 */
export function inferProjectFromStudyPath(path: string): string | undefined {
    const normalized = path.toUpperCase().replace(/\\/g, '/')

    if (normalized.includes('STLA-S') || normalized.includes('STLA_S')) {
        if (normalized.includes('REAR') || normalized.includes('Rear')) return 'p-stla-1'
        if (normalized.includes('UNDERBODY') || normalized.includes('UB')) return 'p-stla-2'
        return 'p-stla-1' // Default to main project if ambiguous
    }

    if (normalized.includes('TINY')) return 'p-tiny-1'

    return undefined
}

/**
 * Infer Cell ID from a study path
 * Heuristic: Looks for cell codes (e.g. OP10, OP20) in the filename.
 */
export function inferCellFromStudyPath(path: string): string | undefined {
    const normalized = path.toUpperCase().replace(/\\/g, '/')
    const filename = normalized.split('/').pop() || ''

    // Match OPxx or OPxxx pattern
    const opMatch = filename.match(/OP(\d+)/)
    if (opMatch) {
        // Try to construct a likely ID based on known demo data patterns
        // In a real app, we might search the store, but here we just infer the code
        // The caller might need to match this code against actual cells
        return undefined // We can't reliably guess the UUID, only the code. 
        // For now, let's return undefined unless we want to couple to the store.
        // The prompt says "No writes into coreStore yet – just keep the mapping inside currentStudy."
        // But we can try to return a "likely" ID if we know the scheme.
    }

    // For the specific demo data we know:
    if (filename.includes('OP10')) return 'c-stla-1-1'
    if (filename.includes('OP20')) return 'c-stla-1-2'
    if (filename.includes('OP30')) return 'c-stla-1-3'
    if (filename.includes('OP40')) return 'c-stla-1-4'
    if (filename.includes('OP50')) return 'c-stla-1-5'

    return undefined
}
