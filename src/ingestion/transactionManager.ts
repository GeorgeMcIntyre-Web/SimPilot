// Transaction Manager for ingestion operations
// Addresses DATA_INTEGRITY_ISSUES.md - Issue #5: Transaction Rollback

import { coreStore } from '../domain/coreStore'
import { StoreSnapshot, createSnapshotFromState, applySnapshotToState } from '../domain/storeSnapshot'
import { Robot, Tool } from '../domain/core'
import { log } from '../lib/log'

/**
 * Transaction status
 */
export type TransactionStatus = 'pending' | 'committed' | 'rolled_back'

/**
 * Transaction result
 */
export interface TransactionResult<T> {
  success: boolean
  data?: T
  error?: Error
  status: TransactionStatus
}

/**
 * Transaction manager for atomic data operations
 * Provides snapshot-based rollback for ingestion operations
 */
export class IngestionTransaction {
  private snapshot: StoreSnapshot | null = null
  private status: TransactionStatus = 'pending'
  private startTime: string | null = null

  /**
   * Begin transaction by creating a snapshot of current state
   */
  begin(): void {
    const currentState = coreStore.getState()
    this.snapshot = createSnapshotFromState(currentState, {
      sourceKind: 'local',
      description: 'Pre-ingestion snapshot for rollback'
    })
    this.startTime = new Date().toISOString()
    this.status = 'pending'
    log.debug('[Transaction] Transaction started at', this.startTime)
  }

  /**
   * Commit the transaction (no-op, just marks as committed)
   */
  commit(): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot commit transaction in ${this.status} state`)
    }
    this.status = 'committed'
    log.debug('[Transaction] Transaction committed successfully')
  }

  /**
   * Rollback to the snapshot taken at begin()
   */
  rollback(): void {
    if (!this.snapshot) {
      throw new Error('No snapshot available for rollback. Did you call begin()?')
    }

    log.warn('[Transaction] Rolling back to snapshot from', this.startTime)

    // Restore the snapshot
    const restoredState = applySnapshotToState(this.snapshot)

    // Apply to store (manually update store state)
    // Note: UnifiedAsset[] needs to be converted to Robot[] and Tool[]
    // For now, we'll use type assertions since UnifiedAsset is compatible
    const robotAssets = restoredState.assets.filter(a => a.kind === 'ROBOT') as Robot[]
    const toolAssets = restoredState.assets.filter(a => a.kind !== 'ROBOT') as Tool[]
    coreStore.setData({
      projects: restoredState.projects,
      areas: restoredState.areas,
      cells: restoredState.cells,
      robots: robotAssets,
      tools: toolAssets,
      warnings: restoredState.warnings,
      referenceData: restoredState.referenceData
    }, restoredState.dataSource || undefined)

    this.status = 'rolled_back'
    log.warn('[Transaction] Rollback completed')
  }

  /**
   * Get current transaction status
   */
  getStatus(): TransactionStatus {
    return this.status
  }

  /**
   * Check if transaction is active (pending)
   */
  isActive(): boolean {
    return this.status === 'pending'
  }
}

/**
 * Execute a function within a transaction context
 * Automatically rolls back on error
 *
 * @param fn - Async function to execute
 * @returns Promise with transaction result
 */
export async function withTransaction<T>(
  fn: () => Promise<T>
): Promise<TransactionResult<T>> {
  const tx = new IngestionTransaction()

  try {
    // Begin transaction
    tx.begin()

    // Execute function
    const result = await fn()

    // Commit on success
    tx.commit()

    return {
      success: true,
      data: result,
      status: tx.getStatus()
    }
  } catch (error) {
    // Rollback on error
    log.error('[Transaction] Error occurred, rolling back:', error)
    tx.rollback()

    return {
      success: false,
      error: error as Error,
      status: tx.getStatus()
    }
  }
}

/**
 * Create a transaction for manual control
 * Use this when you need fine-grained control over begin/commit/rollback
 */
export function createTransaction(): IngestionTransaction {
  return new IngestionTransaction()
}
