// Field Matcher
// Deterministic, testable matching from column profiles to canonical field definitions.
// Uses scoring based on header lexical similarity, type compatibility, and regex patterns.

import { ColumnProfile, tokenizeHeader } from './columnProfiler'
import { SheetProfile } from './sheetProfiler'
import {
  FieldDescriptor,
  FieldId,
  FieldExpectedType,
  getAllFieldDescriptors
} from './fieldRegistry'

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single field match candidate with score and reasoning.
 */
export interface FieldMatch {
  fieldId: FieldId
  score: number
  reasons: string[]
}

/**
 * Complete match result for a column.
 * Contains all candidates and the best match.
 */
export interface FieldMatchResult {
  columnProfile: ColumnProfile
  matches: FieldMatch[]
  bestMatch: FieldMatch | undefined
}

/**
 * Scoring configuration for fine-tuning match behavior.
 */
export interface MatchScoringConfig {
  /** Points for exact canonical name match */
  exactCanonicalMatch: number
  /** Points for exact synonym match */
  exactSynonymMatch: number
  /** Points when header contains canonical name */
  containsCanonicalName: number
  /** Points for each overlapping token with synonyms */
  tokenOverlap: number
  /** Points for header regex match */
  headerRegexMatch: number
  /** Points for type compatibility */
  typeCompatibility: number
  /** Penalty for type incompatibility */
  typeIncompatibilityPenalty: number
  /** Bonus for high importance fields on ambiguous matches */
  highImportanceBonus: number
  /** Minimum score to consider a match valid */
  minimumMatchScore: number
}

/**
 * Default scoring configuration.
 */
export const DEFAULT_SCORING_CONFIG: MatchScoringConfig = {
  exactCanonicalMatch: 50,
  exactSynonymMatch: 40,
  containsCanonicalName: 20,
  tokenOverlap: 5,
  headerRegexMatch: 15,
  typeCompatibility: 10,
  typeIncompatibilityPenalty: -15,
  highImportanceBonus: 5,
  minimumMatchScore: 15
}

// ============================================================================
// SCORING HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize a string for comparison.
 */
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Calculate lexical score based on header matching.
 */
function calculateLexicalScore(
  profile: ColumnProfile,
  descriptor: FieldDescriptor,
  config: MatchScoringConfig
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  const headerNorm = profile.headerNormalized
  const canonicalNorm = normalize(descriptor.canonicalName)

  // Check for exact canonical name match
  if (headerNorm === canonicalNorm) {
    score += config.exactCanonicalMatch
    reasons.push(`Exact canonical match: "${descriptor.canonicalName}"`)
    return { score, reasons }
  }

  // Check for exact synonym match
  for (const synonym of descriptor.synonyms) {
    const synonymNorm = normalize(synonym)

    if (headerNorm === synonymNorm) {
      score += config.exactSynonymMatch
      reasons.push(`Exact synonym match: "${synonym}"`)
      return { score, reasons }
    }
  }

  // Check if header contains canonical name
  if (headerNorm.includes(canonicalNorm)) {
    score += config.containsCanonicalName
    reasons.push(`Header contains canonical name: "${descriptor.canonicalName}"`)
  }

  // Check if header contains any synonyms
  for (const synonym of descriptor.synonyms) {
    const synonymNorm = normalize(synonym)

    if (synonymNorm.length < 3) {
      // Skip very short synonyms to avoid false positives
      continue
    }

    if (headerNorm.includes(synonymNorm)) {
      score += config.containsCanonicalName / 2
      reasons.push(`Header contains synonym: "${synonym}"`)
      break // Only count once
    }
  }

  // Token overlap scoring
  const headerTokens = profile.headerTokens
  const allSynonymTokens = new Set<string>()

  // Add canonical name tokens
  const canonicalTokens = tokenizeHeader(descriptor.canonicalName)
  for (const token of canonicalTokens) {
    allSynonymTokens.add(token)
  }

  // Add synonym tokens
  for (const synonym of descriptor.synonyms) {
    const synonymTokens = tokenizeHeader(synonym)
    for (const token of synonymTokens) {
      allSynonymTokens.add(token)
    }
  }

  // Count overlapping tokens
  let overlapCount = 0
  for (const token of headerTokens) {
    if (token.length < 2) {
      continue // Skip very short tokens
    }

    if (allSynonymTokens.has(token)) {
      overlapCount++
    }
  }

  if (overlapCount > 0) {
    const tokenScore = overlapCount * config.tokenOverlap
    score += tokenScore
    reasons.push(`Token overlap: ${overlapCount} tokens (+${tokenScore})`)
  }

  return { score, reasons }
}

/**
 * Calculate regex score based on pattern matching.
 */
