import { Project, Area, Cell, Robot, Tool, UnifiedAsset } from './core'
import { CoreStoreState } from './coreStore'
import { ChangeRecord } from './changeLog'
import { StationRecord, ToolRecord, RobotRecord, AliasRule, ImportRun, DiffResult } from './uidTypes'
import { AuditEntry } from './auditLog'
import { CrossRefResult } from './crossRef/CrossRefTypes'

export const CURRENT_SNAPSHOT_SCHEMA_VERSION = 4

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
    assets: UnifiedAsset[]
    // Legacy fields for backward compatibility
    robots?: Robot[]
    tools?: Tool[]
    warnings: string[] // Note: coreStore uses string[] for warnings, not IngestionWarning[]
    changeLog: ChangeRecord[]
    referenceData?: {
        employees: { id: string; name: string; role?: string; department?: string }[]
        suppliers: { id: string; name: string; contact?: string }[]
    }
    // Schema v3: UID-backed linking collections
    stationRecords?: StationRecord[]
    toolRecords?: ToolRecord[]
    robotRecords?: RobotRecord[]
    aliasRules?: AliasRule[]
    importRuns?: ImportRun[]
    diffResults?: DiffResult[]
    auditLog?: AuditEntry[]  // Phase 1: Registry audit trail
    /** Optional persisted cross-reference snapshot for fast restore */
    crossRef?: CrossRefResult
}

/**
 * Creates a snapshot from the current store state.
 */
export function createSnapshotFromState(
    state: CoreStoreState,
    metaInput: Partial<StoreSnapshotMeta>,
    crossRef?: CrossRefResult
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
        assets: state.assets,
        warnings: state.warnings,
        changeLog: state.changeLog,
        referenceData: state.referenceData,
        // Schema v3 collections
        stationRecords: state.stationRecords,
        toolRecords: state.toolRecords,
        robotRecords: state.robotRecords,
        aliasRules: state.aliasRules,
        importRuns: state.importRuns,
        diffResults: state.diffResults,
        auditLog: state.auditLog,
        crossRef
    }
}

/**
 * Converts a snapshot back into a store state object.
 * Handles migration from v2 -> v3 by initializing new collections as empty.
 */
export function applySnapshotToState(snapshot: StoreSnapshot): CoreStoreState {
    // Map sourceKind to dataSource format
    const dataSource: CoreStoreState['dataSource'] =
        snapshot.meta.sourceKind === 'demo' ? 'Demo' :
            snapshot.meta.sourceKind === 'local' ? 'Local' :
                snapshot.meta.sourceKind === 'ms365' ? 'MS365' :
                    null

    // Handle legacy snapshots that have robots/tools but no assets
    const assets = snapshot.assets || [
        ...(snapshot.robots || []),
        ...(snapshot.tools || [])
    ]

    // Schema v2 -> v3 migration: Initialize new collections as empty arrays
    const stationRecords = snapshot.stationRecords || []
    const toolRecords = snapshot.toolRecords || []
    const robotRecords = snapshot.robotRecords || []
    const aliasRules = snapshot.aliasRules || []
    const importRuns = snapshot.importRuns || []  // ImportRun.modelKey added in v3 (optional field, backward compatible)
    const diffResults = snapshot.diffResults || []
    const auditLog = snapshot.auditLog || []  // Phase 1 migration

    return {
        projects: snapshot.projects,
        areas: snapshot.areas,
        cells: snapshot.cells,
        assets,
        warnings: snapshot.warnings,
        changeLog: snapshot.changeLog,
        lastUpdated: snapshot.meta.lastSavedAt,
        dataSource,
        referenceData: snapshot.referenceData || { employees: [], suppliers: [] },
        stationRecords,
        toolRecords,
        robotRecords,
        aliasRules,
        importRuns,
        diffResults,
        auditLog
    }
}
