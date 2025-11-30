import { useState, useEffect, useCallback } from 'react'
import { Checklist, ChecklistItem, ChecklistItemStatus, ChecklistTemplate } from '../domain/types'
import {
    getChecklistsByCellId,
    getChecklistItemsByChecklistId,
    getChecklistTemplatesByPhase,
    createChecklistFromTemplate as storeCreateChecklist,
    updateChecklistItem as storeUpdateItem
} from '../domain/checklistsStore'

export function useChecklists(cellId: string | undefined) {
    const [checklists, setChecklists] = useState<Checklist[]>([])
    const [itemsByChecklistId, setItemsByChecklistId] = useState<Record<string, ChecklistItem[]>>({})
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]) // For creating new ones

    const refresh = useCallback(() => {
        if (!cellId) return
        const lists = getChecklistsByCellId(cellId)
        setChecklists([...lists]) // Copy to trigger render

        const itemsMap: Record<string, ChecklistItem[]> = {}
        lists.forEach(l => {
            itemsMap[l.id] = getChecklistItemsByChecklistId(l.id)
        })
        setItemsByChecklistId(itemsMap)
    }, [cellId])

    useEffect(() => {
        refresh()
        // Load templates (simplified: load all active)
        // In a real app we might filter by cell phase if cell had a phase
        setTemplates([...getChecklistTemplatesByPhase('PRE_SIM'), ...getChecklistTemplatesByPhase('FULL_SIM')])
    }, [cellId, refresh])

    const createChecklist = (templateId: string, ownerUserId: string) => {
        if (!cellId) return
        storeCreateChecklist({ cellId, templateId, ownerUserId })
        refresh()
    }

    const updateItem = (itemId: string, status?: ChecklistItemStatus, comment?: string) => {
        storeUpdateItem({ itemId, status, comment })
        refresh()
    }

    return {
        checklists,
        itemsByChecklistId,
        templates,
        createChecklist,
        updateItem,
        refresh
    }
}
