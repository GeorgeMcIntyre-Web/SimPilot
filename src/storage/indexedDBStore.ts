/**
 * IndexedDB Storage Module
 *
 * Provides automatic snapshot versioning for SimPilot data imports.
 * Stores full CoreStoreState snapshots with metadata in IndexedDB.
 * All data stays local on the user's PC.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CoreStoreState } from '../domain/coreStore';
import { log } from '../lib/log';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * IndexedDB schema definition
 */
interface SimPilotDB extends DBSchema {
  snapshots: {
    key: string; // ISO timestamp
    value: SnapshotRecord;
    indexes: { 'by-timestamp': string };
  };
}

/**
 * Snapshot record stored in IndexedDB
 */
export interface SnapshotRecord {
  timestamp: string; // ISO format
  data: CoreStoreState;
  metadata: SnapshotMetadata;
}

/**
 * Metadata about a snapshot
 */
export interface SnapshotMetadata {
  fileNames: string[];
  toolCount: number;
  robotCount: number;
  cellCount: number;
  projectCount: number;
  areaCount: number;
  source: 'Local' | 'MS365' | 'Demo';
  userNotes?: string;
}

/**
 * Lightweight snapshot summary (for timeline views)
 */
export interface SnapshotSummary {
  timestamp: string;
  metadata: SnapshotMetadata;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  snapshotCount: number;
  oldestSnapshot: string | null;
  newestSnapshot: string | null;
  estimatedSizeMB: number;
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

const DB_NAME = 'SimPilot';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_SNAPSHOTS = 50; // Default retention limit

let dbInstance: IDBPDatabase<SimPilotDB> | null = null;

/**
 * Initialize IndexedDB with schema
 */
async function initDB(): Promise<IDBPDatabase<SimPilotDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<SimPilotDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create snapshots object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'timestamp'
          });

          // Add index for timestamp-based queries
          store.createIndex('by-timestamp', 'timestamp', { unique: true });

          log.info('IndexedDB: Created snapshots object store');
        }
      },
      blocked() {
        log.warn('IndexedDB: Database upgrade blocked by another tab');
      },
      blocking() {
        log.warn('IndexedDB: This connection is blocking a database upgrade');
      },
      terminated() {
        log.error('IndexedDB: Database connection unexpectedly terminated');
        dbInstance = null;
      }
    });

    log.info('IndexedDB: Database initialized successfully');
    return dbInstance;
  } catch (error) {
    log.error('IndexedDB: Failed to initialize database', error);
    throw new Error('Failed to initialize IndexedDB');
  }
}

/**
 * Get database instance (initialize if needed)
 */
async function getDB(): Promise<IDBPDatabase<SimPilotDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

// ============================================================================
// SNAPSHOT OPERATIONS
// ============================================================================

/**
 * Calculate metadata from CoreStoreState
 */
function calculateMetadata(
  data: CoreStoreState,
  fileNames: string[],
  userNotes?: string
): SnapshotMetadata {
  const tools = data.assets.filter(a => a.kind !== 'ROBOT');
  const robots = data.assets.filter(a => a.kind === 'ROBOT');

  return {
    fileNames,
    toolCount: tools.length,
    robotCount: robots.length,
    cellCount: data.cells.length,
    projectCount: data.projects.length,
    areaCount: data.areas.length,
    source: data.dataSource || 'Local',
    userNotes
  };
}

/**
 * Save a snapshot of the current state
 *
 * @param data - CoreStoreState to save
 * @param fileNames - Names of files that were imported
 * @param userNotes - Optional user notes
 * @returns Timestamp of the saved snapshot
 */
export async function saveSnapshot(
  data: CoreStoreState,
  fileNames: string[],
  userNotes?: string
): Promise<string> {
  try {
    const db = await getDB();
    const timestamp = new Date().toISOString();

    const metadata = calculateMetadata(data, fileNames, userNotes);

    const snapshot: SnapshotRecord = {
      timestamp,
      data,
      metadata
    };

    // Save to IndexedDB
    await db.put(STORE_NAME, snapshot);

    log.info('IndexedDB: Snapshot saved', {
      timestamp,
      toolCount: metadata.toolCount,
      robotCount: metadata.robotCount,
      cellCount: metadata.cellCount
    });

    // Auto-prune old snapshots if needed
    await pruneOldSnapshots(MAX_SNAPSHOTS);

    return timestamp;
  } catch (error) {
    log.error('IndexedDB: Failed to save snapshot', error);
    throw new Error('Failed to save snapshot');
  }
}

