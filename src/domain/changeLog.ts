export type ChangeKind = 'cellEngineerAssignment'

export interface BaseChange {
    id: string
    kind: ChangeKind
    createdAt: string
    createdBy?: string
    sourceSessionId?: string
}

export interface CellEngineerAssignmentChange extends BaseChange {
    kind: 'cellEngineerAssignment'
    cellId: string
    previousEngineer?: string
    newEngineer?: string
    projectId?: string
    areaId?: string
}

export type ChangeRecord = CellEngineerAssignmentChange

export interface ChangeLogState {
    changes: ChangeRecord[]
}

/**
 * Generate a unique ID for a change record
 */
export function generateChangeId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

/**
 * Create a new cell engineer assignment change record
 */
export function createCellEngineerAssignmentChange(
    cellId: string,
    previousEngineer: string | undefined,
    newEngineer: string | undefined,
    projectId?: string,
    areaId?: string
): CellEngineerAssignmentChange {
    return {
        id: generateChangeId(),
        kind: 'cellEngineerAssignment',
        createdAt: new Date().toISOString(),
        cellId,
        previousEngineer,
        newEngineer,
        projectId,
        areaId
    }
}

/**
 * Generate a human-readable summary of a change
 */
export function summarizeChange(change: ChangeRecord): string {
    if (change.kind === 'cellEngineerAssignment') {
        const prev = change.previousEngineer || 'Unassigned'
        const next = change.newEngineer || 'Unassigned'
        return `Cell ${change.cellId}: engineer ${prev} -> ${next}`
    }
    return 'Unknown change'
}
