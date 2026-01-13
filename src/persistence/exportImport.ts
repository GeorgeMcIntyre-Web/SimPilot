import { persistenceService } from './indexedDbService'
import { log } from '../lib/log'

/**
 * Downloads the current store snapshot as a JSON file.
 * Creates a timestamped filename for easy identification.
 */
export async function downloadSnapshot(): Promise<{ success: boolean; errorMessage?: string }> {
    try {
        const result = await persistenceService.exportSnapshot()

        if (!result.success) {
            return { success: false, errorMessage: result.errorMessage }
        }

        // Create a blob and download link
        const blob = new Blob([result.data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const filename = `simpilot-snapshot-${timestamp}.json`

        // Trigger download
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        log.info('Snapshot downloaded successfully', { filename })
        return { success: true }
    } catch (error) {
        log.error('Failed to download snapshot:', error)
        return { success: false, errorMessage: String(error) }
    }
}

/**
 * Prompts user to select a JSON file and imports it as the current snapshot.
 * Validates the file format before importing.
 */
export async function uploadSnapshot(): Promise<{ success: boolean; errorMessage?: string; requiresReload?: boolean }> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,application/json'

        input.onchange = async (e) => {
            try {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) {
                    resolve({ success: false, errorMessage: 'No file selected' })
                    return
                }

                const text = await file.text()
                const result = await persistenceService.importSnapshot(text)

                if (result.success) {
                    log.info('Snapshot imported successfully', { filename: file.name })
                    resolve({ success: true, requiresReload: true })
                } else {
                    resolve({ success: false, errorMessage: result.errorMessage })
                }
            } catch (error) {
                log.error('Failed to upload snapshot:', error)
                resolve({ success: false, errorMessage: String(error) })
            }
        }

        input.oncancel = () => {
            resolve({ success: false, errorMessage: 'File selection cancelled' })
        }

        input.click()
    })
}

/**
 * Clears all persisted data from IndexedDB.
 * Should only be called after user confirmation.
 */
export async function clearAllData(): Promise<{ success: boolean; errorMessage?: string }> {
    try {
        const result = await persistenceService.clearAllData()

        if (result.success) {
            log.info('All data cleared successfully')
            return { success: true }
        } else {
            return { success: false, errorMessage: result.errorMessage }
        }
    } catch (error) {
        log.error('Failed to clear all data:', error)
        return { success: false, errorMessage: String(error) }
    }
}
