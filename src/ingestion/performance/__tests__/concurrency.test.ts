/**
 * Tests for Concurrency Control
 *
 * Validates:
 * - Concurrency limiting
 * - Task ordering
 * - Error handling
 * - Timing utilities
 */

import { describe, it, expect } from 'vitest'
import {
  runWithConcurrencyLimit,
  runWithConcurrencyLimitSettled,
  processBatches,
  withTiming,
} from '../concurrency'

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a task that resolves after a delay.
 */
function createDelayTask<T>(value: T, delayMs: number): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(() => resolve(value), delayMs))
}

/**
 * Create a task that rejects after a delay.
 */
function createFailTask(error: Error, delayMs: number): () => Promise<never> {
  return () => new Promise((_, reject) => setTimeout(() => reject(error), delayMs))
}

/**
 * Track concurrent executions.
 */
function createConcurrencyTracker() {
  let current = 0
  let max = 0
  const log: { action: 'start' | 'end'; time: number }[] = []

  return {
    start: () => {
      current++
      max = Math.max(max, current)
      log.push({ action: 'start', time: Date.now() })
    },
    end: () => {
      current--
      log.push({ action: 'end', time: Date.now() })
    },
    getMax: () => max,
    getLog: () => log,
    getCurrent: () => current,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('runWithConcurrencyLimit', () => {
  describe('basic functionality', () => {
    it('should return results in order', async () => {
      const tasks = [createDelayTask('a', 30), createDelayTask('b', 10), createDelayTask('c', 20)]

      const results = await runWithConcurrencyLimit(2, tasks)

      expect(results).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty task array', async () => {
      const results = await runWithConcurrencyLimit(3, [])
      expect(results).toEqual([])
    })

    it('should handle single task', async () => {
      const results = await runWithConcurrencyLimit(3, [() => Promise.resolve('only')])
      expect(results).toEqual(['only'])
    })

    it('should process all tasks when limit >= task count', async () => {
      const tasks = [createDelayTask(1, 10), createDelayTask(2, 10), createDelayTask(3, 10)]

      const results = await runWithConcurrencyLimit(10, tasks)

      expect(results).toEqual([1, 2, 3])
    })
  })

  describe('concurrency limiting', () => {
    it('should respect concurrency limit', async () => {
      const tracker = createConcurrencyTracker()

      const tasks = Array(10)
        .fill(null)
        .map((_, i) => async () => {
          tracker.start()
          await new Promise((resolve) => setTimeout(resolve, 20))
          tracker.end()
          return i
        })

      await runWithConcurrencyLimit(3, tasks)

      // Should never exceed limit
      expect(tracker.getMax()).toBeLessThanOrEqual(3)
    })

    it('should achieve maximum concurrency for fast tasks', async () => {
      const tracker = createConcurrencyTracker()

      const tasks = Array(6)
        .fill(null)
        .map((_, i) => async () => {
          tracker.start()
          await new Promise((resolve) => setTimeout(resolve, 50))
          tracker.end()
          return i
        })

      await runWithConcurrencyLimit(3, tasks)

      // Should reach the limit
      expect(tracker.getMax()).toBe(3)
    })

    it('should process faster than sequential for parallel tasks', async () => {
      const taskCount = 4
      const taskDuration = 30

      const tasks = Array(taskCount)
        .fill(null)
        .map((_, i) => createDelayTask(i, taskDuration))

      const start = Date.now()
      await runWithConcurrencyLimit(4, tasks)
      const elapsed = Date.now() - start

      // Should be much faster than sequential
      const sequentialTime = taskCount * taskDuration
      expect(elapsed).toBeLessThan(sequentialTime * 0.8)
    })
  })

  describe('edge cases', () => {
    it('should handle limit of 0 (runs all at once)', async () => {
      const tracker = createConcurrencyTracker()

      const tasks = Array(5)
        .fill(null)
        .map((_, i) => async () => {
          tracker.start()
          await new Promise((resolve) => setTimeout(resolve, 10))
          tracker.end()
          return i
        })

      await runWithConcurrencyLimit(0, tasks)

      // Limit 0 means run all at once
      expect(tracker.getMax()).toBe(5)
    })

    it('should handle limit of 1 (sequential)', async () => {
      const tracker = createConcurrencyTracker()

      const tasks = Array(5)
        .fill(null)
        .map((_, i) => async () => {
          tracker.start()
          await new Promise((resolve) => setTimeout(resolve, 5))
          tracker.end()
          return i
        })

      await runWithConcurrencyLimit(1, tasks)

      // Should never have more than 1 running
      expect(tracker.getMax()).toBe(1)
    })
  })
})

describe('runWithConcurrencyLimitSettled', () => {
  it('should return fulfilled results', async () => {
    const tasks = [() => Promise.resolve('a'), () => Promise.resolve('b')]

    const results = await runWithConcurrencyLimitSettled(2, tasks)

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'a', index: 0 })
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'b', index: 1 })
  })

  it('should return rejected results', async () => {
    const error = new Error('Task failed')
    const tasks = [
      () => Promise.resolve('a'),
      createFailTask(error, 10),
      () => Promise.resolve('c'),
    ]

    const results = await runWithConcurrencyLimitSettled(2, tasks)

    expect(results).toHaveLength(3)
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')
    expect((results[1] as any).reason.message).toBe('Task failed')
    expect(results[2].status).toBe('fulfilled')
  })

  it('should continue after errors', async () => {
    const tracker = { completed: 0 }

    const tasks = [
      async () => {
        tracker.completed++
        return 1
      },
      async () => {
        throw new Error('fail')
      },
      async () => {
        tracker.completed++
        return 3
      },
      async () => {
        tracker.completed++
        return 4
      },
    ]

    await runWithConcurrencyLimitSettled(2, tasks)

    // Should complete all non-failing tasks
    expect(tracker.completed).toBe(3)
  })

  it('should preserve order with mixed results', async () => {
    const tasks = [
      createDelayTask('a', 30),
      createFailTask(new Error('b failed'), 10),
      createDelayTask('c', 20),
    ]

    const results = await runWithConcurrencyLimitSettled(3, tasks)

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'a', index: 0 })
    expect(results[1].status).toBe('rejected')
    expect(results[1].index).toBe(1)
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'c', index: 2 })
  })
})

describe('processBatches', () => {
  it('should process items in batches', async () => {
    const items = [1, 2, 3, 4, 5, 6]
    const processed: number[] = []

    const results = await processBatches(
      items,
      2, // batch size
      2, // concurrency
      async (item) => {
        processed.push(item)
        return item * 2
      },
    )

    expect(results).toEqual([2, 4, 6, 8, 10, 12])
    expect(processed).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('should handle empty items', async () => {
    const results = await processBatches([], 3, 2, async (x) => x)
    expect(results).toEqual([])
  })

  it('should pass correct index to processor', async () => {
    const items = ['a', 'b', 'c']
    const indices: number[] = []

    await processBatches(items, 2, 2, async (item, index) => {
      indices.push(index)
      return item
    })

    expect(indices).toEqual([0, 1, 2])
  })
})

describe('withTiming', () => {
  it('should return result and timing', async () => {
    const delay = 50
    const result = await withTiming(async () => {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return 'done'
    })

    expect(result.result).toBe('done')
    expect(result.elapsedMs).toBeGreaterThanOrEqual(delay * 0.8)
    expect(result.elapsedMs).toBeLessThan(delay * 3)
  })

  it('should time fast operations', async () => {
    const result = await withTiming(async () => 42)

    expect(result.result).toBe(42)
    expect(result.elapsedMs).toBeLessThan(10)
  })
})