function calculateRegexScore(
  profile: ColumnProfile,
  descriptor: FieldDescriptor,
  config: MatchScoringConfig
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Check header regexes
  if (descriptor.headerRegexes !== undefined && descriptor.headerRegexes.length > 0) {
    for (const regex of descriptor.headerRegexes) {
      if (regex.test(profile.headerRaw)) {
        score += config.headerRegexMatch
        reasons.push(`Header matches regex: ${regex.source}`)
        break // Only count once
      }
    }
  }

  // Check value regexes against sample values
  if (descriptor.valueRegexes !== undefined && descriptor.valueRegexes.length > 0) {
    let valueMatchCount = 0

    for (const sampleValue of profile.sampleValues) {
      for (const regex of descriptor.valueRegexes) {
        if (regex.test(sampleValue)) {
          valueMatchCount++
          break
        }
      }
    }

    if (valueMatchCount > 0) {
      const valueScore = Math.min(valueMatchCount * 3, 10)
      score += valueScore
      reasons.push(`Value regex matches: ${valueMatchCount} samples (+${valueScore})`)
    }
  }

  return { score, reasons }
}

/**
 * Check if column type is compatible with expected field type.
 */
function isTypeCompatible(
  profile: ColumnProfile,
  expectedType: FieldExpectedType
): boolean {
  const { dominantType, dataTypeDistribution } = profile

  switch (expectedType) {
    case 'string':
      return dominantType === 'string' || dominantType === 'mixed'

    case 'number':
      return dominantType === 'number' || dataTypeDistribution.numberRatio > 0.3

    case 'integer':
      return dominantType === 'number' || dataTypeDistribution.integerRatio > 0.3

    case 'date':
      return dominantType === 'date' || dataTypeDistribution.dateRatio > 0.3

    case 'boolean':
      return dominantType === 'boolean' || dataTypeDistribution.booleanRatio > 0.3

    case 'percentage':
      // Percentages can be numbers or strings like "50%"
      return dominantType === 'number' ||
             dominantType === 'string' ||
             dominantType === 'mixed'

    case 'mixed':
      return true
  }
}

/**
 * Check if column type is incompatible with expected field type.
 */
function isTypeIncompatible(
  profile: ColumnProfile,
  expectedType: FieldExpectedType
): boolean {
  const { dominantType, dataTypeDistribution } = profile

  // Don't penalize empty columns or mixed types
  if (dominantType === 'empty' || dominantType === 'mixed') {
    return false
  }

  switch (expectedType) {
    case 'number':
    case 'integer':
      // If expecting number but column is mostly strings, incompatible
      return dominantType === 'string' && dataTypeDistribution.numberRatio < 0.2

    case 'date':
      // If expecting date but column is something else, incompatible
      return dominantType !== 'date' && dataTypeDistribution.dateRatio < 0.1

    case 'boolean':
      // If expecting boolean but column is numbers, incompatible
      return dominantType === 'number'

    case 'string':
    case 'percentage':
    case 'mixed':
      return false
  }
}

/**
 * Calculate type compatibility score.
 */
function calculateTypeScore(
  profile: ColumnProfile,
  descriptor: FieldDescriptor,
  config: MatchScoringConfig
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (isTypeCompatible(profile, descriptor.expectedType)) {
    score += config.typeCompatibility
    reasons.push(`Type compatible: ${profile.dominantType} ≈ ${descriptor.expectedType}`)
  }

  if (isTypeIncompatible(profile, descriptor.expectedType)) {
    score += config.typeIncompatibilityPenalty
    reasons.push(`Type mismatch: ${profile.dominantType} ≠ ${descriptor.expectedType}`)
  }

  return { score, reasons }
}

/**
 * Calculate importance bonus for ambiguous matches.
 */
function calculateImportanceBonus(
  descriptor: FieldDescriptor,
  lexicalScore: number,
  config: MatchScoringConfig
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Only apply bonus for borderline matches (not strong matches)
  if (lexicalScore > 0 && lexicalScore < 30 && descriptor.importance === 'high') {
    score += config.highImportanceBonus
    reasons.push(`High importance field bonus`)
  }

  return { score, reasons }
}

// ============================================================================
// MAIN MATCHING FUNCTIONS
// ============================================================================

/**
 * Match a single column profile to all field descriptors.
 *
 * @param column - The column profile to match
 * @param descriptors - Array of field descriptors to match against
 * @param config - Scoring configuration (optional, uses defaults)
 * @returns Match result with all candidates and best match
 */
export function matchFieldForColumn(
  column: ColumnProfile,
  descriptors: FieldDescriptor[],
  config: MatchScoringConfig = DEFAULT_SCORING_CONFIG
): FieldMatchResult {
  const matches: FieldMatch[] = []

  // Skip columns with empty headers
  if (column.headerRaw.trim() === '') {
    return {
      columnProfile: column,
      matches: [],
      bestMatch: undefined
    }
  }

  // Score each descriptor
  for (const descriptor of descriptors) {
    const reasons: string[] = []
    let totalScore = 0

    // Lexical scoring
    const lexical = calculateLexicalScore(column, descriptor, config)
    totalScore += lexical.score
    reasons.push(...lexical.reasons)

    // Skip early if no lexical match at all
    if (lexical.score === 0) {
      continue
    }

    // Regex scoring
    const regex = calculateRegexScore(column, descriptor, config)
    totalScore += regex.score
    reasons.push(...regex.reasons)

    // Type compatibility scoring
    const type = calculateTypeScore(column, descriptor, config)
    totalScore += type.score
    reasons.push(...type.reasons)

    // Importance bonus
    const importance = calculateImportanceBonus(descriptor, lexical.score, config)
    totalScore += importance.score
    reasons.push(...importance.reasons)

    // Only include matches above minimum threshold
    if (totalScore >= config.minimumMatchScore) {
      matches.push({
        fieldId: descriptor.id,
        score: totalScore,
        reasons
      })
    }
  }

  // Sort matches by score (descending)
  matches.sort((a, b) => b.score - a.score)

  // Determine best match
  const bestMatch = matches.length > 0 ? matches[0] : undefined

  return {
    columnProfile: column,
    matches,
    bestMatch
  }
}

