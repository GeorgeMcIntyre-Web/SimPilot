import { useState } from 'react'
import { Checklist, ChecklistItem, ChecklistTemplate, ChecklistItemTemplate } from '../../domain/types'
import ChecklistItemRow from './ChecklistItemRow'

type Props = {
    checklist: Checklist
    template: ChecklistTemplate | undefined
    items: ChecklistItem[]
    itemTemplates: ChecklistItemTemplate[]
    onUpdateItem: (itemId: string, status?: any, comment?: string) => void
}

export default function ChecklistView({ checklist, template, items, itemTemplates, onUpdateItem }: Props) {
    const [expanded, setExpanded] = useState(false)

    if (!template) return null

    // Sort items based on template order
    const sortedItems = [...items].sort((a, b) => {
        const tA = itemTemplates.find(t => t.id === a.templateItemId)
        const tB = itemTemplates.find(t => t.id === b.templateItemId)
        return (tA?.sortOrder || 0) - (tB?.sortOrder || 0)
    })

    return (
        <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
            <div
                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                onClick={() => setExpanded(!expanded)}
            >
                <div>
                    <h4 className="font-bold text-gray-800">{template.name}</h4>
                    <div className="text-xs text-gray-500">
                        {checklist.status} • {new Date(checklist.updatedAt).toLocaleDateString()}
                    </div>
                </div>
                <div className="text-gray-400">
                    {expanded ? '▲' : '▼'}
                </div>
            </div>

            {expanded && (
                <div className="p-4 bg-white">
                    {sortedItems.map(item => {
                        const t = itemTemplates.find(it => it.id === item.templateItemId)
                        if (!t) return null
                        return (
                            <ChecklistItemRow
                                key={item.id}
                                item={item}
                                label={t.label}
                                isMandatory={t.isMandatory}
                                onUpdate={(status, comment) => onUpdateItem(item.id, status, comment)}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}
