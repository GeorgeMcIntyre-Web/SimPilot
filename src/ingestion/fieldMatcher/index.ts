// Field Matcher - Barrel Export
// Re-exports all public API from submodules

// Types
export type {
  FieldId,
  FieldDescriptor,
  ColumnProfile,
  FieldMatchResult
} from './types'

// Field registry
export { DEFAULT_FIELD_REGISTRY } from './fieldRegistry'

// Pattern matching
export {
  matchFieldByPattern,
  confidenceToScore,
  scoreToConfidence
} from './patternMatcher'

// Embedding matching
export { matchFieldWithEmbeddings } from './embeddingMatcher'

// Column profiles
export { buildColumnProfiles } from './columnProfiles'

// Main matching function
export { matchColumnsToFields } from './matchColumns'

// Utilities
export {
  getFieldDisplayName,
  isLowConfidenceMatch,
  countLowConfidenceMatches
} from './utils'
