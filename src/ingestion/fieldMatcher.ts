// Field Matcher
// Re-exports from modular structure for backwards compatibility
//
// This file has been refactored into smaller modules:
// - fieldMatcher/types.ts - Type definitions
// - fieldMatcher/fieldRegistry.ts - Default field descriptors
// - fieldMatcher/patternMatcher.ts - Pattern-based matching
// - fieldMatcher/embeddingMatcher.ts - Embedding-based matching
// - fieldMatcher/columnProfiles.ts - Column profile building
// - fieldMatcher/matchColumns.ts - Main matching function
// - fieldMatcher/utils.ts - Utility functions

export * from './fieldMatcher/index'