/**
 * Match all columns in a sheet profile to field descriptors.
 *
 * @param sheetProfile - The sheet profile containing columns
 * @param descriptors - Array of field descriptors (defaults to all)
 * @param config - Scoring configuration (optional)
 * @returns Array of match results for all columns
 */
export function matchAllColumns(
  sheetProfile: SheetProfile,
  descriptors?: FieldDescriptor[],
  config?: MatchScoringConfig
): FieldMatchResult[] {
  const registry = descriptors ?? getAllFieldDescriptors()
  const scoringConfig = config ?? DEFAULT_SCORING_CONFIG

  return sheetProfile.columnProfiles.map(column =>
    matchFieldForColumn(column, registry, scoringConfig)
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the best field ID for a column index in a sheet.
 */
export function getBestFieldId(
  results: FieldMatchResult[],
  columnIndex: number
): FieldId | undefined {
  const result = results[columnIndex]

  if (result === undefined || result.bestMatch === undefined) {
    return undefined
  }

  return result.bestMatch.fieldId
}

/**
 * Find columns that match a specific field ID.
 */
export function findColumnsForField(
  results: FieldMatchResult[],
  fieldId: FieldId
): FieldMatchResult[] {
  return results.filter(result =>
    result.bestMatch !== undefined && result.bestMatch.fieldId === fieldId
  )
}

/**
 * Get a map from field IDs to column indices.
 */
export function buildFieldToColumnMap(
  results: FieldMatchResult[]
): Map<FieldId, number[]> {
  const map = new Map<FieldId, number[]>()

  for (const result of results) {
    if (result.bestMatch === undefined) {
      continue
    }

    const fieldId = result.bestMatch.fieldId
    const columnIndex = result.columnProfile.columnIndex

    const existing = map.get(fieldId) ?? []
    existing.push(columnIndex)
    map.set(fieldId, existing)
  }

  return map
}

/**
 * Get columns that have no field match.
 */
export function getUnmatchedColumns(results: FieldMatchResult[]): ColumnProfile[] {
  return results
    .filter(result => result.bestMatch === undefined)
    .map(result => result.columnProfile)
}

/**
 * Get columns where the best match score is low (potentially uncertain).
 */
export function getLowConfidenceMatches(
  results: FieldMatchResult[],
  threshold: number = 25
): FieldMatchResult[] {
  return results.filter(result =>
    result.bestMatch !== undefined && result.bestMatch.score < threshold
  )
}

/**
 * Get a summary of match results.
 */
export function getMatchSummary(results: FieldMatchResult[]): {
  totalColumns: number
  matchedColumns: number
  unmatchedColumns: number
  avgScore: number
  fieldDistribution: Map<FieldId, number>
} {
  let totalScore = 0
  let matchedCount = 0
  const fieldDistribution = new Map<FieldId, number>()

  for (const result of results) {
    if (result.bestMatch === undefined) {
      continue
    }

    matchedCount++
    totalScore += result.bestMatch.score

    const fieldId = result.bestMatch.fieldId
    const count = fieldDistribution.get(fieldId) ?? 0
    fieldDistribution.set(fieldId, count + 1)
  }

  return {
    totalColumns: results.length,
    matchedColumns: matchedCount,
    unmatchedColumns: results.length - matchedCount,
    avgScore: matchedCount > 0 ? totalScore / matchedCount : 0,
    fieldDistribution
  }
}

/**
 * Format match result for debugging.
 */
export function formatMatchResult(result: FieldMatchResult): string {
  const { columnProfile, bestMatch, matches } = result
  const lines: string[] = []

  lines.push(`Column ${columnProfile.columnIndex}: "${columnProfile.headerRaw}"`)

  if (bestMatch === undefined) {
    lines.push('  → No match found')
    return lines.join('\n')
  }

  lines.push(`  → Best: ${bestMatch.fieldId} (score: ${bestMatch.score})`)
  lines.push(`    Reasons: ${bestMatch.reasons.join(', ')}`)

  if (matches.length > 1) {
    lines.push(`    Alternatives: ${matches.slice(1, 4).map(m => `${m.fieldId}(${m.score})`).join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Normalize match score to 0-100 range.
 */
export function normalizeScore(score: number, maxScore: number = 100): number {
  return Math.min(100, Math.max(0, Math.round((score / maxScore) * 100)))
}
