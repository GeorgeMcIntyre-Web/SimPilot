import { useState, useEffect, useCallback } from 'react'
import { simBridgeService } from './SimBridgeService'
import { SimBridgeServiceState } from './simBridgeTypes'

export interface UseSimBridgeResult {
    state: SimBridgeServiceState
    connect: () => Promise<void>
    refreshStatus: () => Promise<void>
    loadStudy: (path: string, ctx?: { projectId?: string; cellId?: string }) => Promise<void>
    getSignal: (name: string) => Promise<number | string | boolean | null>
    setSignal: (name: string, value: number | string | boolean) => Promise<void>
}

/**
 * React Hook for SimBridge
 * Provides safe access to the SimBridge service state and actions.
 */
export function useSimBridge(): UseSimBridgeResult {
    const [state, setState] = useState<SimBridgeServiceState>(simBridgeService.getState())

    // Poll for state changes or use an event emitter in the future
    // For now, we'll just wrap the actions to update local state
    // In a real app, we'd subscribe to the service

    // Simple polling to keep UI in sync with the singleton service
    useEffect(() => {
        const interval = setInterval(() => {
            const newState = simBridgeService.getState()
            // Simple equality check to avoid re-renders if nothing changed
            // JSON.stringify is cheap enough for this small state object
            setState(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(newState)) {
                    return newState
                }
                return prev
            })
        }, 1000) // Poll every second

        return () => clearInterval(interval)
    }, [])

    const connect = useCallback(async () => {
        if (state.status === 'connecting' || state.status === 'connected') return
        const newState = await simBridgeService.connect()
        setState(newState)
    }, [state.status])

    const refreshStatus = useCallback(async () => {
        const newState = await simBridgeService.refreshStatus()
        setState(newState)
    }, [])

    const loadStudy = useCallback(async (path: string, ctx?: { projectId?: string; cellId?: string }) => {
        const newState = await simBridgeService.loadStudy(path, ctx)
        setState(newState)
    }, [])

    const getSignal = useCallback(async (name: string) => {
        return await simBridgeService.getSignal(name)
    }, [])

    const setSignal = useCallback(async (name: string, value: number | string | boolean) => {
        await simBridgeService.setSignal(name, value)
    }, [])

    return {
        state,
        connect,
        refreshStatus,
        loadStudy,
        getSignal,
        setSignal
    }
}
