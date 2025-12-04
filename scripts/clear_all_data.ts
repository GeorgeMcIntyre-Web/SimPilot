/**
 * Clear All Local Data Script
 *
 * This script clears ALL local data from the application:
 * - IndexedDB (SimPilotDB)
 * - localStorage
 * - coreStore in-memory state
 */

import { openDB } from 'idb'

const DB_NAME = 'SimPilotDB'

async function clearIndexedDB(): Promise<void> {
    console.log('🗑️  Clearing IndexedDB...')
    try {
        // Delete the entire database
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(DB_NAME)
            request.onsuccess = () => {
                console.log('✅ IndexedDB cleared successfully')
                resolve()
            }
            request.onerror = () => {
                console.error('❌ Failed to clear IndexedDB:', request.error)
                reject(request.error)
            }
            request.onblocked = () => {
                console.warn('⚠️  IndexedDB deletion blocked (close all tabs using the DB)')
            }
        })
    } catch (error) {
        console.error('❌ Error clearing IndexedDB:', error)
        throw error
    }
}

function clearLocalStorage(): void {
    console.log('🗑️  Clearing localStorage...')
    try {
        const keysToRemove: string[] = []

        // Collect all keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key) {
                keysToRemove.push(key)
            }
        }

        // Remove all keys
        keysToRemove.forEach(key => localStorage.removeItem(key))

        console.log(`✅ localStorage cleared (${keysToRemove.length} items removed)`)
        console.log(`   Removed keys: ${keysToRemove.join(', ')}`)
    } catch (error) {
        console.error('❌ Error clearing localStorage:', error)
        throw error
    }
}

async function main() {
    console.log('🚀 Starting complete data cleanup...\n')

    try {
        // Clear IndexedDB
        await clearIndexedDB()

        // Clear localStorage
        clearLocalStorage()

        console.log('\n✅ All local data has been cleared!')
        console.log('\nNext steps:')
        console.log('1. Reload the application')
        console.log('2. The coreStore will be empty until new data is loaded')
        console.log('3. Load new data via the Data Loader page or by running ingestion scripts')

    } catch (error) {
        console.error('\n❌ Data cleanup failed:', error)
        process.exit(1)
    }
}

main().catch(console.error)
