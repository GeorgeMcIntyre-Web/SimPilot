import { useEffect, useRef } from 'react'
import { coreStore } from '../domain/coreStore'
import { persistenceService } from './indexedDbService'
import { useGlobalBusy } from '../ui/GlobalBusyContext'
import { setCrossRefData } from '../hooks/useCrossRefData'
import { buildCrossRef, SimulationStatusSnapshot, ToolSnapshot, RobotSnapshot, normalizeStationId } from '../domain/crossRef'
import { syncSimulationStore } from '../features/simulation'
import { syncSimPilotStoreFromLocalData } from '../domain/simPilotSnapshotBuilder'
import { log } from '../lib/log'

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

    // Map cells by id for reliable robot -> station matching
    const cellById = new Map<string, typeof state.cells[number]>()
    state.cells.forEach(cell => {
        if (cell.id) {
            cellById.set(cell.id, cell)
        }
    })

    // Convert Cells to SimulationStatusSnapshot
    const simulationStatusRows: SimulationStatusSnapshot[] = state.cells.map(cell => ({
        stationKey: normalizeStationId(cell.code) || cell.code,
        areaKey: areaIdToName.get(cell.areaId) || cell.areaId,
        lineCode: cell.lineCode,
        application: cell.simulation?.application || (cell as any).application || (cell.metadata as any)?.application,
        hasIssues: cell.simulation?.hasIssues,
        firstStageCompletion: cell.simulation?.percentComplete,
        finalDeliverablesCompletion: cell.simulation?.percentComplete,
        dcsConfigured: undefined,
        engineer: cell.assignedEngineer,
        raw: cell
    }))

    // Convert Tools to ToolSnapshot
    const tools = state.assets.filter(a => a.kind !== 'ROBOT')
    const toolingRows: ToolSnapshot[] = tools.map(tool => {
        const matchingCell = tool.cellId ? cellById.get(tool.cellId) : undefined
        const stationKeyFromCell = matchingCell ? (normalizeStationId(matchingCell.code) || matchingCell.code) : ''
        const stationKeyFallback =
            normalizeStationId(tool.stationNumber || '') ||
            tool.stationNumber ||
            normalizeStationId(tool.metadata?.stationCode || '') ||
            (tool.metadata?.stationCode as string) ||
            ''

        return {
            stationKey: stationKeyFromCell || stationKeyFallback,
            areaKey: matchingCell?.areaId ? (areaIdToName.get(matchingCell.areaId) || matchingCell.areaId) : (tool.areaName || ''),
            toolId: tool.id,
            simLeader: undefined,
            simEmployee: undefined,
            teamLeader: undefined,
            simDueDate: undefined,
            toolType: tool.kind,
            raw: tool as unknown as Record<string, unknown>
        }
    })

    // Convert Robots to RobotSnapshot
    const robots = state.assets.filter(a => a.kind === 'ROBOT')
    const robotSpecsRows: RobotSnapshot[] = robots.map(robot => {
        const matchingCell = robot.cellId ? cellById.get(robot.cellId) : undefined
        const stationKeyFromCell = matchingCell ? (normalizeStationId(matchingCell.code) || matchingCell.code) : ''
        const stationKeyFallback =
            normalizeStationId(robot.stationNumber || '') ||
            robot.stationNumber ||
            normalizeStationId(robot.metadata?.stationCode || '') ||
            (robot.metadata?.stationCode as string) ||
            ''

        return {
            stationKey: stationKeyFromCell || stationKeyFallback,
            robotKey: robot.id,
            caption: robot.name,
            eNumber: undefined,
            hasDressPackInfo: false,
            oemModel: robot.oemModel,
            raw: robot as unknown as Record<string, unknown>
        }
    })

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
                    log.info('Restoring snapshot from', result.snapshot.meta.lastSavedAt)
                    coreStore.loadSnapshot(result.snapshot)

                    // Keep the simulation store in sync with the restored core store data
                    syncSimulationStore()

                    // Rebuild CrossRef data from restored coreStore
                    log.debug('[PersistenceManager] Rebuilding CrossRef data from persisted state')
                    const crossRefInput = buildCrossRefFromCoreStore()
                    const crossRefResult = buildCrossRef(crossRefInput)
                    setCrossRefData(crossRefResult)
                    log.debug('[PersistenceManager] CrossRef data rebuilt:', {
                        cells: crossRefResult.cells.length,
                        areas: crossRefResult.cells.map(c => c.areaKey).filter((v, i, a) => a.indexOf(v) === i)
                    })

                    // Rebuild SimPilot store (including bottleneck data) from persisted coreStore
                    syncSimPilotStoreFromLocalData()
                    log.debug('[PersistenceManager] SimPilot store synced from persisted data')
                }
            } catch (err) {
                log.error('Failed to load persistence:', err)
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
                    log.info('Session saved automatically')
                } catch (err) {
                    log.error('Failed to auto-save:', err)
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
