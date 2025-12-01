import { useState, useMemo } from 'react'
import { EquipmentLibraryData } from '../../hooks/useEquipmentLibrary'
import { AssetKind } from '../../domain/types'
import { SourcingBadge } from './SourcingBadge'
import { Search, Bot, Zap, Box, Wrench, Filter, Leaf, Sparkles } from 'lucide-react'
import { FlowerArt } from '../../ui/components/FlowerArt'

export default function EquipmentList({ data }: { data: EquipmentLibraryData }) {
    const [search, setSearch] = useState('')
    const [kindFilter, setKindFilter] = useState<AssetKind | 'ALL'>('ALL')

    // Combine all assets into a single unified list
    const allAssets = useMemo(() => {
        const robots = data.robots.map(r => ({ ...r, kind: 'ROBOT' as AssetKind }))
        const guns = data.weldGuns.map(g => ({ ...g, kind: 'GUN' as AssetKind }))
        const stands = data.stands.map(s => ({ ...s, kind: 'OTHER' as AssetKind }))
        return [...robots, ...guns, ...stands]
    }, [data])

    // Filter logic
    const filteredAssets = useMemo(() => {
        return allAssets.filter(asset => {
            // Kind Filter
            if (kindFilter !== 'ALL' && asset.kind !== kindFilter) return false

            // Search Filter (Name, Details, Metadata)
            if (!search) return true
            const term = search.toLowerCase()

            // Check standard fields
            if (asset.name.toLowerCase().includes(term)) return true
            if (asset.oemModel?.toLowerCase().includes(term)) return true
            if (asset.description?.toLowerCase().includes(term)) return true
            if (asset.stationNumber?.toLowerCase().includes(term)) return true

            // Check Metadata (The "Catch-All" Bucket)
            if (asset.metadata) {
                return Object.entries(asset.metadata).some(([key, val]) => {
                    if (val === null || val === undefined) return false
                    // Search both key and value (e.g. search for "Supplier: Bosch")
                    return key.toLowerCase().includes(term) || String(val).toLowerCase().includes(term)
                })
            }

            return false
        })
    }, [allAssets, search, kindFilter])

    // Helper to render Kind Icon
    const KindIcon = ({ kind }: { kind: AssetKind }) => {
        switch (kind) {
            case 'ROBOT': return <Bot className="w-4 h-4 text-purple-500" />
            case 'GUN': return <Zap className="w-4 h-4 text-yellow-500" />
            case 'OTHER': return <Box className="w-4 h-4 text-blue-500" />
            default: return <Wrench className="w-4 h-4 text-gray-500" />
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header & Controls */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            Unified Equipment Library
                            <FlowerArt className="h-8 w-32 text-emerald-500/20" />
                        </h2>
                        <p className="text-sm text-gray-500">
                            {allAssets.length} total assets across {data.robots.length} robots, {data.weldGuns.length} guns, {data.stands.length} stands
                        </p>
                    </div>

                    {/* Sourcing Strategy Tile (Mini Dashboard) */}
                    <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-green-700">
                                <Leaf className="w-3 h-3" />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-700">
                                <Sparkles className="w-3 h-3" />
                            </div>
                        </div>
                        <div className="text-xs">
                            <span className="font-medium text-gray-700">Sourcing Strategy</span>
                            <div className="text-gray-500">Growing vs New</div>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search assets, metadata, suppliers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                        {(['ALL', 'ROBOT', 'GUN', 'OTHER'] as const).map((k) => (
                            <button
                                key={k}
                                onClick={() => setKindFilter(k)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${kindFilter === k
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {k === 'ALL' ? 'All Assets' : k + 's'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Unified Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sourcing</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metadata</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {filteredAssets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <Filter className="w-8 h-8 text-gray-300 mb-2" />
                                        <p>No assets found matching your search.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors group">
                                    {/* Asset Name & Kind */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <KindIcon kind={asset.kind} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                                                <div className="text-xs text-gray-500">{asset.kind}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Details (Model, Type, etc.) */}
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{asset.oemModel || asset.type || asset.gunNumber || '-'}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{asset.description || asset.supplier || asset.referenceNumber}</div>
                                    </td>

                                    {/* Location */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{asset.stationNumber || '-'}</div>
                                        <div className="text-xs text-gray-500">{asset.areaId || asset.areaName}</div>
                                    </td>

                                    {/* Sourcing Badge */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <SourcingBadge sourcing={asset.sourcing} />
                                    </td>

                                    {/* Metadata Preview */}
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        {asset.metadata && Object.keys(asset.metadata).length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(asset.metadata).slice(0, 2).map(([k, v]) => (
                                                    <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                                        {k}: {String(v).substring(0, 15)}
                                                    </span>
                                                ))}
                                                {Object.keys(asset.metadata).length > 2 && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">
                                                        +{Object.keys(asset.metadata).length - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 italic">No extra data</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
