import { useState } from 'react'
import { useCell } from '../../hooks/useCells'
import ChecklistList from '../checklists/ChecklistList'
import ChangeLogList from '../changelog/ChangeLogList'
import ChangeLogForm from '../changelog/ChangeLogForm'
import { useEquipmentByCellId } from '../../hooks/useEquipmentByCell'

export default function CellDetailPanel({ cellId }: { cellId: string }) {
    const cell = useCell(cellId)
    const equipment = useEquipmentByCellId(cellId)
    const [activeTab, setActiveTab] = useState<'CHECKLISTS' | 'CHANGELOG' | 'EQUIPMENT'>('CHECKLISTS')

    if (!cell) return <div className="p-6 text-gray-500">Loading cell...</div>

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{cell.name}</h2>
                    <span className={`px-3 py-1 text-sm rounded-full font-medium ${cell.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            cell.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                        }`}>
                        {cell.status}
                    </span>
                </div>
                <div className="text-sm text-gray-600">
                    Responsible: <span className="font-medium text-gray-900">{cell.responsibleUserId || 'Unassigned'}</span>
                </div>
                {cell.notes && (
                    <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                        {cell.notes}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
                <button
                    onClick={() => setActiveTab('CHECKLISTS')}
                    className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'CHECKLISTS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Checklists
                </button>
                <button
                    onClick={() => setActiveTab('EQUIPMENT')}
                    className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'EQUIPMENT' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Equipment
                </button>
                <button
                    onClick={() => setActiveTab('CHANGELOG')}
                    className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'CHANGELOG' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Change Log
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'CHECKLISTS' && (
                    <ChecklistList cellId={cellId} />
                )}

                {activeTab === 'EQUIPMENT' && (
                    <div className="space-y-6">
                        {/* Robots */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Robots</h3>
                            {equipment.robots.length === 0 ? (
                                <div className="text-sm text-gray-500 italic">No robots assigned.</div>
                            ) : (
                                <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Model</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Station</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {equipment.robots.map(r => (
                                                <tr key={r.id}>
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.name}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-500">{r.oemModel}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-500">{r.stationNumber}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* Guns */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Weld Guns</h3>
                            {equipment.robotGunAssignments.length === 0 ? (
                                <div className="text-sm text-gray-500 italic">No guns assigned.</div>
                            ) : (
                                <div className="space-y-3">
                                    {equipment.robotGunAssignments.map(assign => {
                                        const gun = equipment.weldGuns.find(g => g.id === assign.weldGunId)
                                        const status = equipment.gunStatuses.find(s => s.robotGunAssignmentId === assign.id)
                                        const robot = equipment.robots.find(r => r.id === assign.robotId)

                                        return (
                                            <div key={assign.id} className="bg-white border border-gray-200 rounded-md p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="font-bold text-gray-900">{gun?.gunNumber || 'Unknown Gun'}</span>
                                                        <span className="text-gray-500 text-sm mx-2">on</span>
                                                        <span className="font-medium text-gray-900">{robot?.name || 'Unknown Robot'}</span>
                                                    </div>
                                                    {status && (
                                                        <div className="flex gap-1">
                                                            <span className={`px-2 py-0.5 text-xs rounded ${status.geometryOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Geo</span>
                                                            <span className={`px-2 py-0.5 text-xs rounded ${status.payloadOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Payload</span>
                                                            <span className={`px-2 py-0.5 text-xs rounded ${status.forceOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Force</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Type: {gun?.type} • Supplier: {gun?.supplier}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Stands */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Stands</h3>
                            {equipment.stands.length === 0 ? (
                                <div className="text-sm text-gray-500 italic">No stands found.</div>
                            ) : (
                                <ul className="list-disc list-inside text-sm text-gray-600">
                                    {equipment.stands.map(s => (
                                        <li key={s.id}>{s.standNumber} ({s.type}) - {s.notes}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'CHANGELOG' && (
                    <div className="space-y-6">
                        <ChangeLogForm cellId={cellId} />
                        <ChangeLogList cellId={cellId} />
                    </div>
                )}
            </div>
        </div>
    )
}
