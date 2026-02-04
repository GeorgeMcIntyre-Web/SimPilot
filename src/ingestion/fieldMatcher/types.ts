// Field Matcher - Types
// Type definitions for field matching

import type { ColumnRole, MatchConfidence } from '../columnRoleDetector'

/**
 * Unique identifier for a field in the registry
 */
export type FieldId = string

/**
 * Field descriptor with semantic information for matching
 */
export interface FieldDescriptor {
  id: FieldId
  name: string
  role: ColumnRole

  /**
   * A short description of the field's semantic meaning.
   * Used for embedding-based matching.
   */
  semanticDescription: string

  /**
   * Alternative names/headers that map to this field
   */
  aliases: string[]

  /**
   * Expected data type
   */
  expectedType: 'string' | 'number' | 'date' | 'boolean' | 'any'

  /**
   * Is this field required for valid records
   */
  required: boolean

  /**
   * Priority when multiple columns could match (higher = preferred)
   */
  priority: number
}

/**
 * Column profile with statistical information
 */
export interface ColumnProfile {
  columnIndex: number
  header: string
  normalizedHeader: string

  /**
   * Detected types in the column data
   */
  detectedTypes: string[]

  /**
   * Sample values from the column
   */
  sampleValues: string[]

  /**
   * Ratio of empty/null values
   */
  emptyRatio: number

  /**
   * Ratio of unique values
   */
  uniqueRatio: number

  /**
   * Sheet category context
   */
  sheetCategory?: string
}

/**
 * Result of matching a column to a field
 */
export interface FieldMatchResult {
  columnIndex: number
  header: string

  /**
   * Best matched field, or null if no match
   */
  matchedField: FieldDescriptor | null

  /**
   * Overall confidence score (0-1)
   */
  confidence: number

  /**
   * Confidence level
   */
  confidenceLevel: MatchConfidence

  /**
   * Score from pattern-based matching (0-1)
   */
  patternScore: number

  /**
   * Score from embedding-based matching (0-1), if available
   */
  embeddingScore?: number

  /**
   * Whether embedding was used in this match
   */
  usedEmbedding: boolean

  /**
   * Explanation of the match
   */
  explanation: string

  /**
   * Alternative matches considered
   */
  alternatives: Array<{
    field: FieldDescriptor
    confidence: number
  }>
}
