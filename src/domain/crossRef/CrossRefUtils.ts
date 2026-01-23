// Cross-Reference Utilities
// Normalization helpers for cross-referencing station, robot, and gun keys

import { StationKey, RobotKey, GunKey, AreaKey } from './CrossRefTypes'

// ============================================================================
// BASIC NORMALIZATION
// ============================================================================

/**
 * Basic string normalization: trim and uppercase
 */
const normalizeBasic = (value: unknown): string => {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (trimmed.length === 0) return ''

  return trimmed.toUpperCase()
}

// ============================================================================
// KEY NORMALIZATION
// ============================================================================

/**
 * Normalize station ID for consistent matching
 * 
 * Examples:
 * - "STATION 010" → "010"
 * - "St. 020" → "020"
 * - "OP-30" → "OP_30"
 * - "  040  " → "040"
 */
export const normalizeStationId = (value: unknown): StationKey => {
  const base = normalizeBasic(value)
  if (!base) return ''

  // Remove common prefixes
  let processed = base.replace(/^STATION\s+/i, '')
  processed = processed.replace(/^ST\.\s*/i, '')
  processed = processed.replace(/^OP[\-\s]*/i, '')

  // Strip leading zeros from numeric parts (e.g., "010" -> "10")
  // This ensures consistency between different source files
  processed = processed.replace(/(\d+)/g, (match) => {
    const num = parseInt(match, 10)
    return num.toString()
  })

  // Normalize separators to underscores
  return processed.replace(/[\s\-]+/g, '_')
}

/**
 * Normalize robot key for consistent matching
 * 
 * Examples:
 * - "E-12345" → "12345"
 * - "R-001" → "R_001"
 */
export const normalizeRobotKey = (value: unknown): RobotKey => {
  const base = normalizeBasic(value)
  if (!base) return ''

  // Remove E-number prefix (common in robot specs)
  let processed = base.replace(/^E[\-\s]?/i, '')

  // Normalize separators
  return processed.replace(/[\s]+/g, '_')
}

/**
 * Normalize gun key for consistent matching
 * 
 * Examples:
 * - "G-100" → "G_100"
 * - "WG 200" → "WG_200"
 */
export const normalizeGunKey = (value: unknown): GunKey => {
  const base = normalizeBasic(value)
  if (!base) return ''

  // Normalize separators
  return base.replace(/[\s\-]+/g, '_')
}

/**
 * Normalize area key for consistent matching
 * 
 * Examples:
 * - "Underbody" → "UNDERBODY"
 * - " P1Mx " → "P1MX"
 */
export const normalizeAreaKey = (value: unknown): AreaKey => {
  const base = normalizeBasic(value)
  if (!base) return ''

  return base
}

// ============================================================================
// MATCHING UTILITIES
// ============================================================================

/**
 * Check if two station keys match (case-insensitive, normalized)
 */
export const stationsMatch = (a: unknown, b: unknown): boolean => {
  const normA = normalizeStationId(a)
  const normB = normalizeStationId(b)

  if (!normA || !normB) return false

  return normA === normB
}

/**
 * Check if two gun keys match (case-insensitive, normalized)
 */
export const gunsMatch = (a: unknown, b: unknown): boolean => {
  const normA = normalizeGunKey(a)
  const normB = normalizeGunKey(b)

  if (!normA || !normB) return false

  return normA === normB
}

/**
 * Check if two robot keys match (case-insensitive, normalized)
 */
export const robotsMatch = (a: unknown, b: unknown): boolean => {
  const normA = normalizeRobotKey(a)
  const normB = normalizeRobotKey(b)

  if (!normA || !normB) return false

  return normA === normB
}
