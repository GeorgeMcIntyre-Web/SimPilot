import { useState } from 'react'
import { useChecklists } from '../../hooks/useChecklists'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { checklistItemTemplates } from '../../domain/mockData' // Direct import for MVP simplicity
import ChecklistView from './ChecklistView'

export default function ChecklistList({ cellId }: { cellId: string }) {
    const { checklists, itemsByChecklistId, templates, createChecklist, updateItem } = useChecklists(cellId)
    const user = useCurrentUser()
    const [isAdding, setIsAdding] = useState(false)

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Checklists</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                    {isAdding ? 'Cancel' : '+ Add Checklist'}
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 bg-blue-50 p-4 rounded border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">Select Template</h4>
                    <div className="space-y-2">
                        {templates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    if (user) createChecklist(t.id, user.id)
                                    setIsAdding(false)
                                }}
                                className="block w-full text-left px-3 py-2 bg-white border border-blue-200 rounded text-sm hover:bg-blue-50 text-gray-700"
                            >
                                {t.name} <span className="text-xs text-gray-400 ml-2">({t.phase})</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {checklists.length === 0 && !isAdding && (
                <div className="text-sm text-gray-500 italic">No checklists started.</div>
            )}

            {checklists.map(cl => {
                const template = templates.find(t => t.id === cl.templateId)
                return (
                    <ChecklistView
                        key={cl.id}
                        checklist={cl}
                        template={template}
                        items={itemsByChecklistId[cl.id] || []}
                        itemTemplates={checklistItemTemplates}
                        onUpdateItem={updateItem}
                    />
                )
            })}
        </div>
    )
}
