import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { PersistenceService, PersistenceResult, LoadResult } from './persistenceService'
import { StoreSnapshot } from '../domain/storeSnapshot'
import { log } from '../lib/log'

interface SimPilotDB extends DBSchema {
    snapshots: {
        key: string
        value: StoreSnapshot
    }
}

const DB_NAME = 'SimPilotDB'
const STORE_NAME = 'snapshots'
const SNAPSHOT_KEY = 'latest'

export class IndexedDbService implements PersistenceService {
    private dbPromise: Promise<IDBPDatabase<SimPilotDB>>

    constructor() {
        this.dbPromise = openDB<SimPilotDB>(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME)
                }
            },
        })
    }

    async save(snapshot: StoreSnapshot): Promise<PersistenceResult> {
        try {
            const db = await this.dbPromise
            await db.put(STORE_NAME, snapshot, SNAPSHOT_KEY)
            return { success: true }
        } catch (error) {
            log.error('Failed to save snapshot:', error)
            return { success: false, errorMessage: String(error) }
        }
    }

    async load(): Promise<LoadResult> {
        try {
            const db = await this.dbPromise
            const snapshot = await db.get(STORE_NAME, SNAPSHOT_KEY)

            if (!snapshot) {
                return { success: true, snapshot: undefined }
            }

            return { success: true, snapshot }
        } catch (error) {
            log.error('Failed to load snapshot:', error)
            return { success: false, errorMessage: String(error) }
        }
    }

    async clear(): Promise<PersistenceResult> {
        try {
            const db = await this.dbPromise
            await db.delete(STORE_NAME, SNAPSHOT_KEY)
            return { success: true }
        } catch (error) {
            log.error('Failed to clear snapshot:', error)
            return { success: false, errorMessage: String(error) }
        }
    }

    async exportSnapshot(): Promise<{ success: true; data: string } | { success: false; errorMessage: string }> {
        try {
            const db = await this.dbPromise
            const snapshot = await db.get(STORE_NAME, SNAPSHOT_KEY)

            if (!snapshot) {
                return { success: false, errorMessage: 'No data to export' }
            }

            const data = JSON.stringify(snapshot, null, 2)
            return { success: true, data }
        } catch (error) {
            log.error('Failed to export snapshot:', error)
            return { success: false, errorMessage: String(error) }
        }
    }

    async importSnapshot(jsonData: string): Promise<PersistenceResult> {
        try {
            const snapshot = JSON.parse(jsonData) as StoreSnapshot

            // Validate snapshot structure
            if (!snapshot.meta || typeof snapshot.meta.schemaVersion !== 'number') {
                return { success: false, errorMessage: 'Invalid snapshot format: missing or invalid meta.schemaVersion' }
            }

            if (!Array.isArray(snapshot.projects) || !Array.isArray(snapshot.areas) || !Array.isArray(snapshot.cells)) {
                return { success: false, errorMessage: 'Invalid snapshot format: missing required arrays' }
            }

            // Store the imported snapshot
            const db = await this.dbPromise
            await db.put(STORE_NAME, snapshot, SNAPSHOT_KEY)

            log.info('Successfully imported snapshot', { schemaVersion: snapshot.meta.schemaVersion })
            return { success: true }
        } catch (error) {
            log.error('Failed to import snapshot:', error)
            return { success: false, errorMessage: String(error) }
        }
    }

    async clearAllData(): Promise<PersistenceResult> {
        try {
            const db = await this.dbPromise
            await db.clear(STORE_NAME)
            log.info('Successfully cleared all data')
            return { success: true }
        } catch (error) {
            log.error('Failed to clear all data:', error)
            return { success: false, errorMessage: String(error) }
        }
    }
}

export const persistenceService = new IndexedDbService()
