// Flag Messages Utility
// Maps cross-reference flag types to human-readable descriptions

import { CrossRefFlag, CrossRefFlagType } from '../crossRef/CrossRefTypes'

// ============================================================================
// FLAG TYPE TO MESSAGE MAPPING
// ============================================================================

const FLAG_MESSAGE_MAP: Record<CrossRefFlagType, string> = {
  STATION_WITHOUT_SIMULATION_STATUS: 'Station has assets but no Simulation Status row.',
  MISSING_GUN_FORCE_FOR_WELD_GUN: 'Weld gun has no force data; check Zangenpool / gun force list.',
  ROBOT_MISSING_DRESS_PACK_INFO: 'Robot is missing dress pack configuration information.',
  TOOL_WITHOUT_OWNER: 'Tool has no assigned owner or responsible engineer.',
  RISER_NOT_ALLOCATED_TO_NEW_STATION: 'Riser is marked for reuse but not allocated to a new station.',
  AMBIGUOUS_GUN_MATCH: 'Multiple potential gun matches found; manual verification needed.',
  AMBIGUOUS_ROBOT_MATCH: 'Multiple potential robot matches found; manual verification needed.',
  DUPLICATE_STATION_DEFINITION: 'Station appears in multiple data sources with conflicting data.'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build context suffix from flag keys
 */
const buildContextSuffix = (flag: CrossRefFlag): string => {
  const parts: string[] = []

  if (flag.stationKey) {
    parts.push(`Station: ${flag.stationKey}`)
  }
  if (flag.robotKey) {
    parts.push(`Robot: ${flag.robotKey}`)
  }
  if (flag.gunKey) {
    parts.push(`Gun: ${flag.gunKey}`)
  }

  if (parts.length === 0) return ''
  return ` (${parts.join(', ')})`
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Convert a CrossRefFlag to a human-readable description
 *
 * Returns a user-friendly message that explains what the flag means
 * and includes relevant context (station/robot/gun keys).
 */
export const describeFlag = (flag: CrossRefFlag): string => {
  // Use the flag's own message if it's already descriptive
  if (flag.message && flag.message.length > 0) {
    return flag.message
  }

  // Look up the base message for this flag type
  const baseMessage = FLAG_MESSAGE_MAP[flag.type]
  if (!baseMessage) {
    return `Unknown issue: ${flag.type}`
  }

  // Add context if available
  const context = buildContextSuffix(flag)
  return `${baseMessage}${context}`
}

/**
 * Get a short label for a flag type (for badges/headers)
 */
export const getFlagTypeLabel = (type: CrossRefFlagType): string => {
  const labels: Record<CrossRefFlagType, string> = {
    STATION_WITHOUT_SIMULATION_STATUS: 'Missing Sim Status',
    MISSING_GUN_FORCE_FOR_WELD_GUN: 'Missing Gun Force',
    ROBOT_MISSING_DRESS_PACK_INFO: 'Missing Dress Pack',
    TOOL_WITHOUT_OWNER: 'No Owner',
    RISER_NOT_ALLOCATED_TO_NEW_STATION: 'Unallocated Riser',
    AMBIGUOUS_GUN_MATCH: 'Ambiguous Gun',
    AMBIGUOUS_ROBOT_MATCH: 'Ambiguous Robot',
    DUPLICATE_STATION_DEFINITION: 'Duplicate Station'
  }

  return labels[type] || type
}
