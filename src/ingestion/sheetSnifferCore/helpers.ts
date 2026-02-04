/**
 * Sheet Sniffer Core - Helper Functions
 * Utility functions for category mapping
 */

import type { SheetCategory, FileKind } from '../sheetSnifferTypes'

/**
 * Map SheetCategory to the internal FileKind used by ingestionCoordinator.
 */
export function categoryToFileKind(category: SheetCategory): FileKind {
    switch (category) {
        case 'SIMULATION_STATUS':
            return 'SimulationStatus'
        case 'IN_HOUSE_TOOLING':
            return 'ToolList'
        case 'ASSEMBLIES_LIST':
            return 'AssembliesList'
        case 'ROBOT_SPECS':
            return 'RobotList'
        case 'REUSE_WELD_GUNS':
            return 'ToolList'
        case 'REUSE_RISERS':
            return 'ToolList'
        case 'REUSE_TIP_DRESSERS':
            return 'ToolList'
        case 'REUSE_ROBOTS':
            return 'RobotList'
        case 'GUN_FORCE':
            return 'ToolList'
        case 'METADATA':
            return 'Metadata'
        case 'UNKNOWN':
            return 'Unknown'
    }
}
