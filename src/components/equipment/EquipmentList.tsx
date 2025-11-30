import { useState } from 'react'
import { EquipmentLibraryData } from '../../hooks/useEquipmentLibrary'

export default function EquipmentList({ data }: { data: EquipmentLibraryData }) {
    const [activeTab, setActiveTab] = useState<'ROBOTS' | 'GUNS' | 'STANDS'>('ROBOTS')

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                    onClick={() => setActiveTab('ROBOTS')}
                    className={`py-3 px-6 text-sm font-medium ${activeTab === 'ROBOTS' ? 'bg-white border-t-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Robots ({data.robots.length})
                </button>
                <button
                    onClick={() => setActiveTab('GUNS')}
                    className={`py-3 px-6 text-sm font-medium ${activeTab === 'GUNS' ? 'bg-white border-t-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Weld Guns ({data.weldGuns.length})
                </button>
                <button
                    onClick={() => setActiveTab('STANDS')}
                    className={`py-3 px-6 text-sm font-medium ${activeTab === 'STANDS' ? 'bg-white border-t-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Stands ({data.stands.length})
                </button>
            </div>

            {/* Content */}
            <div className="overflow-x-auto">
                {activeTab === 'ROBOTS' && (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.robots.map(r => (
                                <tr key={r.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{r.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.oemModel}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.stationNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'GUNS' && (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gun Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Force / Class</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.weldGuns.map(g => (
                                <tr key={g.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{g.gunNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.supplier}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.maxForce}kN / {g.payloadClass}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'STANDS' && (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stand Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.stands.map(s => (
                                <tr key={s.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{s.standNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.stationNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.referenceNumber}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
