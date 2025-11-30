import { useState } from 'react'
import { ChecklistItem, ChecklistItemStatus } from '../../domain/types'

type Props = {
    item: ChecklistItem
    label: string
    isMandatory: boolean
    onUpdate: (status?: ChecklistItemStatus, comment?: string) => void
}

export default function ChecklistItemRow({ item, label, isMandatory, onUpdate }: Props) {
    const [comment, setComment] = useState(item.comment)

    const handleBlur = () => {
        if (comment !== item.comment) {
            onUpdate(undefined, comment)
        }
    }

    return (
        <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                    {isMandatory && <span className="text-xs text-red-500 font-bold">*</span>}
                </div>
                <input
                    type="text"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="Add comment..."
                    className="mt-1 w-full text-xs text-gray-600 border-none bg-transparent focus:ring-0 p-0 placeholder-gray-300"
                />
            </div>

            <select
                value={item.status}
                onChange={e => onUpdate(e.target.value as ChecklistItemStatus)}
                className={`text-xs font-medium rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${item.status === 'DONE' ? 'text-green-600 bg-green-50' :
                        item.status === 'IN_PROGRESS' ? 'text-blue-600 bg-blue-50' :
                            item.status === 'NA' ? 'text-gray-400 bg-gray-50' :
                                'text-gray-500 bg-white'
                    }`}
            >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
                <option value="NA">N/A</option>
            </select>
        </div>
    )
}
