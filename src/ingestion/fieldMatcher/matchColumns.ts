// Field Matcher - Match Columns
// Main matching function that orchestrates pattern and embedding matching

import type { EmbeddingProvider } from '../embeddingTypes'
import { getFeatureFlag } from '../../config/featureFlags'
import type { FieldDescriptor, ColumnProfile, FieldMatchResult } from './types'
import { DEFAULT_FIELD_REGISTRY } from './fieldRegistry'
import { matchFieldByPattern } from './patternMatcher'
import { matchFieldWithEmbeddings } from './embeddingMatcher'

/**
 * Match columns to fields, using embeddings if available and enabled.
 */
export async function matchColumnsToFields(
  columns: ColumnProfile[],
  registry: FieldDescriptor[] = DEFAULT_FIELD_REGISTRY,
  embeddingProvider?: EmbeddingProvider
): Promise<FieldMatchResult[]> {
  const useEmbeddings = getFeatureFlag('useSemanticEmbeddings') && embeddingProvider !== undefined

  const results: FieldMatchResult[] = []

  for (const column of columns) {
    let result: FieldMatchResult

    if (useEmbeddings && embeddingProvider !== undefined) {
      result = await matchFieldWithEmbeddings(column, registry, embeddingProvider)
    } else {
      result = matchFieldByPattern(column, registry)
    }

    results.push(result)
  }

  return results
}
