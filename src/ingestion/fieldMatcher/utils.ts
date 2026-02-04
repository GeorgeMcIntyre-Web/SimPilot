// Field Matcher - Utilities
// Helper functions for field matching

import { getRoleDisplayName, type ColumnRole } from '../columnRoleDetector'
import type { FieldId, FieldMatchResult } from './types'
import { DEFAULT_FIELD_REGISTRY } from './fieldRegistry'

/**
 * Get the display name for a field
 */
export function getFieldDisplayName(fieldId: FieldId): string {
  const field = DEFAULT_FIELD_REGISTRY.find(f => f.id === fieldId)
  return field?.name ?? getRoleDisplayName(fieldId as ColumnRole)
}

/**
 * Check if a match result indicates low confidence
 */
export function isLowConfidenceMatch(result: FieldMatchResult, threshold: number = 0.5): boolean {
  return result.confidence < threshold
}

/**
 * Count low confidence matches in a result set
 */
export function countLowConfidenceMatches(
  results: FieldMatchResult[],
  threshold: number = 0.5
): number {
  return results.filter(r => isLowConfidenceMatch(r, threshold)).length
}
