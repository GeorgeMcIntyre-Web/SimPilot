/**
 * DATA HEALTH STORE
 *
 * Store for tracking data ingestion health metrics including:
 * - Reuse summary statistics
 * - Ingestion errors
 * - Linking statistics
 *
 * Designed to be populated from ExcelIngestionFacade results.
 */

import { useState, useEffect } from 'react'
import type { ReuseAllocationStatus } from '../ingestion/excelIngestionTypes'
import type { EquipmentSourcing } from './UnifiedModel'

// ============================================================================
// TYPES
// ============================================================================

export interface ReuseSummary {
  total: number
  byType: Record<string, number>
  byStatus: Record<ReuseAllocationStatus, number>
  unmatchedReuseCount: number
}

export interface LinkingStats {
  totalAssets: number
  assetsWithReuseInfo: number
  matchedReuseRecords: number
  unmatchedReuseRecords: number
}

export interface DataHealthState {
  reuseSummary: ReuseSummary | null
  linkingStats: LinkingStats | null
  errors: string[]
  lastUpdated: string | null
}

// ============================================================================
// STORE STATE
// ============================================================================

const DEFAULT_REUSE_SUMMARY: ReuseSummary = {
  total: 0,
  byType: {},
  byStatus: {
    AVAILABLE: 0,
    ALLOCATED: 0,
    IN_USE: 0,
    RESERVED: 0,
    UNKNOWN: 0
  },
  unmatchedReuseCount: 0
}

let dataHealthState: DataHealthState = {
  reuseSummary: null,
  linkingStats: null,
  errors: [],
  lastUpdated: null
}

// Subscribers for reactive updates
const subscribers = new Set<() => void>()

function notifySubscribers(): void {
  subscribers.forEach(callback => callback())
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const dataHealthStore = {
  /**
   * Get current state
   */
  getState(): DataHealthState {
    return dataHealthState
  },

  /**
   * Set reuse summary from ingestion result
   */
  setReuseSummary(summary: ReuseSummary): void {
    dataHealthState = {
      ...dataHealthState,
      reuseSummary: summary,
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Set linking stats from ingestion result
   */
  setLinkingStats(stats: LinkingStats): void {
    dataHealthState = {
      ...dataHealthState,
      linkingStats: stats,
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Set errors from ingestion result
   */
  setErrors(errors: string[]): void {
    dataHealthState = {
      ...dataHealthState,
      errors,
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Set all data health metrics at once
   */
  setDataHealth(data: {
    reuseSummary?: ReuseSummary
    linkingStats?: LinkingStats
    errors?: string[]
  }): void {
    dataHealthState = {
      reuseSummary: data.reuseSummary ?? dataHealthState.reuseSummary,
      linkingStats: data.linkingStats ?? dataHealthState.linkingStats,
      errors: data.errors ?? dataHealthState.errors,
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Clear all data health state
   */
  clear(): void {
    dataHealthState = {
      reuseSummary: null,
      linkingStats: null,
      errors: [],
      lastUpdated: null
    }
    notifySubscribers()
  },

  /**
   * Subscribe to store changes
   */
  subscribe(callback: () => void): () => void {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to access full data health state
 */
export function useDataHealthStore(): DataHealthState {
  const [state, setState] = useState(dataHealthState)

  useEffect(() => {
    const unsubscribe = dataHealthStore.subscribe(() => {
      setState(dataHealthStore.getState())
    })
    return unsubscribe
  }, [])

  return state
}

/**
 * Hook to access reuse summary
 */
export function useReuseSummary(): ReuseSummary {
  const state = useDataHealthStore()
  return state.reuseSummary ?? DEFAULT_REUSE_SUMMARY
}

/**
 * Hook to access linking stats
 */
export function useLinkingStats(): LinkingStats | null {
  const state = useDataHealthStore()
  return state.linkingStats
}

/**
 * Hook to access ingestion errors
 */
export function useIngestionErrors(): string[] {
  const state = useDataHealthStore()
  return state.errors
}

// ============================================================================
// DERIVED METRICS
// ============================================================================

export interface DataHealthMetrics {
  totalAssets: number
  totalErrors: number
  unknownSourcingCount: number
  reuseSummary: ReuseSummary
  linkingStats: LinkingStats | null
}

/**
 * Compute data health metrics from store and asset list
 */
export function computeDataHealthMetrics(
  assets: Array<{ sourcing: EquipmentSourcing }>,
  reuseSummary: ReuseSummary | null,
  linkingStats: LinkingStats | null,
  errors: string[]
): DataHealthMetrics {
  const unknownSourcingCount = assets.filter(
    asset => asset.sourcing === 'UNKNOWN'
  ).length

  return {
    totalAssets: assets.length,
    totalErrors: errors.length,
    unknownSourcingCount,
    reuseSummary: reuseSummary ?? DEFAULT_REUSE_SUMMARY,
    linkingStats
  }
}
