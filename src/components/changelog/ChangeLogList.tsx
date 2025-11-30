import { useChangeLog } from '../../hooks/useChangeLog'
import { getUserById } from '../../domain/usersStore' // Direct import for MVP

export default function ChangeLogList({ cellId }: { cellId: string }) {
    const { entries } = useChangeLog(cellId)

    if (entries.length === 0) {
        return <div className="text-sm text-gray-500 italic mt-4">No entries yet.</div>
    }

    return (
        <div className="space-y-4 mt-4">
            {entries.map(entry => {
                const user = getUserById(entry.userId)
                return (
                    <div key={entry.id} className="flex gap-3">
                        <div className="flex-none mt-1">
                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-bold">
                                {user?.name?.charAt(0) || '?'}
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-50 p-3 rounded text-sm text-gray-800">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="font-bold text-gray-900">{user?.name || 'Unknown'}</span>
                                <span className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</span>
                            </div>
                            <p>{entry.text}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
