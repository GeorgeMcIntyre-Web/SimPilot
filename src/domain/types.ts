export type UserRole =
    | 'SIM_MANAGER'
    | 'SIM_ENGINEER'
    | 'VIEWER'

export type User = {
    id: string
    name: string
    email: string
    role: UserRole
}

export type ProjectStatus =
    | 'PLANNING'
    | 'ACTIVE'
    | 'ON_HOLD'
    | 'COMPLETED'

export type CellStatus =
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'BLOCKED'
    | 'READY_FOR_APPROVAL'
    | 'APPROVED'

export type Project = {
    id: string
    name: string
    OEM: string
    model: string
    status: ProjectStatus
    createdAt: string
    updatedAt: string
}

export type Area = {
    id: string
    projectId: string
    name: string
    sortOrder: number
}

export type Cell = {
    id: string
    areaId: string
    name: string
    status: CellStatus
    responsibleUserId: string | null
    notes: string
    createdAt: string
    updatedAt: string
}

export type ChecklistPhase =
    | 'PRE_SIM'
    | 'FULL_SIM'
    | 'OLP_MRS'

export type ChecklistTemplate = {
    id: string
    name: string
    description: string
    phase: ChecklistPhase
    isActive: boolean
}

export type ChecklistItemTemplate = {
    id: string
    templateId: string
    label: string
    isMandatory: boolean
    sortOrder: number
}

export type ChecklistStatus =
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'BLOCKED'
    | 'COMPLETED'

export type ChecklistItemStatus =
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'DONE'
    | 'NA'

export type Checklist = {
    id: string
    cellId: string
    templateId: string
    status: ChecklistStatus
    ownerUserId: string
    createdAt: string
    updatedAt: string
}

export type ChecklistItem = {
    id: string
    checklistId: string
    templateItemId: string
    status: ChecklistItemStatus
    comment: string
    updatedAt: string
}

export type ChangeLogEntry = {
    id: string
    cellId: string
    userId: string
    createdAt: string
    text: string
}

// --- PHASE 2: EQUIPMENT & WELD MANAGEMENT ---

export * from './UnifiedModel'

import { UnifiedAsset } from './UnifiedModel'

// Legacy types for backward compatibility (mapped to UnifiedAsset)
export type Robot = UnifiedAsset & {
    kind: 'ROBOT'
    toolIds: string[]
}
export type WeldGun = UnifiedAsset & { kind: 'GUN' }
export type Stand = UnifiedAsset & { kind: 'OTHER' } // Mapped to OTHER in Phase 2

export type RobotGunAssignment = {
    id: string
    robotId: string
    weldGunId: string
    areaId: string
    cellId: string | null
    stationNumber: string
    fromDate: string | null
    toDate: string | null
    isActive: boolean
}

export type GunCheckStatus = {
    id: string
    robotGunAssignmentId: string
    geometryOk: boolean
    payloadOk: boolean
    forceOk: boolean
    approvedAt: string | null
    approvedByUserId: string | null
    comments: string
}

export type StandType = 'GUN_STAND' | 'TIP_DRESSER'

export type SpotWeldRef = {
    id: string
    weldId: string            // weld number / name
    areaId: string
    stationNumber: string
    robotId: string | null
    weldGunId: string | null
    cellId: string | null
    notes: string
}
