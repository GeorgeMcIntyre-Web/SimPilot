/**
 * Last-Seen Tracker
 * Updates lastSeenImportRunId for entities referenced in imports
 */

import { coreStore } from '../domain/coreStore'
import { log } from '../lib/log'
import type { ApplyResult } from './applyIngestedData'

/**
 * Update lastSeenImportRunId for all entities referenced in this import.
 *
 * This function:
 * - Extracts all unique station numbers, tool IDs, and robot IDs from the import
 * - Matches them against existing Registry records
 * - Updates the lastSeenImportRunId field for matched entities
 *
 * Entities NOT in the Excel file will keep their previous lastSeenImportRunId unchanged.
 */
export function updateLastSeenForEntities(
    applyResult: ApplyResult,
    importRunId: string
): void {
    const state = coreStore.getState()

    // Extract all unique station identifiers from cells
    const stationKeys = new Set<string>()
    for (const cell of applyResult.cells) {
        if (cell.stationId) {
            stationKeys.add(cell.stationId)
        }
        if (cell.code) {
            stationKeys.add(cell.code)
        }
    }

    // Extract all tool identifiers from tools
    const toolKeys = new Set<string>()
    for (const tool of applyResult.tools) {
        if (tool.id) {
            toolKeys.add(tool.id)
        }
        if (tool.name) {
            toolKeys.add(tool.name)
        }
    }

    // Extract all robot identifiers from robots
    const robotKeys = new Set<string>()
    for (const robot of applyResult.robots) {
        if (robot.id) {
            robotKeys.add(robot.id)
        }
        if (robot.name) {
            robotKeys.add(robot.name)
        }
    }

    // Update StationRecords
    const updatedStations = state.stationRecords.map(record => {
        // Check if this station was referenced in the import
        const wasReferenced = stationKeys.has(record.key) ||
            (record.labels.fullLabel && stationKeys.has(record.labels.fullLabel)) ||
            (record.labels.stationNo && stationKeys.has(record.labels.stationNo))

        if (wasReferenced) {
            return {
                ...record,
                lastSeenImportRunId: importRunId,
                updatedAt: new Date().toISOString()
            }
        }
        return record
    })

    // Update ToolRecords
    const updatedTools = state.toolRecords.map(record => {
        // Check if this tool was referenced in the import
        const wasReferenced = toolKeys.has(record.key) ||
            (record.labels.toolCode && toolKeys.has(record.labels.toolCode)) ||
            (record.labels.toolName && toolKeys.has(record.labels.toolName))

        if (wasReferenced) {
            return {
                ...record,
                lastSeenImportRunId: importRunId,
                updatedAt: new Date().toISOString()
            }
        }
        return record
    })

    // Update RobotRecords
    const updatedRobots = state.robotRecords.map(record => {
        // Check if this robot was referenced in the import
        const wasReferenced = robotKeys.has(record.key) ||
            (record.labels.robotCaption && robotKeys.has(record.labels.robotCaption)) ||
            (record.labels.robotName && robotKeys.has(record.labels.robotName))

        if (wasReferenced) {
            return {
                ...record,
                lastSeenImportRunId: importRunId,
                updatedAt: new Date().toISOString()
            }
        }
        return record
    })

    // Apply updates to store
    if (updatedStations.length > 0) {
        coreStore.upsertStationRecords(updatedStations)
    }
    if (updatedTools.length > 0) {
        coreStore.upsertToolRecords(updatedTools)
    }
    if (updatedRobots.length > 0) {
        coreStore.upsertRobotRecords(updatedRobots)
    }

    log.info(`[Last-Seen Tracking] Updated ImportRun ${importRunId}`)
}
