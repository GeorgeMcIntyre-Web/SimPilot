// Field Matcher - Pattern Matcher
// Pattern-based matching functions

import { detectColumnRole, type MatchConfidence } from '../columnRoleDetector'
import type { FieldDescriptor, FieldId, ColumnProfile, FieldMatchResult } from './types'

/**
 * Match a column to a field using pattern-based matching.
 * This is the baseline matching without embeddings.
 */
export function matchFieldByPattern(
  column: ColumnProfile,
  registry: FieldDescriptor[]
): FieldMatchResult {
  // First, use the existing column role detector
  const roleDetection = detectColumnRole(column.header)

  // Find matching field by role
  const matchedByRole = registry.find(f => f.role === roleDetection.role)

  // Calculate pattern score based on confidence
  const patternScore = confidenceToScore(roleDetection.confidence)

  // Find alternatives
  const alternatives = findAlternativeMatches(column, registry, matchedByRole?.id)

  return {
    columnIndex: column.columnIndex,
    header: column.header,
    matchedField: matchedByRole ?? null,
    confidence: patternScore,
    confidenceLevel: roleDetection.confidence,
    patternScore,
    usedEmbedding: false,
    explanation: roleDetection.explanation,
    alternatives
  }
}

/**
 * Convert confidence level to numeric score
 */
export function confidenceToScore(confidence: MatchConfidence): number {
  switch (confidence) {
    case 'HIGH':
      return 0.9
    case 'MEDIUM':
      return 0.6
    case 'LOW':
      return 0.3
    default:
      return 0
  }
}

/**
 * Convert numeric score to confidence level
 */
export function scoreToConfidence(score: number): MatchConfidence {
  if (score >= 0.7) {
    return 'HIGH'
  }

  if (score >= 0.4) {
    return 'MEDIUM'
  }

  return 'LOW'
}

/**
 * Find alternative field matches for a column
 */
function findAlternativeMatches(
  column: ColumnProfile,
  registry: FieldDescriptor[],
  excludeId?: FieldId
): Array<{ field: FieldDescriptor; confidence: number }> {
  const alternatives: Array<{ field: FieldDescriptor; confidence: number }> = []
  const normalizedHeader = column.normalizedHeader.toLowerCase()

  for (const field of registry) {
    if (field.id === excludeId) {
      continue
    }

    // Check aliases for partial matches
    for (const alias of field.aliases) {
      if (normalizedHeader.includes(alias) || alias.includes(normalizedHeader)) {
        const confidence = normalizedHeader === alias ? 0.6 : 0.3
        alternatives.push({ field, confidence })
        break
      }
    }
  }

  // Sort by confidence descending
  alternatives.sort((a, b) => b.confidence - a.confidence)

  // Return top 3
  return alternatives.slice(0, 3)
}
