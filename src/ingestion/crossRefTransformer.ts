/**
 * CrossRef Transformer
 * Converts ApplyResult to CrossRefInput format for dashboard consumption
 */

import { coreStore } from '../domain/coreStore'
import { Area, Cell, Robot, Tool } from '../domain/core'
import { log } from '../lib/log'
import type { ApplyResult } from './applyIngestedData'
import type { CrossRefInput, SimulationStatusSnapshot, ToolSnapshot, RobotSnapshot } from '../domain/crossRef/CrossRefTypes'
import type { SimulationRobot, VacuumParsedRow } from './simulationStatusParser'
import { convertVacuumRowsToPanelMilestones } from './simulationStatusParser'
import { calculateOverallCompletion, PanelMilestones } from './simulationStatus/simulationStatusTypes'
import { normalizeStationId } from '../domain/crossRef/CrossRefUtils'

/**
 * Convert ApplyResult to CrossRefInput format for dashboard consumption.
 *
 * IMPORTANT: This function merges BOTH the newly ingested data (applyResult) AND
 * existing data from coreStore to ensure complete linking across multiple file loads.
 * This allows equipment loaded before simulation status to be properly linked when
 * simulation status is loaded later (and vice versa).
 *
 * @param applyResult - The result from applyIngestedData
 * @param simulationRobots - Optional robots extracted from simulation status (station+robot combinations)
 * @param vacuumRows - Optional vacuum-parsed rows for panel milestone extraction
 */
