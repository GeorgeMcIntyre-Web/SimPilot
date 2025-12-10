import { useEffect, useRef } from 'react'
import { coreStore } from '../domain/coreStore'
import { persistenceService } from './indexedDbService'
import { useGlobalBusy } from '../ui/GlobalBusyContext'
import { setCrossRefData } from '../hooks/useCrossRefData'
import { buildCrossRef } from '../domain/crossRef/CrossRefBuilder'
import { SimulationStatusSnapshot, ToolSnapshot, RobotSnapshot } from '../domain/crossRef/CrossRefTypes'
import { normalizeStationId } from '../domain/crossRef/CrossRefUtils'

const SAVE_DEBOUNCE_MS = 2000

/**
 * Build CrossRefInput from current coreStore state
 */
function buildCrossRefFromCoreStore() {
    const state = coreStore.getState()

    // Build area ID to name mapping
    const areaIdToName = new Map<string, string>()
    state.areas.forEach(area => {
        areaIdToName.set(area.id, area.name)
    })

    // Convert Cells to SimulationStatusSnapshot
    const simulationStatusRows: SimulationStatusSnapshot[] = state.cells.map(cell => ({
        stationKey: normalizeStationId(cell.code) || cell.code,
        areaKey: areaIdToName.get(cell.areaId) || cell.areaId,
        lineCode: cell.lineCode,
        application: undefined,
        firstStageCompletion: cell.simulation?.percentComplete,
        finalDeliverablesCompletion: cell.simulation?.percentComplete,
        dcsConfigured: undefined,
        engineer: cell.assignedEngineer,
        raw: cell
    }))

    // Convert Tools to ToolSnapshot
    const tools = state.assets.filter(a => a.kind !== 'ROBOT')
    const toolingRows: ToolSnapshot[] = tools.map(tool => ({
        stationKey: normalizeStationId(tool.stationNumber || '') || tool.stationNumber || '',
        areaKey: tool.areaName || '',
        toolId: tool.id,
        simLeader: undefined,
        simEmployee: undefined,
        teamLeader: undefined,
        simDueDate: undefined,
        toolType: tool.kind,
        raw: tool
    }))

    // Convert Robots to RobotSnapshot
    const robots = state.assets.filter(a => a.kind === 'ROBOT')
    const robotSpecsRows: RobotSnapshot[] = robots.map(robot => ({
        stationKey: normalizeStationId(robot.stationNumber || '') || robot.stationNumber || '',
        robotKey: robot.id,
        caption: robot.name,
        eNumber: undefined,
        hasDressPackInfo: false,
        oemModel: robot.oemModel,
        raw: robot
    }))

    return {
        simulationStatusRows,
        toolingRows,
        robotSpecsRows,
        weldGunRows: [],
        gunForceRows: [],
        riserRows: []
    }
}

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

                    // Rebuild CrossRef data from restored coreStore
                    console.log('[PersistenceManager] Rebuilding CrossRef data from persisted state')
                    const crossRefInput = buildCrossRefFromCoreStore()
                    const crossRefResult = buildCrossRef(crossRefInput)
                    setCrossRefData(crossRefResult)
                    console.log('[PersistenceManager] CrossRef data rebuilt:', {
                        cells: crossRefResult.cells.length,
                        areas: crossRefResult.cells.map(c => c.areaKey).filter((v, i, a) => a.indexOf(v) === i)
                    })
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
