import {
    Project, Area, Cell, User, ChecklistTemplate, ChecklistItemTemplate,
    Checklist, ChecklistItem, ChangeLogEntry, Robot, WeldGun,
    RobotGunAssignment, GunCheckStatus, Stand, SpotWeldRef
} from './types'

// --- USERS ---
export const users: User[] = [
    { id: 'u1', name: 'Alex Manager', email: 'alex@simpilot.com', role: 'SIM_MANAGER' },
    { id: 'u2', name: 'Sarah Engineer', email: 'sarah@simpilot.com', role: 'SIM_ENGINEER' },
    { id: 'u3', name: 'Mike Engineer', email: 'mike@simpilot.com', role: 'SIM_ENGINEER' },
    { id: 'u4', name: 'Guest Viewer', email: 'guest@simpilot.com', role: 'VIEWER' },
]

// --- PROJECTS ---
export const projects: Project[] = [
    {
        id: 'p1',
        name: 'GLC_223_BIW',
        OEM: 'Mercedes',
        model: 'GLC X254',
        status: 'ACTIVE',
        createdAt: '2025-01-10T09:00:00Z',
        updatedAt: '2025-11-20T10:00:00Z'
    },
    {
        id: 'p2',
        name: 'RANGER_P703_FRAMING',
        OEM: 'Ford',
        model: 'Ranger P703',
        status: 'PLANNING',
        createdAt: '2025-06-15T09:00:00Z',
        updatedAt: '2025-11-25T14:00:00Z'
    }
]

// --- AREAS ---
export const areas: Area[] = [
    // GLC Project
    { id: 'a1', projectId: 'p1', name: 'Framing Station 1', sortOrder: 10 },
    { id: 'a2', projectId: 'p1', name: 'Underbody Geo', sortOrder: 20 },
    { id: 'a3', projectId: 'p1', name: 'Biw Transfer', sortOrder: 30 },
    // Ranger Project
    { id: 'a4', projectId: 'p2', name: 'Main Framing', sortOrder: 10 },
    { id: 'a5', projectId: 'p2', name: 'Respot Line', sortOrder: 20 }
]

// --- CELLS ---
export const cells: Cell[] = [
    // GLC - Framing
    {
        id: 'c1', areaId: 'a1', name: 'Cell 1010 - Geo Weld', status: 'IN_PROGRESS',
        responsibleUserId: 'u2', notes: 'Waiting for final gun specs',
        createdAt: '2025-02-01T10:00:00Z', updatedAt: '2025-11-28T09:00:00Z'
    },
    {
        id: 'c2', areaId: 'a1', name: 'Cell 1020 - Material Handling', status: 'APPROVED',
        responsibleUserId: 'u3', notes: 'Reach check complete',
        createdAt: '2025-02-01T10:00:00Z', updatedAt: '2025-11-15T16:00:00Z'
    },
    // GLC - Underbody
    {
        id: 'c3', areaId: 'a2', name: 'Cell 2010 - UB Tack', status: 'BLOCKED',
        responsibleUserId: 'u2', notes: 'Collision issue with clamp C4',
        createdAt: '2025-03-01T10:00:00Z', updatedAt: '2025-11-29T08:30:00Z'
    },
    // Ranger - Main Framing
    {
        id: 'c4', areaId: 'a4', name: 'Cell 5010 - Frame Set', status: 'NOT_STARTED',
        responsibleUserId: null, notes: 'Layout pending',
        createdAt: '2025-07-01T10:00:00Z', updatedAt: '2025-07-01T10:00:00Z'
    }
]

// --- CHECKLIST TEMPLATES ---
export const checklistTemplates: ChecklistTemplate[] = [
    { id: 't1', name: 'PRE_SIM Feasibility', description: 'Initial reach and access checks', phase: 'PRE_SIM', isActive: true },
    { id: 't2', name: 'FULL_SIM Validation', description: 'Final path and cycle time validation', phase: 'FULL_SIM', isActive: true }
]

export const checklistItemTemplates: ChecklistItemTemplate[] = [
    // PRE_SIM
    { id: 'it1', templateId: 't1', label: 'Robot Reach Check', isMandatory: true, sortOrder: 10 },
    { id: 'it2', templateId: 't1', label: 'Gun Access Check', isMandatory: true, sortOrder: 20 },
    { id: 'it3', templateId: 't1', label: 'Payload Verification', isMandatory: true, sortOrder: 30 },
    // FULL_SIM
    { id: 'it4', templateId: 't2', label: 'Collision Free Paths', isMandatory: true, sortOrder: 10 },
    { id: 'it5', templateId: 't2', label: 'Cycle Time < Target', isMandatory: true, sortOrder: 20 },
    { id: 'it6', templateId: 't2', label: 'Cables Dress Pack Check', isMandatory: false, sortOrder: 30 }
]

// --- CHECKLISTS ---
export const checklists: Checklist[] = [
    {
        id: 'cl1', cellId: 'c1', templateId: 't1', status: 'IN_PROGRESS',
        ownerUserId: 'u2', createdAt: '2025-11-20T10:00:00Z', updatedAt: '2025-11-28T10:00:00Z'
    }
]

