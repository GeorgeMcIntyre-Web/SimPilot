/**
 * Concurrency Control
 *
 * Provides utilities for processing multiple files in parallel with
 * configurable concurrency limits to prevent overwhelming the browser.
 *
 * Part of the Performance Engine for Excel ingestion.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for parallel processing.
 */
export type ConcurrencyConfig = {
  /** Maximum number of concurrent operations (default: 3) */
  limit: number
  /** Whether to continue on error (default: true) */
  continueOnError: boolean
}

/**
 * Default concurrency configuration.
 */
export const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  limit: 3,
  continueOnError: true,
}

/**
 * Result of a parallel task execution.
 */
export type TaskResult<T> =
  | { status: 'fulfilled'; value: T; index: number }
  | { status: 'rejected'; reason: Error; index: number }

// ============================================================================
// CONCURRENCY LIMITER
// ============================================================================

/**
 * Run tasks with a concurrency limit.
 *
 * Executes an array of async task functions with at most `limit` running
 * concurrently. Returns results in the same order as input tasks.
 *
 * Uses guard clauses and avoids complex queuing for simplicity.
 *
 * @param limit - Maximum concurrent tasks (default: 3)
 * @param tasks - Array of async task functions
 * @returns Array of results in same order as input
 *
 * @example
 * ```ts
 * const files = [file1, file2, file3, file4, file5]
 * const results = await runWithConcurrencyLimit(
 *   3,
 *   files.map(file => () => parseWorkbook(file))
 * )
 * ```
 */
export async function runWithConcurrencyLimit<T>(
  limit: number,
  tasks: (() => Promise<T>)[],
): Promise<T[]> {
  // Guard: empty tasks
  if (tasks.length === 0) {
    return []
  }

  // Guard: no limit needed
  if (limit <= 0 || limit >= tasks.length) {
    return Promise.all(tasks.map((task) => task()))
  }

  const results: T[] = new Array(tasks.length)
  let nextIndex = 0
  let running = 0
  let resolveAll: () => void

  const allDone = new Promise<void>((resolve) => {
    resolveAll = resolve
  })

  const runNext = async (): Promise<void> => {
    // Guard: no more tasks
    if (nextIndex >= tasks.length) {
      return
    }

    const currentIndex = nextIndex
    nextIndex++
    running++

    try {
      const task = tasks[currentIndex]
      results[currentIndex] = await task()
    } finally {
      running--

      // Check if all done
      if (nextIndex >= tasks.length && running === 0) {
        resolveAll()
      }

      // Start next task if available
      if (nextIndex < tasks.length) {
        runNext()
      }
    }
  }

  // Start initial batch of tasks up to limit
  const initialBatch = Math.min(limit, tasks.length)
  for (let i = 0; i < initialBatch; i++) {
    runNext()
  }

  await allDone
  return results
}

/**
 * Run tasks with concurrency limit, collecting all results including errors.
 *
 * Similar to Promise.allSettled but with concurrency control.
 *
 * @param limit - Maximum concurrent tasks
 * @param tasks - Array of async task functions
 * @returns Array of task results with status
 */
export async function runWithConcurrencyLimitSettled<T>(
  limit: number,
  tasks: (() => Promise<T>)[],
): Promise<TaskResult<T>[]> {
  // Guard: empty tasks
  if (tasks.length === 0) {
    return []
  }

  // Guard: no limit needed
  if (limit <= 0 || limit >= tasks.length) {
    const settled = await Promise.allSettled(tasks.map((task) => task()))
    return settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { status: 'fulfilled' as const, value: result.value, index }
      }
      return {
        status: 'rejected' as const,
        reason: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        index,
      }
    })
  }

  const results: TaskResult<T>[] = new Array(tasks.length)
  let nextIndex = 0
  let running = 0
  let resolveAll: () => void

  const allDone = new Promise<void>((resolve) => {
    resolveAll = resolve
  })

  const runNext = async (): Promise<void> => {
    // Guard: no more tasks
    if (nextIndex >= tasks.length) {
      return
    }

    const currentIndex = nextIndex
    nextIndex++
    running++

    try {
      const task = tasks[currentIndex]
      const value = await task()
      results[currentIndex] = { status: 'fulfilled', value, index: currentIndex }
    } catch (error) {
      const reason = error instanceof Error ? error : new Error(String(error))
      results[currentIndex] = { status: 'rejected', reason, index: currentIndex }
    } finally {
      running--

      // Check if all done
      if (nextIndex >= tasks.length && running === 0) {
        resolveAll()
      }

      // Start next task if available
      if (nextIndex < tasks.length) {
        runNext()
      }
    }
  }

  // Start initial batch of tasks up to limit
  const initialBatch = Math.min(limit, tasks.length)
  for (let i = 0; i < initialBatch; i++) {
    runNext()
  }

  await allDone
  return results
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process items in batches with a concurrency limit per batch.
 *
 * Useful for processing large arrays where you want to control
 * both batch size and concurrency within each batch.
 *
 * @param items - Array of items to process
 * @param batchSize - Number of items per batch
 * @param concurrency - Concurrent tasks per batch
 * @param processor - Async function to process each item
 * @returns Array of results in same order as input
 */
export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  concurrency: number,
  processor: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  // Guard: empty items
  if (items.length === 0) {
    return []
  }

  const results: R[] = []

  for (let batchStart = 0; batchStart < items.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, items.length)
    const batch = items.slice(batchStart, batchEnd)

    const tasks = batch.map((item, localIndex) => {
      const globalIndex = batchStart + localIndex
      return () => processor(item, globalIndex)
    })

    const batchResults = await runWithConcurrencyLimit(concurrency, tasks)
    results.push(...batchResults)
  }

  return results
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/**
 * Execute a function and return both result and elapsed time.
 *
 * @param fn - Async function to execute
 * @returns Object with result and elapsed milliseconds
 */
export async function withTiming<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; elapsedMs: number }> {
  const start = performance.now()
  const result = await fn()
  const elapsedMs = performance.now() - start
  return { result, elapsedMs }
}

/**
 * Execute multiple functions with concurrency and return timing for each.
 *
 * @param limit - Maximum concurrent tasks
 * @param tasks - Array of named task functions
 * @returns Array of results with timing information
 */
export async function runWithTimingAndConcurrency<T>(
  limit: number,
  tasks: { name: string; fn: () => Promise<T> }[],
): Promise<{ name: string; result: T; elapsedMs: number }[]> {
  const timedTasks = tasks.map((task) => async () => {
    const { result, elapsedMs } = await withTiming(task.fn)
    return { name: task.name, result, elapsedMs }
  })

  return runWithConcurrencyLimit(limit, timedTasks)
}
