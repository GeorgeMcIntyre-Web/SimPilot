// Embedding Types
// Defines interfaces for text embedding support in column→field matching
// Provides abstraction layer for different embedding providers

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Vector representation of embedded text
 */
export type EmbeddingVector = number[]

/**
 * Provider interface for text embedding services.
 * Implementations can use OpenAI, Cohere, local models, etc.
 */
export interface EmbeddingProvider {
  /**
   * Provider name for logging/debugging
   */
  readonly name: string

  /**
   * Embed a single text string into a vector
   */
  embedText(text: string): Promise<EmbeddingVector>

  /**
   * Batch embed multiple texts for efficiency
   * Default implementation calls embedText for each
   */
  embedBatch?(texts: string[]): Promise<EmbeddingVector[]>

  /**
   * Get the dimensionality of vectors produced
   */
  getDimension(): number
}

/**
 * Cached embedding entry
 */
export interface CachedEmbedding {
  text: string
  vector: EmbeddingVector
  timestamp: number
}

/**
 * Embedding cache for performance
 */
export interface EmbeddingCache {
  get(text: string): EmbeddingVector | undefined
  set(text: string, vector: EmbeddingVector): void
  clear(): void
  size(): number
}

// ============================================================================
// COSINE SIMILARITY
// ============================================================================

/**
 * Calculate cosine similarity between two vectors.
 * Returns value between -1 and 1 (1 = identical direction)
 */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }

  if (a.length === 0) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)

  if (denominator === 0) {
    return 0
  }

  return dotProduct / denominator
}

/**
 * Normalize similarity from [-1, 1] to [0, 1] range
 */
export function normalizeSimilarity(similarity: number): number {
  return (similarity + 1) / 2
}

// ============================================================================
// IN-MEMORY CACHE IMPLEMENTATION
// ============================================================================

/**
 * Simple in-memory embedding cache
 */
export class InMemoryEmbeddingCache implements EmbeddingCache {
  private cache: Map<string, CachedEmbedding> = new Map()
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  get(text: string): EmbeddingVector | undefined {
    const entry = this.cache.get(text)
    return entry?.vector
  }

  set(text: string, vector: EmbeddingVector): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      // Remove oldest 10%
      const toRemove = Math.ceil(this.maxSize * 0.1)
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0])
      }
    }

    this.cache.set(text, {
      text,
      vector,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// ============================================================================
// MOCK/STUB PROVIDER FOR TESTING
// ============================================================================

/**
 * Mock embedding provider that produces deterministic vectors.
 * Useful for testing without external API calls.
 * 
 * Strategy: Creates vectors based on text hash for consistency
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'MockProvider'
  private dimension: number
  private cache: EmbeddingCache

  constructor(dimension: number = 128) {
    this.dimension = dimension
    this.cache = new InMemoryEmbeddingCache()
  }

  async embedText(text: string): Promise<EmbeddingVector> {
    // Check cache first
    const cached = this.cache.get(text)
    if (cached !== undefined) {
      return cached
    }

    // Generate deterministic vector based on text
    const vector = this.generateVector(text)
    this.cache.set(text, vector)
    
    return vector
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    const results: EmbeddingVector[] = []
    
    for (const text of texts) {
      const vector = await this.embedText(text)
      results.push(vector)
    }
    
    return results
  }

  getDimension(): number {
    return this.dimension
  }

  /**
   * Generate a deterministic vector from text using simple hash
   */
  private generateVector(text: string): EmbeddingVector {
    const vector: number[] = new Array(this.dimension)
    const normalized = text.toLowerCase().trim()
    
    // Simple hash-based vector generation
    for (let i = 0; i < this.dimension; i++) {
      let hash = 0
      for (let j = 0; j < normalized.length; j++) {
        hash = ((hash << 5) - hash + normalized.charCodeAt(j) * (i + 1)) | 0
      }
      // Convert to float in [-1, 1] range
      vector[i] = Math.sin(hash * 0.0001 + i * 0.01)
    }
    
    // Normalize the vector
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vector[i] = vector[i] / norm
      }
    }
    
    return vector
  }
}

// ============================================================================
// SEMANTIC DESCRIPTION BUILDER
// ============================================================================

/**
 * Build a semantic description string for a column.
 * This will be embedded and compared against field descriptions.
 */
export function buildColumnDescription(input: {
  header: string
  types: string[]
  samples: string[]
  sheetCategory?: string
}): string {
  const parts: string[] = []

  // Header
  parts.push(`Header: '${input.header}'`)

  // Data types
  if (input.types.length > 0) {
    const typeStr = input.types.length > 3
      ? input.types.slice(0, 3).join(', ') + '...'
      : input.types.join(', ')
    parts.push(`Types: ${typeStr}`)
  }

  // Sample values
  if (input.samples.length > 0) {
    const samplesStr = input.samples
      .slice(0, 5)
      .map(s => s.length > 20 ? s.substring(0, 17) + '...' : s)
      .join(', ')
    parts.push(`Samples: ${samplesStr}`)
  }

  // Sheet context
  if (input.sheetCategory !== undefined && input.sheetCategory !== 'UNKNOWN') {
    parts.push(`Context: ${input.sheetCategory}`)
  }

  return parts.join('. ')
}

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

export type EmbeddingProviderType = 'mock' | 'openai' | 'local'

/**
 * Create an embedding provider by type.
 * For now, only mock is implemented.
 * 
 * TODO: Implement OpenAI and local model providers
 */
export function createEmbeddingProvider(
  type: EmbeddingProviderType,
  _options?: Record<string, unknown>
): EmbeddingProvider {
  switch (type) {
    case 'mock':
      return new MockEmbeddingProvider()
    case 'openai':
      // TODO: Implement OpenAI embedding provider
      console.warn('[EmbeddingProvider] OpenAI provider not yet implemented, using mock')
      return new MockEmbeddingProvider()
    case 'local':
      // TODO: Implement local model embedding provider
      console.warn('[EmbeddingProvider] Local provider not yet implemented, using mock')
      return new MockEmbeddingProvider()
    default:
      return new MockEmbeddingProvider()
  }
}
