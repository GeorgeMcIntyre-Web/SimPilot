// Run Ingestion
// Wrapper/delegator for the ingestion coordinator
// This file provides a simple interface that delegates to the full ingestion coordinator

import {
    ingestFiles as ingestFilesCoordinator,
    type IngestFilesInput as IngestFilesInputCoordinator
} from './ingestionCoordinator'
import type { IngestionWarning } from '../domain/core'

// Re-export types for backward compatibility
export type { IngestionWarning } from '../domain/core'

export interface IngestFilesInput {
    simulationFiles: File[];
    equipmentFiles: File[];
}

export interface IngestFilesResult {
    projectsCount: number;
    areasCount: number;
    cellsCount: number;
    robotsCount: number;
    toolsCount: number;
    warnings: IngestionWarning[];
}

/**
 * Ingest files using the full ingestion coordinator.
 * 
 * This function delegates to the ingestionCoordinator which provides:
 * - Sheet detection using the Sheet Sniffer
 * - Routing to appropriate parsers (SimulationStatus, RobotList, ToolList)
 * - Intelligent entity linking
 * - Store updates
 * 
 * @param input - Files to ingest (simulation and equipment files)
 * @returns Result with entity counts and warnings
 */
export async function ingestFiles(input: IngestFilesInput): Promise<IngestFilesResult> {
    // Delegate to the real ingestion coordinator
    const coordinatorInput: IngestFilesInputCoordinator = {
        simulationFiles: input.simulationFiles,
        equipmentFiles: input.equipmentFiles
    }

    const result = await ingestFilesCoordinator(coordinatorInput)

    // Map coordinator result to this interface
    return {
        projectsCount: result.projectsCount,
        areasCount: result.areasCount,
        cellsCount: result.cellsCount,
        robotsCount: result.robotsCount,
        toolsCount: result.toolsCount,
        warnings: result.warnings
    }
}
