// Snapshot Persistence Service
// IndexedDB storage for DailySnapshots

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { DailySnapshot } from '../domain/history/snapshotTypes'
import { snapshotStore } from '../domain/history/snapshotStore'

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

interface SnapshotDB extends DBSchema {
  snapshots: {
    key: string  // snapshot.id
    value: DailySnapshot
    indexes: {
      'by-project': string      // projectId
      'by-captured-at': string  // capturedAt
    }
  }
}

const DB_NAME = 'SimPilotSnapshotsDB'
const DB_VERSION = 1
const STORE_NAME = 'snapshots'

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let dbPromise: Promise<IDBPDatabase<SnapshotDB>> | null = null

function getDB(): Promise<IDBPDatabase<SnapshotDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SnapshotDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('by-project', 'projectId')
          store.createIndex('by-captured-at', 'capturedAt')
        }
      }
    })
  }
  return dbPromise
}

// ============================================================================
// PERSISTENCE SERVICE
// ============================================================================

export interface SnapshotPersistenceResult {
  success: boolean
  errorMessage?: string
}

export const snapshotPersistence = {
  /**
   * Save a single snapshot to IndexedDB
   */
  async saveSnapshot(snapshot: DailySnapshot): Promise<SnapshotPersistenceResult> {
    try {
      const db = await getDB()
      await db.put(STORE_NAME, snapshot)
      return { success: true }
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to save snapshot:', error)
      return { success: false, errorMessage: String(error) }
    }
  },
  
  /**
   * Save multiple snapshots
   */
  async saveSnapshots(snapshots: DailySnapshot[]): Promise<SnapshotPersistenceResult> {
    try {
      const db = await getDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      
      await Promise.all([
        ...snapshots.map(s => tx.store.put(s)),
        tx.done
      ])
      
      return { success: true }
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to save snapshots:', error)
      return { success: false, errorMessage: String(error) }
    }
  },
  
  /**
   * Load all snapshots from IndexedDB
   */
  async loadAllSnapshots(): Promise<DailySnapshot[]> {
    try {
      const db = await getDB()
      const snapshots = await db.getAll(STORE_NAME)
      return snapshots
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to load snapshots:', error)
      return []
    }
  },
  
  /**
   * Load snapshots for a specific project
   */
  async loadProjectSnapshots(projectId: string): Promise<DailySnapshot[]> {
    try {
      const db = await getDB()
      const snapshots = await db.getAllFromIndex(STORE_NAME, 'by-project', projectId)
      return snapshots.sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
      )
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to load project snapshots:', error)
      return []
    }
  },
  
  /**
   * Load a single snapshot by ID
   */
  async loadSnapshot(snapshotId: string): Promise<DailySnapshot | undefined> {
    try {
      const db = await getDB()
      return await db.get(STORE_NAME, snapshotId)
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to load snapshot:', error)
      return undefined
    }
  },
  
  /**
   * Delete a snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<SnapshotPersistenceResult> {
    try {
      const db = await getDB()
      await db.delete(STORE_NAME, snapshotId)
      return { success: true }
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to delete snapshot:', error)
      return { success: false, errorMessage: String(error) }
    }
  },
  
  /**
   * Delete all snapshots for a project
   */
  async deleteProjectSnapshots(projectId: string): Promise<SnapshotPersistenceResult> {
    try {
      const db = await getDB()
      const snapshots = await db.getAllFromIndex(STORE_NAME, 'by-project', projectId)
      
      const tx = db.transaction(STORE_NAME, 'readwrite')
      await Promise.all([
        ...snapshots.map(s => tx.store.delete(s.id)),
        tx.done
      ])
      
      return { success: true }
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to delete project snapshots:', error)
      return { success: false, errorMessage: String(error) }
    }
  },
  
  /**
   * Clear all snapshots
   */
  async clearAll(): Promise<SnapshotPersistenceResult> {
    try {
      const db = await getDB()
      await db.clear(STORE_NAME)
      return { success: true }
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to clear snapshots:', error)
      return { success: false, errorMessage: String(error) }
    }
  },
  
  /**
   * Get snapshot count
   */
  async getSnapshotCount(): Promise<number> {
    try {
      const db = await getDB()
      return await db.count(STORE_NAME)
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to count snapshots:', error)
      return 0
    }
  },
  
  /**
   * Get snapshot count for a project
   */
  async getProjectSnapshotCount(projectId: string): Promise<number> {
    try {
      const db = await getDB()
      const snapshots = await db.getAllFromIndex(STORE_NAME, 'by-project', projectId)
      return snapshots.length
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to count project snapshots:', error)
      return 0
    }
  },

  /**
   * Check if a snapshot exists for today
   */
  async hasTodaySnapshot(projectId: string): Promise<boolean> {
    try {
      const snapshots = await this.loadProjectSnapshots(projectId)
      if (snapshots.length === 0) return false
      
      const today = new Date().toISOString().split('T')[0]
      return snapshots.some(s => s.capturedAt.startsWith(today))
    } catch (error) {
      console.error('[SnapshotPersistence] Failed to check today snapshot:', error)
      return false
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize snapshot persistence - load from IndexedDB into store
 */
export async function initializeSnapshotPersistence(): Promise<void> {
  try {
    console.log('[SnapshotPersistence] Loading snapshots from IndexedDB...')
    const snapshots = await snapshotPersistence.loadAllSnapshots()
    snapshotStore.loadSnapshots(snapshots)
    console.log(`[SnapshotPersistence] Loaded ${snapshots.length} snapshots`)
  } catch (error) {
    console.error('[SnapshotPersistence] Failed to initialize:', error)
  }
}

/**
 * Save a snapshot to both store and persistence
 */
export async function captureAndPersistSnapshot(
  snapshot: DailySnapshot
): Promise<SnapshotPersistenceResult> {
  // Add to in-memory store
  snapshotStore.addSnapshot(snapshot)
  
  // Persist to IndexedDB
  const result = await snapshotPersistence.saveSnapshot(snapshot)
  
  if (!result.success) {
    console.error('[SnapshotPersistence] Failed to persist snapshot:', result.errorMessage)
  }
  
  return result
}
