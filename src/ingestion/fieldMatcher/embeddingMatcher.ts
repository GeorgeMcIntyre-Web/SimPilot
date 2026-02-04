// Field Matcher - Embedding Matcher
// Embedding-based matching functions

import {
  EmbeddingProvider,
  EmbeddingCache,
  InMemoryEmbeddingCache,
  cosineSimilarity,
  normalizeSimilarity,
  buildColumnDescription
} from '../embeddingTypes'
import type { FieldDescriptor, FieldId, ColumnProfile, FieldMatchResult } from './types'
import { matchFieldByPattern, scoreToConfidence } from './patternMatcher'

// Cache for field embeddings
const fieldEmbeddingCache: EmbeddingCache = new InMemoryEmbeddingCache(500)

/**
 * Match a column to a field using both pattern and embedding-based matching.
 * Blends the scores for more robust matching.
 */
export async function matchFieldWithEmbeddings(
  column: ColumnProfile,
  registry: FieldDescriptor[],
  embeddings: EmbeddingProvider
): Promise<FieldMatchResult> {
  // First get pattern-based result
  const patternResult = matchFieldByPattern(column, registry)

  // Build column description for embedding
  const columnDescription = buildColumnDescription({
    header: column.header,
    types: column.detectedTypes,
    samples: column.sampleValues,
    sheetCategory: column.sheetCategory
  })

  // Get column embedding
  const columnEmbedding = await embeddings.embedText(columnDescription)

  // Find best embedding match
  let bestEmbeddingMatch: FieldDescriptor | null = null
  let bestEmbeddingScore = 0
  const embeddingScores: Map<FieldId, number> = new Map()

  for (const field of registry) {
    // Get or compute field embedding
    let fieldEmbedding = fieldEmbeddingCache.get(field.semanticDescription)

    if (fieldEmbedding === undefined) {
      fieldEmbedding = await embeddings.embedText(field.semanticDescription)
      fieldEmbeddingCache.set(field.semanticDescription, fieldEmbedding)
    }

    // Calculate similarity
    const similarity = cosineSimilarity(columnEmbedding, fieldEmbedding)
    const normalizedScore = normalizeSimilarity(similarity)

    embeddingScores.set(field.id, normalizedScore)

    if (normalizedScore > bestEmbeddingScore) {
      bestEmbeddingScore = normalizedScore
      bestEmbeddingMatch = field
    }
  }

  // Blend scores: 60% pattern, 40% embedding
  const patternWeight = 0.6
  const embeddingWeight = 0.4

  // Calculate blended score for the matched field
  const matchedField = patternResult.matchedField ?? bestEmbeddingMatch
  let blendedScore = patternResult.patternScore * patternWeight

  if (matchedField !== null) {
    const embScore = embeddingScores.get(matchedField.id) ?? 0
    blendedScore += embScore * embeddingWeight
  }

  // If embedding match is significantly better, prefer it
  if (bestEmbeddingMatch !== null && bestEmbeddingScore > 0.8) {
    const patternMatchScore = patternResult.matchedField
      ? embeddingScores.get(patternResult.matchedField.id) ?? 0
      : 0

    if (bestEmbeddingScore - patternMatchScore > 0.2) {
      // Embedding found a better match
      blendedScore = patternResult.patternScore * patternWeight + bestEmbeddingScore * embeddingWeight

      return {
        columnIndex: column.columnIndex,
        header: column.header,
        matchedField: bestEmbeddingMatch,
        confidence: blendedScore,
        confidenceLevel: scoreToConfidence(blendedScore),
        patternScore: patternResult.patternScore,
        embeddingScore: bestEmbeddingScore,
        usedEmbedding: true,
        explanation: `Embedding match: ${bestEmbeddingMatch.name} (similarity: ${(bestEmbeddingScore * 100).toFixed(1)}%)`,
        alternatives: patternResult.alternatives
      }
    }
  }

  return {
    ...patternResult,
    confidence: blendedScore,
    confidenceLevel: scoreToConfidence(blendedScore),
    embeddingScore: matchedField ? embeddingScores.get(matchedField.id) : undefined,
    usedEmbedding: true,
    explanation: patternResult.explanation + (matchedField
      ? ` + Embedding: ${((embeddingScores.get(matchedField.id) ?? 0) * 100).toFixed(1)}%`
      : '')
  }
}