export function buildCrossRefInputFromApplyResult(
    applyResult: ApplyResult,
    simulationRobots?: SimulationRobot[],
    vacuumRows?: VacuumParsedRow[]
): CrossRefInput {
    // Get existing data from the store to merge with new data
    const existingState = coreStore.getState()

    // Merge areas: combine existing + new, deduplicate by ID
    const allAreasMap = new Map<string, Area>()
    existingState.areas.forEach(area => allAreasMap.set(area.id, area))
    applyResult.areas.forEach(area => allAreasMap.set(area.id, area)) // New data overwrites
    const allAreas = Array.from(allAreasMap.values())

    // Merge cells: combine existing + new, deduplicate by ID
    const allCellsMap = new Map<string, Cell>()
    existingState.cells.forEach(cell => allCellsMap.set(cell.id, cell))
    applyResult.cells.forEach(cell => allCellsMap.set(cell.id, cell)) // New data overwrites
    const allCells = Array.from(allCellsMap.values())

    // Merge robots: combine existing + new, deduplicate by ID
    const existingRobots = existingState.assets.filter(a => a.kind === 'ROBOT') as unknown as Robot[]
    const allRobotsMap = new Map<string, Robot>()
    existingRobots.forEach(robot => allRobotsMap.set(robot.id, robot))
    applyResult.robots.forEach(robot => allRobotsMap.set(robot.id, robot)) // New data overwrites
    const allRobots = Array.from(allRobotsMap.values())

    // Merge tools: combine existing + new, deduplicate by ID
    const existingTools = existingState.assets.filter(a => a.kind !== 'ROBOT') as unknown as Tool[]
    const allToolsMap = new Map<string, Tool>()
    existingTools.forEach(tool => allToolsMap.set(tool.id, tool))
    applyResult.tools.forEach(tool => allToolsMap.set(tool.id, tool)) // New data overwrites
    const allTools = Array.from(allToolsMap.values())

    log.debug('[CrossRef] Merging data for CrossRef input:', {
        existingCells: existingState.cells.length,
        newCells: applyResult.cells.length,
        mergedCells: allCells.length,
        existingRobots: existingRobots.length,
        newRobots: applyResult.robots.length,
        mergedRobots: allRobots.length,
        existingTools: existingTools.length,
        newTools: applyResult.tools.length,
        mergedTools: allTools.length
    })

    // Build area ID to name mapping from merged areas
    const areaIdToName = new Map<string, string>()
    allAreas.forEach(area => {
        areaIdToName.set(area.id, area.name)
    })

    // Build panel milestones map from vacuum rows (if available)
    const panelMilestonesMap = vacuumRows && vacuumRows.length > 0
        ? convertVacuumRowsToPanelMilestones(vacuumRows)
        : new Map<string, PanelMilestones>()

    // Add normalized station keys to improve matching (handles hyphen vs underscore, leading zeros)
    if (panelMilestonesMap.size > 0) {
        for (const [key, value] of Array.from(panelMilestonesMap.entries())) {
            const normalized = normalizeStationId(key)
            if (normalized && normalized !== key && !panelMilestonesMap.has(normalized)) {
                panelMilestonesMap.set(normalized, value)
            }
        }
    }

    if (panelMilestonesMap.size > 0) {
        console.log('[SimStatus][SIMULATION] Step 8: Panel milestones normalized', {
            totalKeys: panelMilestonesMap.size,
            sampleKeys: [...panelMilestonesMap.keys()].slice(0, 5)
        })
    }

    if (panelMilestonesMap.size > 0) {
        log.debug('[CrossRef] Panel milestones map built:', {
            size: panelMilestonesMap.size,
            sampleKeys: [...panelMilestonesMap.keys()].slice(0, 5)
        })
    }

    // Convert Cells to SimulationStatusSnapshot (using merged cells)
    const simulationStatusRows: SimulationStatusSnapshot[] = allCells.map(cell => {
        // Try to find panel milestones for this cell using multiple key formats
        // The vacuum parser uses stationKey like "8Y-020", but cells might have different formats
        let panelMilestones = panelMilestonesMap.get(cell.code)

        // If not found, try with stationId (which might have a different format)
        if (!panelMilestones && cell.stationId) {
            panelMilestones = panelMilestonesMap.get(cell.stationId)
        }

        // Try normalized keys (handles hyphens/underscores/leading zeros)
        if (!panelMilestones) {
            const normalizedCode = normalizeStationId(cell.code)
            if (normalizedCode) {
                panelMilestones = panelMilestonesMap.get(normalizedCode)
            }
        }
        if (!panelMilestones && cell.stationId) {
            const normalizedStationId = normalizeStationId(cell.stationId)
            if (normalizedStationId) {
                panelMilestones = panelMilestonesMap.get(normalizedStationId)
            }
        }

        // If still not found, try to find a key that contains or matches the cell code
        if (!panelMilestones && panelMilestonesMap.size > 0) {
            // Try case-insensitive match
            const cellCodeUpper = cell.code.toUpperCase()
            for (const [key, value] of panelMilestonesMap) {
                if (key.toUpperCase() === cellCodeUpper) {
                    panelMilestones = value
                    break
                }
            }
        }

        // Build per-robot panel milestones if robots are known
        let robotPanelMilestones: Record<string, PanelMilestones> | undefined
        if (panelMilestonesMap.size > 0) {
            robotPanelMilestones = {}

            // First, attach for known robots
            if (cell.robots && cell.robots.length > 0) {
                for (const robot of cell.robots) {
                    const robotCaption = robot.caption || robot.robotKey
                    if (!robotCaption) continue
                    const key = `${cell.code}::${robotCaption}`
                    const panels = panelMilestonesMap.get(key)
                    if (panels) {
                        robotPanelMilestones[robotCaption] = panels
                    }
                }
            }

            // Also attach any robot panels that match this station even if robot not in list
            const prefix = `${cell.code}::`.toUpperCase()
            for (const [key, panels] of panelMilestonesMap) {
                const upperKey = key.toUpperCase()
                if (upperKey.startsWith(prefix)) {
                    const robotCaption = key.split('::', 2)[1]
                    if (robotCaption) {
                        robotPanelMilestones[robotCaption] = panels
                    }
                }
            }

            if (Object.keys(robotPanelMilestones).length === 0) {
                robotPanelMilestones = undefined
            }
        }

        // Calculate overall completion from panel milestones
        let overallCompletion: number | undefined
        if (robotPanelMilestones) {
            // Average the per-robot overall completions
            const robotCompletions: number[] = []
            for (const panels of Object.values(robotPanelMilestones)) {
                const c = calculateOverallCompletion(panels)
                if (c !== null) robotCompletions.push(c)
            }
            overallCompletion = robotCompletions.length > 0
                ? Math.round(robotCompletions.reduce((s, v) => s + v, 0) / robotCompletions.length)
                : undefined
        } else if (panelMilestones) {
            const c = calculateOverallCompletion(panelMilestones)
            overallCompletion = c !== null ? c : undefined
        }

        // Build readiness metrics per cell from panel milestones (for area rollups)
        const readinessMetrics: Record<string, number | undefined> = {}
        const pm = panelMilestones
        const pct = (group?: { completion: number; milestones?: Record<string, any> }) => {
            if (!group) return undefined
            if (typeof group.completion === 'number') return group.completion
            const values = group.milestones ? Object.values(group.milestones).filter(v => typeof v === 'number') as number[] : []
            if (values.length === 0) return undefined
            const completed = values.filter(v => v === 100).length
            return Math.round((completed / values.length) * 100)
        }
        readinessMetrics['ROBOT SIMULATION'] = pct(pm?.robotSimulation)
        readinessMetrics['JOINING'] = pct(pm?.alternativeJoining) ?? pct(pm?.spotWelding)
        readinessMetrics['GRIPPER'] = pct(pm?.gripper)
        readinessMetrics['FIXTURE'] = pct(pm?.fixture)
        readinessMetrics['DOCUMENTATION'] = pct(pm?.documentation)
        readinessMetrics['MRS'] = pct(pm?.mrs)
        readinessMetrics['OLP'] = pct(pm?.olp)
        readinessMetrics['SAFETY'] = pct(pm?.safety)
        readinessMetrics['CABLE & HOSE LENGTH'] = undefined // not available in milestones
        readinessMetrics['LAYOUT'] = pct(pm?.layout)
        readinessMetrics['1st STAGE SIM COMPLETION'] = overallCompletion ?? cell.simulation?.percentComplete
        readinessMetrics['VC READY'] = overallCompletion ?? cell.simulation?.percentComplete
        readinessMetrics['FINAL DELIVERABLES COMPLETION'] = cell.simulation?.percentComplete

        // Merge with raw simulation metrics
        const mergedMetrics = {
            ...(cell.simulation?.metrics ?? {}),
            ...readinessMetrics
        }

        return {
            stationKey: cell.code,
            areaKey: areaIdToName.get(cell.areaId) || cell.areaId,
            lineCode: cell.lineCode,
            application: cell.simulation?.application,
            metrics: mergedMetrics,
            hasIssues: cell.simulation?.hasIssues,
            firstStageCompletion: overallCompletion ?? cell.simulation?.percentComplete,
            finalDeliverablesCompletion: cell.simulation?.percentComplete,
            dcsConfigured: undefined,
            engineer: cell.assignedEngineer,
            panelMilestones,
            robotPanelMilestones,
            raw: cell
        }
    })

    // Log panel milestones attachment stats
    if (panelMilestonesMap.size > 0) {
        const withMilestones = simulationStatusRows.filter(r => r.panelMilestones !== undefined).length
        log.debug('[CrossRef] Panel milestones attached to cells:', {
            totalCells: simulationStatusRows.length,
            cellsWithMilestones: withMilestones,
            cellsWithoutMilestones: simulationStatusRows.length - withMilestones
        })

        console.log('[SimStatus][SIMULATION] Step 9: Panel milestones attached to cells', {
            totalCells: simulationStatusRows.length,
            cellsWithMilestones: withMilestones,
            cellsWithoutMilestones: simulationStatusRows.length - withMilestones
        })
    }

    // Convert Tools to ToolSnapshot (using merged tools)
    const toolingRows: ToolSnapshot[] = allTools.map(tool => ({
        stationKey: tool.stationNumber || '',
        areaKey: tool.areaName,
        toolId: tool.id,
        simLeader: undefined, // Not in Tool type
        simEmployee: undefined,
        teamLeader: undefined,
        simDueDate: undefined,
        toolType: tool.kind,
        raw: tool
    }))

    // Convert Robots from robot list files to RobotSnapshot (using merged robots)
    const robotSpecsRows: RobotSnapshot[] = allRobots.map(robot => ({
        stationKey: robot.stationNumber || '',
        robotKey: robot.id,
        caption: robot.name,
        eNumber: undefined, // Not in Robot type
        hasDressPackInfo: false, // Would need to check metadata
        oemModel: robot.oemModel,
        raw: robot
    }))

    // Also add robots extracted from simulation status
    // These represent station+robot combinations found in the simulation status file
    // One station can have multiple robots, so this is the authoritative source for robot counts
    if (simulationRobots && simulationRobots.length > 0) {
        // Track which station+robot combinations we've already added from robot specs
        const existingCombinations = new Set(
            robotSpecsRows.map(r => `${r.stationKey.toUpperCase()}::${(r.caption || '').toUpperCase()}`)
        )

        for (const simRobot of simulationRobots) {
            const stationKey = simRobot.stationKey
            const compositeKey = `${stationKey.toUpperCase()}::${simRobot.robotCaption.toUpperCase()}`

            // Skip if we already have this station+robot from robot specs
            if (existingCombinations.has(compositeKey)) {
                continue
            }

            robotSpecsRows.push({
                stationKey: stationKey,
                robotKey: `simstatus-${stationKey}-${simRobot.robotCaption}`.replace(/\s+/g, '_'),
                caption: simRobot.robotCaption,
                eNumber: undefined,
                hasDressPackInfo: false, // Not available from simulation status
                oemModel: undefined,
                raw: { source: 'simulationStatus', ...simRobot }
            })

            existingCombinations.add(compositeKey)
        }

        log.debug(`[CrossRef] Added ${simulationRobots.length} robots from simulation status`)
    }

    // Empty arrays for data types not available in ApplyResult
    const weldGunRows: any[] = []
    const gunForceRows: any[] = []
    const riserRows: any[] = []

    return {
        simulationStatusRows,
        toolingRows,
        robotSpecsRows,
        weldGunRows,
        gunForceRows,
        riserRows
    }
}