/**
 * Get all snapshot summaries (metadata only, not full data)
 *
 * @returns Array of snapshot summaries, newest first
 */
export async function getAllSnapshots(): Promise<SnapshotSummary[]> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    // Get all records
    const allRecords = await store.getAll();

    // Convert to summaries (exclude large data field)
    const summaries: SnapshotSummary[] = allRecords.map(record => ({
      timestamp: record.timestamp,
      metadata: record.metadata
    }));

    // Sort by timestamp (newest first)
    summaries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    log.info('IndexedDB: Retrieved snapshots', { count: summaries.length });

    return summaries;
  } catch (error) {
    log.error('IndexedDB: Failed to get snapshots', error);
    throw new Error('Failed to retrieve snapshots');
  }
}

/**
 * Get a specific snapshot by timestamp
 *
 * @param timestamp - ISO timestamp of the snapshot
 * @returns Full snapshot record with data
 */
export async function getSnapshot(timestamp: string): Promise<SnapshotRecord | null> {
  try {
    const db = await getDB();
    const snapshot = await db.get(STORE_NAME, timestamp);

    if (snapshot) {
      log.info('IndexedDB: Retrieved snapshot', { timestamp });
    } else {
      log.warn('IndexedDB: Snapshot not found', { timestamp });
    }

    return snapshot || null;
  } catch (error) {
    log.error('IndexedDB: Failed to get snapshot', error);
    throw new Error('Failed to retrieve snapshot');
  }
}

/**
 * Delete a specific snapshot
 *
 * @param timestamp - ISO timestamp of the snapshot to delete
 */
export async function deleteSnapshot(timestamp: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, timestamp);

    log.info('IndexedDB: Snapshot deleted', { timestamp });
  } catch (error) {
    log.error('IndexedDB: Failed to delete snapshot', error);
    throw new Error('Failed to delete snapshot');
  }
}

/**
 * Delete all snapshots
 */
export async function deleteAllSnapshots(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await store.clear();
    await tx.done;

    log.info('IndexedDB: All snapshots deleted');
  } catch (error) {
    log.error('IndexedDB: Failed to delete all snapshots', error);
    throw new Error('Failed to delete all snapshots');
  }
}

/**
 * Prune old snapshots, keeping only the most recent N
 *
 * @param keepCount - Number of snapshots to keep (default: 50)
 */
export async function pruneOldSnapshots(keepCount: number = MAX_SNAPSHOTS): Promise<number> {
  try {
    const db = await getDB();
    const summaries = await getAllSnapshots();

    if (summaries.length <= keepCount) {
      return 0; // Nothing to prune
    }

    // Get timestamps to delete (oldest ones)
    const toDelete = summaries
      .slice(keepCount) // Skip the first N (newest)
      .map(s => s.timestamp);

    // Delete old snapshots
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const timestamp of toDelete) {
      await store.delete(timestamp);
    }

    await tx.done;

    log.info('IndexedDB: Pruned old snapshots', {
      deleted: toDelete.length,
      remaining: keepCount
    });

    return toDelete.length;
  } catch (error) {
    log.error('IndexedDB: Failed to prune snapshots', error);
    throw new Error('Failed to prune snapshots');
  }
}

// ============================================================================
// STORAGE STATISTICS
// ============================================================================

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  try {
    const summaries = await getAllSnapshots();

    if (summaries.length === 0) {
      return {
        snapshotCount: 0,
        oldestSnapshot: null,
        newestSnapshot: null,
        estimatedSizeMB: 0
      };
    }

    // Sort by timestamp to find oldest/newest
    const sorted = [...summaries].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );

    // Rough estimate: ~5-10 MB per snapshot
    const estimatedSizeMB = summaries.length * 7.5;

    return {
      snapshotCount: summaries.length,
      oldestSnapshot: sorted[0].timestamp,
      newestSnapshot: sorted[sorted.length - 1].timestamp,
      estimatedSizeMB: Math.round(estimatedSizeMB * 10) / 10
    };
  } catch (error) {
    log.error('IndexedDB: Failed to get storage stats', error);
    throw new Error('Failed to get storage statistics');
  }
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

/**
 * Close database connection (primarily for testing)
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    log.info('IndexedDB: Database connection closed');
  }
}

/**
 * Check if IndexedDB is available in the browser
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  } catch {
    return false;
  }
}
