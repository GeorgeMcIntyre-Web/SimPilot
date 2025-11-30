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

export type Robot = {
    id: string
    name: string           // e.g. "R1"
    oemModel: string       // e.g. "KUKA KR 60-3"
    areaId: string
    cellId: string | null
    stationNumber: string  // e.g. "8C-7330"
    description: string
}

export type WeldGun = {
    id: string
    gunNumber: string      // e.g. "070ZF099D_20021724_E01"
    supplier: string       // e.g. "Bosch", "Obara"
    type: string           // e.g. "C-gun", "X-gun"
    maxForce: number | null
    payloadClass: string   // e.g. "Class 3"
    notes: string
}

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

export type Stand = {
    id: string
    standNumber: string       // e.g. "STD-01"
    areaId: string
    stationNumber: string
    type: StandType
    referenceNumber: string   // e.g. "Ref-1234"
    notes: string
}

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
