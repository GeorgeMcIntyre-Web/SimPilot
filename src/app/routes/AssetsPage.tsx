import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { Tag } from '../../ui/components/Tag';
import { useCoreStore } from '../../domain/coreStore';
import { UnifiedAsset } from '../../domain/core';
import { Search, Bot, Zap, Box, Wrench, ArrowUpDown } from 'lucide-react';
import { FlowerEmptyState } from '../../ui/components/FlowerEmptyState';

type SortKey = 'name' | 'kind' | 'stationCode' | 'areaName' | 'oemModel';
type SortDirection = 'asc' | 'desc';

export function AssetsPage() {
    const state = useCoreStore();
    const [kindFilter, setKindFilter] = useState<'ALL' | 'ROBOT' | 'TOOL' | 'GUN' | 'OTHER'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');

    // Get all assets from store
    const allAssets = state.assets;

    // Filter by kind
    const filteredByKind = useMemo(() => {
        if (kindFilter === 'ALL') return allAssets;
        return allAssets.filter(a => a.kind === kindFilter);
    }, [allAssets, kindFilter]);

    // Filter by search term
    const filteredAssets = useMemo(() => {
        if (!searchTerm) return filteredByKind;
        const term = searchTerm.toLowerCase();
        return filteredByKind.filter(asset => {
            // Search in name
            if (asset.name?.toLowerCase().includes(term)) return true;
            // Search in station/area
            if (asset.stationNumber?.toLowerCase().includes(term)) return true;
            if (asset.areaName?.toLowerCase().includes(term)) return true;
            // Check lineCode (stored in metadata for UnifiedAsset compatibility)
            const lineCode = asset.metadata?.lineCode;
            if (lineCode && String(lineCode).toLowerCase().includes(term)) return true;
            // Search in model
            if (asset.oemModel?.toLowerCase().includes(term)) return true;
            // Search in metadata
            if (asset.metadata) {
                return Object.entries(asset.metadata).some(([key, val]) => {
                    if (val === null || val === undefined) return false;
                    return key.toLowerCase().includes(term) || String(val).toLowerCase().includes(term);
                });
            }
            return false;
        });
    }, [filteredByKind, searchTerm]);

    // Sort
    const sortedAssets = useMemo(() => {
        return [...filteredAssets].sort((a, b) => {
            let valA: string | number = '';
            let valB: string | number = '';

            if (sortKey === 'name') {
                valA = a.name || '';
                valB = b.name || '';
            } else if (sortKey === 'kind') {
                valA = a.kind || '';
                valB = b.kind || '';
            } else if (sortKey === 'stationCode') {
                valA = a.stationNumber || '';
                valB = b.stationNumber || '';
            } else if (sortKey === 'areaName') {
                valA = a.areaName || '';
                valB = b.areaName || '';
            } else if (sortKey === 'oemModel') {
                valA = a.oemModel || '';
                valB = b.oemModel || '';
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredAssets, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortHeader = ({ label, keyName }: { label: string, keyName: SortKey }) => (
        <button
            onClick={() => handleSort(keyName)}
            className="flex items-center space-x-1 hover:text-blue-600 font-medium"
        >
            <span>{label}</span>
            <ArrowUpDown className="h-3 w-3" />
        </button>
    );

    // Helper to get kind icon
    const KindIcon = ({ kind }: { kind: string }) => {
        switch (kind) {
            case 'ROBOT': return <Bot className="w-4 h-4 text-purple-500" />;
            case 'GUN': return <Zap className="w-4 h-4 text-yellow-500" />;
            case 'TOOL': return <Wrench className="w-4 h-4 text-blue-500" />;
            case 'OTHER': return <Box className="w-4 h-4 text-gray-500" />;
            default: return <Box className="w-4 h-4 text-gray-400" />;
        }
    };

    // Get counts
    const robotsCount = allAssets.filter(a => a.kind === 'ROBOT').length;
    const toolsCount = allAssets.filter(a => a.kind !== 'ROBOT').length;

    const columns: Column<UnifiedAsset>[] = [
        {
            header: <SortHeader label="Asset" keyName="name" />,
            accessor: (a) => (
                <div className="flex items-center space-x-2">
                    <KindIcon kind={a.kind} />
                    <span className="font-medium">{a.name}</span>
                </div>
            )
        },
        {
            header: <SortHeader label="Type" keyName="kind" />,
            accessor: (a) => <Tag label={a.kind} color={a.kind === 'ROBOT' ? 'purple' : a.kind === 'GUN' ? 'yellow' : 'blue'} />
        },
        {
            header: 'Model',
            accessor: (a) => a.oemModel || '-'
        },
        {
            header: <SortHeader label="Area" keyName="areaName" />,
            accessor: (a) => a.areaName || '-'
        },
        {
            header: <SortHeader label="Station" keyName="stationCode" />,
            accessor: (a) => a.stationNumber || '-'
        },
        {
            header: 'Line',
            accessor: (a) => {
                // lineCode is stored in metadata for UnifiedAsset compatibility
                const lineCode = a.metadata?.lineCode;
                return lineCode ? String(lineCode) : '-';
            }
        },
        {
            header: 'Source',
            accessor: (a) => a.sourceFile ? (
                <span className="text-xs text-gray-500" title={a.sourceFile}>
                    {a.sourceFile.split(/[/\\]/).pop()?.substring(0, 30)}
                </span>
            ) : '-'
        }
    ];

    const navigate = useNavigate();

    if (allAssets.length === 0) {
        return (
            <div className="space-y-8">
                <PageHeader title="Assets" subtitle="View all robots and tools across all projects" />
                <FlowerEmptyState
                    title="No Assets Found"
                    message="Please go to the Data Loader to import your equipment lists."
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Assets" 
                subtitle={`${allAssets.length} total assets (${robotsCount} robots, ${toolsCount} tools)`}
            />

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Search by name, station, area, model, or metadata..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Type</label>
                    <select
                        value={kindFilter}
                        onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="ALL">All Assets</option>
                        <option value="ROBOT">Robots</option>
                        <option value="TOOL">Tools</option>
                        <option value="GUN">Guns</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
            </div>

            {/* Assets Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <DataTable
                    data={sortedAssets}
                    columns={columns}
                    emptyMessage="No assets found matching current filters."
                />
            </div>
        </div>
    );
}

