import { useState } from 'react'
import { useChangeLog } from '../../hooks/useChangeLog'
import { useCurrentUser } from '../../hooks/useCurrentUser'

export default function ChangeLogForm({ cellId }: { cellId: string }) {
    const { addEntry } = useChangeLog(cellId)
    const user = useCurrentUser()
    const [text, setText] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!text.trim() || !user) return
        addEntry(user.id, text)
        setText('')
    }

    return (
        <form onSubmit={handleSubmit} className="mb-6">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Add Log Entry
            </label>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                rows={3}
                placeholder="Describe the change..."
            />
            <div className="mt-2 flex justify-end">
                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                    Add Entry
                </button>
            </div>
        </form>
    )
}
