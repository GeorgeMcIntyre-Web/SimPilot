import {
    Checklist, ChecklistItem, ChecklistItemStatus, ChecklistPhase, ChecklistTemplate
} from './types'
import {
    checklistItems, checklists, checklistTemplates, checklistItemTemplates
} from './mockData'

export function getChecklistTemplates(): ChecklistTemplate[] {
    return checklistTemplates
}

export function getChecklistTemplatesByPhase(phase: ChecklistPhase): ChecklistTemplate[] {
    if (!phase) return []
    return checklistTemplates.filter(t => t.phase === phase && t.isActive)
}

export function getChecklistsByCellId(cellId: string): Checklist[] {
    if (!cellId) return []
    return checklists.filter(c => c.cellId === cellId)
}

export function getChecklistItemsByChecklistId(checklistId: string): ChecklistItem[] {
    if (!checklistId) return []
    return checklistItems.filter(i => i.checklistId === checklistId)
}

export function createChecklistFromTemplate(params: {
    cellId: string;
    templateId: string;
    ownerUserId: string
}): Checklist | undefined {
    if (!params.cellId || !params.templateId || !params.ownerUserId) return

    const template = checklistTemplates.find(t => t.id === params.templateId)
    if (!template) return

    const newChecklist: Checklist = {
        id: `cl-${Date.now()}`,
        cellId: params.cellId,
        templateId: params.templateId,
        status: 'NOT_STARTED',
        ownerUserId: params.ownerUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    checklists.push(newChecklist)

    // Create items
    const items = checklistItemTemplates.filter(it => it.templateId === params.templateId)
    items.forEach(it => {
        const newItem: ChecklistItem = {
            id: `ci-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            checklistId: newChecklist.id,
            templateItemId: it.id,
            status: 'PENDING',
            comment: '',
            updatedAt: new Date().toISOString()
        }
        checklistItems.push(newItem)
    })

    return newChecklist
}

export function updateChecklistItem(params: {
    itemId: string;
    status?: ChecklistItemStatus;
    comment?: string
}): ChecklistItem | undefined {
    if (!params.itemId) return

    const item = checklistItems.find(i => i.id === params.itemId)
    if (!item) return

    if (params.status) item.status = params.status
    if (params.comment !== undefined) item.comment = params.comment
    item.updatedAt = new Date().toISOString()

    // Update parent checklist status logic could go here (simplified for MVP)
    updateChecklistStatus(item.checklistId)

    return item
}

function updateChecklistStatus(checklistId: string) {
    const checklist = checklists.find(c => c.id === checklistId)
    if (!checklist) return

    const items = checklistItems.filter(i => i.checklistId === checklistId)
    if (items.length === 0) return

    const allDone = items.every(i => i.status === 'DONE' || i.status === 'NA')
    const anyInProgress = items.some(i => i.status === 'IN_PROGRESS')

    if (allDone) {
        checklist.status = 'COMPLETED'
    } else if (anyInProgress) {
        checklist.status = 'IN_PROGRESS'
    } else {
        // Keep existing or set to IN_PROGRESS if started
        if (items.some(i => i.status !== 'PENDING')) {
            checklist.status = 'IN_PROGRESS'
        }
    }
    checklist.updatedAt = new Date().toISOString()
}
