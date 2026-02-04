import { ROLE_PATTERNS } from './patterns'
import { normalizeHeader } from './normalizer'
import type { ColumnRoleDetection, MatchConfidence } from './types'

/**
 * Detect the role of a single column header
 */
export function detectColumnRole(header: string): ColumnRoleDetection {
  const normalizedHeader = normalizeHeader(header)
  const headerText = String(header ?? '').trim()

  // Empty headers are always unknown
  if (normalizedHeader === '') {
    return {
      columnIndex: -1,
      headerText,
      normalizedHeader,
      role: 'UNKNOWN',
      confidence: 'LOW',
      matchedPattern: '',
      explanation: 'Empty header'
    }
  }

  // Check each pattern set
  for (const patternSet of ROLE_PATTERNS) {
    for (const pattern of patternSet.patterns) {
      // Exact match
      if (normalizedHeader === pattern) {
        return {
          columnIndex: -1,
          headerText,
          normalizedHeader,
          role: patternSet.role,
          confidence: patternSet.confidence,
          matchedPattern: pattern,
          explanation: `Exact match: "${pattern}"`
        }
      }

      // Contains match (less confident)
      if (normalizedHeader.includes(pattern)) {
        const adjustedConfidence: MatchConfidence =
          patternSet.confidence === 'HIGH' ? 'MEDIUM' : 'LOW'

        return {
          columnIndex: -1,
          headerText,
          normalizedHeader,
          role: patternSet.role,
          confidence: adjustedConfidence,
          matchedPattern: pattern,
          explanation: `Contains: "${pattern}"`
        }
      }
    }
  }

  // No match found
  return {
    columnIndex: -1,
    headerText,
    normalizedHeader,
    role: 'UNKNOWN',
    confidence: 'LOW',
    matchedPattern: '',
    explanation: 'No matching pattern found'
  }
}
