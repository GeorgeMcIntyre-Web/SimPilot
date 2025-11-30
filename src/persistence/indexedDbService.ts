import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { PersistenceService, PersistenceResult, LoadResult } from './persistenceService'
import { StoreSnapshot } from '../domain/storeSnapshot'

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
            console.error('Failed to save snapshot:', error)
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
            console.error('Failed to load snapshot:', error)
            return { success: false, errorMessage: String(error) }
        }
    }

    async clear(): Promise<PersistenceResult> {
        try {
            const db = await this.dbPromise
            await db.delete(STORE_NAME, SNAPSHOT_KEY)
            return { success: true }
        } catch (error) {
            console.error('Failed to clear snapshot:', error)
            return { success: false, errorMessage: String(error) }
        }
    }
}

export const persistenceService = new IndexedDbService()