export const checklistItems: ChecklistItem[] = [
    { id: 'ci1', checklistId: 'cl1', templateItemId: 'it1', status: 'DONE', comment: 'All robots reach', updatedAt: '2025-11-25T10:00:00Z' },
    { id: 'ci2', checklistId: 'cl1', templateItemId: 'it2', status: 'IN_PROGRESS', comment: 'Gun 2 tight on weld 45', updatedAt: '2025-11-28T10:00:00Z' },
    { id: 'ci3', checklistId: 'cl1', templateItemId: 'it3', status: 'PENDING', comment: '', updatedAt: '2025-11-20T10:00:00Z' }
]

// --- CHANGE LOG ---
export const changeLogEntries: ChangeLogEntry[] = [
    { id: 'le1', cellId: 'c1', userId: 'u2', createdAt: '2025-11-28T09:00:00Z', text: 'Moved R1 base +50mm X to clear column' },
    { id: 'le2', cellId: 'c3', userId: 'u2', createdAt: '2025-11-29T08:30:00Z', text: 'Flagged collision on Clamp C4' }
]

// --- PHASE 2: EQUIPMENT ---

export const robots: Robot[] = [
    {
        id: 'r1', kind: 'ROBOT', name: 'R1', oemModel: 'KUKA KR 210 R2700', areaId: 'a1', cellId: 'c1', stationNumber: 'ST-10', description: 'Handling Robot',
        sourcing: 'REUSE', metadata: {}, sourceFile: 'mock', sheetName: 'mock', rowIndex: 0, toolIds: []
    },
    {
        id: 'r2', kind: 'ROBOT', name: 'R2', oemModel: 'KUKA KR 210 R2700', areaId: 'a1', cellId: 'c1', stationNumber: 'ST-10', description: 'Welding Robot',
        sourcing: 'NEW_BUY', metadata: {}, sourceFile: 'mock', sheetName: 'mock', rowIndex: 1, toolIds: ['wg1']
    },
    {
        id: 'r3', kind: 'ROBOT', name: 'R1', oemModel: 'Fanuc R-2000iC', areaId: 'a2', cellId: 'c3', stationNumber: 'ST-20', description: 'Geo Welder',
        sourcing: 'UNKNOWN', metadata: {}, sourceFile: 'mock', sheetName: 'mock', rowIndex: 2, toolIds: ['wg2']
    }
]

export const weldGuns: WeldGun[] = [
    {
        id: 'wg1', kind: 'GUN', name: 'G01', gunNumber: 'G01_X_300', supplier: 'Obara', type: 'X-Gun', maxForce: 3.5, payloadClass: 'Class 3', notes: 'Standard X Gun',
        sourcing: 'REUSE', metadata: {}, sourceFile: 'mock', sheetName: 'mock', rowIndex: 0
    },
    {
        id: 'wg2', kind: 'GUN', name: 'G02', gunNumber: 'G02_C_450', supplier: 'Obara', type: 'C-Gun', maxForce: 4.0, payloadClass: 'Class 4', notes: 'Heavy C Gun',
        sourcing: 'NEW_BUY', metadata: {}, sourceFile: 'mock', sheetName: 'mock', rowIndex: 1
    }
]

export const robotGunAssignments: RobotGunAssignment[] = [
    {
        id: 'rga1', robotId: 'r2', weldGunId: 'wg1', areaId: 'a1', cellId: 'c1', stationNumber: 'ST-10',
        fromDate: '2025-01-01', toDate: null, isActive: true
    },
    {
        id: 'rga2', robotId: 'r3', weldGunId: 'wg2', areaId: 'a2', cellId: 'c3', stationNumber: 'ST-20',
        fromDate: '2025-02-01', toDate: null, isActive: true
    }
]

export const gunCheckStatuses: GunCheckStatus[] = [
    {
        id: 'gcs1', robotGunAssignmentId: 'rga1', geometryOk: true, payloadOk: true, forceOk: true,
        approvedAt: '2025-11-10T10:00:00Z', approvedByUserId: 'u1', comments: 'All good'
    },
    {
        id: 'gcs2', robotGunAssignmentId: 'rga2', geometryOk: true, payloadOk: false, forceOk: true,
        approvedAt: null, approvedByUserId: null, comments: 'Payload exceeds robot limit by 5kg'
    }
]

export const stands: Stand[] = [
    {
        id: 's1', kind: 'STAND', name: 'STD-01', standNumber: 'STD-01', areaId: 'a1', stationNumber: 'ST-10', type: 'TIP_DRESSER', referenceNumber: 'TD-K-01', notes: 'Kyokutoh Dresser',
        sourcing: 'REUSE', metadata: {}, sourceFile: 'mock', sheetName: 'mock', rowIndex: 0
    },
    {
        id: 's2', kind: 'STAND', name: 'STD-02', standNumber: 'STD-02', areaId: 'a1', stationNumber: 'ST-10', type: 'GUN_STAND', referenceNumber: 'GS-01', notes: 'Parking stand for G01',
        sourcing: 'NEW_BUY', metadata: {}, sourceFile: 'mock', sheetName: 'mock', rowIndex: 1
    }
]

export const spotWeldRefs: SpotWeldRef[] = [
    { id: 'sw1', weldId: 'W1001', areaId: 'a1', stationNumber: 'ST-10', robotId: 'r2', weldGunId: 'wg1', cellId: 'c1', notes: '' },
    { id: 'sw2', weldId: 'W1002', areaId: 'a1', stationNumber: 'ST-10', robotId: 'r2', weldGunId: 'wg1', cellId: 'c1', notes: '' }
]
