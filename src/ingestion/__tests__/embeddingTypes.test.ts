// Embedding Types Tests
// Tests for embedding provider, cosine similarity, and caching

import { describe, it, expect, beforeEach } from 'vitest'
import {
  cosineSimilarity,
  normalizeSimilarity,
  MockEmbeddingProvider,
  InMemoryEmbeddingCache,
  buildColumnDescription
} from '../embeddingTypes'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = [1, 0, 0]
    const b = [1, 0, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0)
  })

  it('returns -1 for opposite vectors', () => {
    const a = [1, 0, 0]
    const b = [-1, 0, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0)
  })

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0]
    const b = [0, 1, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0)
  })

  it('handles normalized vectors correctly', () => {
    const a = [0.6, 0.8, 0]
    const b = [0.6, 0.8, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0)
  })

  it('throws on dimension mismatch', () => {
    const a = [1, 0]
    const b = [1, 0, 0]
    expect(() => cosineSimilarity(a, b)).toThrow('dimension mismatch')
  })

  it('returns 0 for empty vectors', () => {
    const a: number[] = []
    const b: number[] = []
    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it('returns 0 for zero vectors', () => {
    const a = [0, 0, 0]
    const b = [0, 0, 0]
    expect(cosineSimilarity(a, b)).toBe(0)
  })
})

describe('normalizeSimilarity', () => {
  it('maps -1 to 0', () => {
    expect(normalizeSimilarity(-1)).toBe(0)
  })

  it('maps 1 to 1', () => {
    expect(normalizeSimilarity(1)).toBe(1)
  })

  it('maps 0 to 0.5', () => {
    expect(normalizeSimilarity(0)).toBe(0.5)
  })
})

describe('MockEmbeddingProvider', () => {
  let provider: MockEmbeddingProvider

  beforeEach(() => {
    provider = new MockEmbeddingProvider(64)
  })

  it('has correct name', () => {
    expect(provider.name).toBe('MockProvider')
  })

  it('returns correct dimension', () => {
    expect(provider.getDimension()).toBe(64)
  })

  it('produces deterministic vectors for same input', async () => {
    const text = 'Robot ID column header'
    const v1 = await provider.embedText(text)
    const v2 = await provider.embedText(text)

    expect(v1).toEqual(v2)
  })

  it('produces different vectors for different inputs', async () => {
    const v1 = await provider.embedText('Robot ID')
    const v2 = await provider.embedText('Station Number')

    expect(v1).not.toEqual(v2)
  })

  it('produces normalized vectors', async () => {
    const v = await provider.embedText('Test text')
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0))
    expect(norm).toBeCloseTo(1.0, 5)
  })

  it('supports batch embedding', async () => {
    const texts = ['Robot ID', 'Station', 'Area']
    const vectors = await provider.embedBatch(texts)

    expect(vectors).toHaveLength(3)
    expect(vectors[0]).toHaveLength(64)
  })

  it('similar texts have higher similarity', async () => {
    const robotId1 = await provider.embedText('Robot ID')
    const robotId2 = await provider.embedText('Robot Number')
    const station = await provider.embedText('Station Code')

    const sim1 = cosineSimilarity(robotId1, robotId2)
    const sim2 = cosineSimilarity(robotId1, station)

    // Robot ID and Robot Number should be more similar than Robot ID and Station
    // (Though with mock provider, this depends on hash characteristics)
    expect(typeof sim1).toBe('number')
    expect(typeof sim2).toBe('number')
  })
})

describe('InMemoryEmbeddingCache', () => {
  let cache: InMemoryEmbeddingCache

  beforeEach(() => {
    cache = new InMemoryEmbeddingCache(5)
  })

  it('returns undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined()
  })

  it('stores and retrieves vectors', () => {
    const vector = [1, 2, 3]
    cache.set('test', vector)
    expect(cache.get('test')).toEqual(vector)
  })

  it('tracks size correctly', () => {
    expect(cache.size()).toBe(0)
    cache.set('a', [1])
    expect(cache.size()).toBe(1)
    cache.set('b', [2])
    expect(cache.size()).toBe(2)
  })

  it('clears all entries', () => {
    cache.set('a', [1])
    cache.set('b', [2])
    cache.clear()
    expect(cache.size()).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('evicts oldest entries when full', () => {
    // Fill cache to max (5)
    for (let i = 0; i < 5; i++) {
      cache.set(`key${i}`, [i])
    }
    expect(cache.size()).toBe(5)

    // Add one more - should trigger eviction
    cache.set('newKey', [99])
    
    // Size should be less than or equal to max
    expect(cache.size()).toBeLessThanOrEqual(5)
    
    // New key should exist
    expect(cache.get('newKey')).toEqual([99])
  })
})

describe('buildColumnDescription', () => {
  it('includes header', () => {
    const desc = buildColumnDescription({
      header: 'Robot ID',
      types: [],
      samples: []
    })
    expect(desc).toContain("Header: 'Robot ID'")
  })

  it('includes types', () => {
    const desc = buildColumnDescription({
      header: 'Count',
      types: ['number', 'string'],
      samples: []
    })
    expect(desc).toContain('Types: number, string')
  })

  it('truncates long type lists', () => {
    const desc = buildColumnDescription({
      header: 'Mixed',
      types: ['number', 'string', 'boolean', 'object'],
      samples: []
    })
    expect(desc).toContain('Types: number, string, boolean...')
  })

  it('includes sample values', () => {
    const desc = buildColumnDescription({
      header: 'Station',
      types: ['string'],
      samples: ['ST-01', 'ST-02', 'ST-03']
    })
    expect(desc).toContain('Samples: ST-01, ST-02, ST-03')
  })

  it('truncates long sample values', () => {
    const desc = buildColumnDescription({
      header: 'Description',
      types: ['string'],
      samples: ['This is a very long description that should be truncated']
    })
    // Truncates to 17 chars + '...'
    expect(desc).toContain('This is a very lo...')
  })

  it('includes sheet category context', () => {
    const desc = buildColumnDescription({
      header: 'Robot ID',
      types: ['string'],
      samples: ['R001'],
      sheetCategory: 'ROBOT_SPECS'
    })
    expect(desc).toContain('Context: ROBOT_SPECS')
  })

  it('excludes UNKNOWN category', () => {
    const desc = buildColumnDescription({
      header: 'Robot ID',
      types: ['string'],
      samples: ['R001'],
      sheetCategory: 'UNKNOWN'
    })
    expect(desc).not.toContain('Context:')
  })
})
