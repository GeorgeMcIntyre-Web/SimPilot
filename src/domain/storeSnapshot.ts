import { Project, Area, Cell, Robot, Tool } from './core'
import { CoreStoreState } from './coreStore'
import { ChangeRecord } from './changeLog'

export const CURRENT_SNAPSHOT_SCHEMA_VERSION = 1

export interface StoreSnapshotMeta {
    lastSavedAt: string // ISO string
    sourceKind: 'demo' | 'local' | 'ms365' | 'unknown'
    description?: string
    appVersion?: string
    schemaVersion: number
    simPilotInstanceId?: string
}

export interface StoreSnapshot {
    meta: StoreSnapshotMeta
    projects: Project[]
    areas: Area[]
    cells: Cell[]
    robots: Robot[]
    tools: Tool[]
    warnings: string[] // Note: coreStore uses string[] for warnings, not IngestionWarning[]
    changeLog: ChangeRecord[]
}

/**
 * Creates a snapshot from the current store state.
 */
export function createSnapshotFromState(
    state: CoreStoreState,
    metaInput: Partial<StoreSnapshotMeta>
): StoreSnapshot {
    return {
        meta: {
            lastSavedAt: new Date().toISOString(),
            sourceKind: 'unknown',
            schemaVersion: CURRENT_SNAPSHOT_SCHEMA_VERSION,
            ...metaInput
        },
        projects: state.projects,
        areas: state.areas,
        cells: state.cells,
        robots: state.robots,
        tools: state.tools,
        warnings: state.warnings,
        changeLog: state.changeLog
    }
}

/**
 * Converts a snapshot back into a store state object.
 */
export function applySnapshotToState(snapshot: StoreSnapshot): CoreStoreState {
    return {
        projects: snapshot.projects,
        areas: snapshot.areas,
        cells: snapshot.cells,
        robots: snapshot.robots,
        tools: snapshot.tools,
        warnings: snapshot.warnings,
        changeLog: snapshot.changeLog,
        lastUpdated: snapshot.meta.lastSavedAt
    }
}
