/**
 * TOOLING SNAPSHOT BUILDER
 *
 * Builds ToolingSnapshot from parsed tooling items
 * Provides a clean separation between parsing (ingestion layer) and domain model
 */

import type { ToolingSnapshot, ToolingItem } from './toolingTypes'

/**
 * Build a tooling snapshot from tooling items
 */
export function buildToolingSnapshot(items: ToolingItem[]): ToolingSnapshot {
  return {
    updatedAt: new Date().toISOString(),
    items
  }
}

/**
 * Merge multiple tooling snapshots into one
 */
export function mergeToolingSnapshots(snapshots: ToolingSnapshot[]): ToolingSnapshot {
  // Guard: empty array
  if (snapshots.length === 0) {
    return {
      updatedAt: new Date().toISOString(),
      items: []
    }
  }

  // Guard: single snapshot
  if (snapshots.length === 1) {
    return snapshots[0]
  }

  // Merge all items (using Map to dedupe by toolingId)
  const itemsMap = new Map<string, ToolingItem>()

  for (const snapshot of snapshots) {
    for (const item of snapshot.items) {
      // Last snapshot wins if there are duplicates
      itemsMap.set(item.toolingId, item)
    }
  }

  // Find most recent updatedAt
  const mostRecent = snapshots.reduce((latest, current) => {
    if (current.updatedAt > latest) {
      return current.updatedAt
    }
    return latest
  }, snapshots[0].updatedAt)

  return {
    updatedAt: mostRecent,
    items: Array.from(itemsMap.values())
  }
}
