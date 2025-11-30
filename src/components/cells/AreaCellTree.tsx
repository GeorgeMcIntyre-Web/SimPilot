import { Area, Cell } from '../../domain/types'

type Props = {
    areas: Area[]
    cellsByArea: Record<string, Cell[]>
    selectedCellId: string | null
    onSelectCell: (cellId: string) => void
}

export default function AreaCellTree({ areas, cellsByArea, selectedCellId, onSelectCell }: Props) {
    return (
        <div className="p-4">
            {areas.map(area => (
                <div key={area.id} className="mb-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">
                        {area.name}
                    </h3>
                    <div className="space-y-1">
                        {cellsByArea[area.id]?.map(cell => (
                            <div
                                key={cell.id}
                                onClick={() => onSelectCell(cell.id)}
                                className={`px-3 py-2 rounded cursor-pointer text-sm flex justify-between items-center ${selectedCellId === cell.id
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <span>{cell.name}</span>
                                <span className={`w-2 h-2 rounded-full ${cell.status === 'APPROVED' ? 'bg-green-500' :
                                        cell.status === 'BLOCKED' ? 'bg-red-500' :
                                            cell.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                                                'bg-gray-300'
                                    }`} />
                            </div>
                        ))}
                        {(!cellsByArea[area.id] || cellsByArea[area.id].length === 0) && (
                            <div className="px-3 py-2 text-xs text-gray-400 italic">No cells</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
