import { useEffect, useRef } from 'react'
import { coreStore } from '../domain/coreStore'
import { persistenceService } from './indexedDbService'
import { useGlobalBusy } from '../ui/GlobalBusyContext'

const SAVE_DEBOUNCE_MS = 2000

export function PersistenceManager() {
    const { pushBusy, popBusy } = useGlobalBusy()
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isLoadedRef = useRef(false)

    // Load on mount
    useEffect(() => {
        async function load() {
            if (isLoadedRef.current) return

            try {
                pushBusy('Restoring session...')
                const result = await persistenceService.load()

                if (result.success && result.snapshot) {
                    console.log('Restoring snapshot from', result.snapshot.meta.lastSavedAt)
                    coreStore.loadSnapshot(result.snapshot)
                }
            } catch (err) {
                console.error('Failed to load persistence:', err)
            } finally {
                isLoadedRef.current = true
                popBusy()
            }
        }

        load()
    }, [pushBusy, popBusy])

    // Subscribe to changes and auto-save
    useEffect(() => {
        const unsubscribe = coreStore.subscribe(() => {
            if (!isLoadedRef.current) return // Don't save before initial load is done

            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }

            saveTimeoutRef.current = setTimeout(async () => {
                try {
                    const snapshot = coreStore.getSnapshot()
                    await persistenceService.save(snapshot)
                    console.log('Session saved automatically')
                } catch (err) {
                    console.error('Failed to auto-save:', err)
                }
            }, SAVE_DEBOUNCE_MS)
        })

        return () => {
            unsubscribe()
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    return null // Headless component
}
