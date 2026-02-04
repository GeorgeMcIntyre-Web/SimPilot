// Excel Ingestion Types - Reuse Allocation Tracking
// Allocation status and cross-workbook linking for reuse equipment

/**
 * Allocation status for equipment in reuse pool.
 *
 * Business Context:
 * - Reuse lists track equipment AVAILABLE for allocation (equipment pool)
 * - Equipment moves from: AVAILABLE → ALLOCATED → IN_USE
 * - This is the retrofit job workflow for line builders
 */
export type ReuseAllocationStatus =
  | 'AVAILABLE'   // In reuse pool, target columns empty (ready to allocate)
  | 'ALLOCATED'   // Planned for new line, target columns filled (allocation made)
  | 'IN_USE'      // Installed on new line, appears in Simulation Status
  | 'RESERVED'    // Reserved for specific project but not allocated yet
  | 'UNKNOWN'     // Cannot determine status

/**
 * Infer reuse allocation status from target allocation columns and simulation presence.
 *
 * Logic:
 * 1. If asset appears in Simulation Status → IN_USE (installed and operational)
 * 2. If target columns filled → ALLOCATED (planned for new line)
 * 3. If target columns empty → AVAILABLE (in pool, ready for allocation)
 *
 * @param input - Allocation tracking data
 * @returns Allocation status
 */
export function inferReuseAllocation(input: {
  targetProject?: string | null
  targetLine?: string | null
  targetStation?: string | null
  targetSector?: string | null
  isInSimulationStatus?: boolean
}): ReuseAllocationStatus {
  // If already in simulation status, it's installed and operational
  if (input.isInSimulationStatus === true) {
    return 'IN_USE'
  }

  // Check if any target allocation exists
  const hasTargetAllocation = [
    input.targetProject,
    input.targetLine,
    input.targetStation,
    input.targetSector
  ].some(val => {
    if (val === null || val === undefined) {
      return false
    }
    const trimmed = String(val).trim()
    return trimmed.length > 0
  })

  if (hasTargetAllocation) {
    return 'ALLOCATED'
  }

  // No allocation, available in pool
  return 'AVAILABLE'
}

/**
 * Normalize location string for matching (removes whitespace, lowercases).
 */
function normalizeLocation(value?: string | null): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Check if reuse asset target matches simulation status actual location.
 * Used for cross-workbook linking to detect ALLOCATED → IN_USE transitions.
 *
 * @param reuseAsset - Asset from reuse list with target allocation
 * @param simAsset - Asset from simulation status with actual location
 * @returns True if locations match
 */
export function isReuseTargetMatch(
  reuseAsset: {
    targetLine?: string | null
    targetStation?: string | null
  },
  simAsset: {
    assemblyLine?: string | null
    station?: string | null
  }
): boolean {
  const targetLine = normalizeLocation(reuseAsset.targetLine)
  const actualLine = normalizeLocation(simAsset.assemblyLine)

  const targetStation = normalizeLocation(reuseAsset.targetStation)
  const actualStation = normalizeLocation(simAsset.station)

  // Both line and station must match
  if (targetLine.length === 0 || targetStation.length === 0) {
    return false
  }

  return targetLine === actualLine && targetStation === actualStation
}
