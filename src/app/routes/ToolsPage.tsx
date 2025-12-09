import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { Tag } from '../../ui/components/Tag';
import { useToolsFiltered, ToolType, SpotWeldSubType, Tool } from '../../ui/hooks/useDomainData';
import { Search, ArrowUpDown, Wrench, Layers } from 'lucide-react';
import { EmptyState } from '../../ui/components/EmptyState';

type SortKey = 'name' | 'stationCode' | 'toolType' | 'oemModel';
type SortDirection = 'asc' | 'desc';

export function ToolsPage() {
    const [typeFilter, setTypeFilter] = useState<ToolType | 'ALL'>('ALL');
    const [subTypeFilter, setSubTypeFilter] = useState<SpotWeldSubType | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');

    const tools = useToolsFiltered({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        subType: subTypeFilter === 'ALL' ? undefined : subTypeFilter
    });

    // Filter by search term
    const filteredTools = useMemo(() => {
        return tools.filter(t => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                t.name.toLowerCase().includes(term) ||
                (t.stationCode && t.stationCode.toLowerCase().includes(term)) ||
                (t.oemModel && t.oemModel.toLowerCase().includes(term))
            );
        });
    }, [searchTerm, tools]);

    // Sort
    const sortedTools = [...filteredTools].sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        if (sortKey === 'name') {
            valA = a.name;
            valB = b.name;
        } else if (sortKey === 'stationCode') {
            valA = a.stationCode || '';
            valB = b.stationCode || '';
        } else if (sortKey === 'toolType') {
            valA = a.toolType;
            valB = b.toolType;
        } else if (sortKey === 'oemModel') {
            valA = a.oemModel || '';
            valB = b.oemModel || '';
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

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
            className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm"
        >
            <span>{label}</span>
            <ArrowUpDown className="h-3 w-3" />
        </button>
    );

    const columns: Column<Tool>[] = [
        { header: <SortHeader label="Tool Name" keyName="name" />, accessor: (t) => t.name },
        { header: <SortHeader label="Type" keyName="toolType" />, accessor: (t) => <Tag label={t.toolType} color="blue" /> },
        { header: 'Subtype', accessor: (t) => t.subType ? <Tag label={t.subType} color="gray" /> : '-' },
        { header: 'Line', accessor: (t) => t.lineCode || '-' },
        { header: <SortHeader label="Station" keyName="stationCode" />, accessor: (t) => t.stationCode || '-' },
        { header: <SortHeader label="Model" keyName="oemModel" />, accessor: (t) => t.oemModel || '-' },
        { header: 'Reuse', accessor: (t) => t.reuseStatus || '-' },
        { header: 'Source', accessor: (t) => t.sourceFile ? <span className="text-xs text-gray-500" title={t.sourceFile}>{t.sourceFile.split('/').pop()}</span> : '-' },
    ];

    const navigate = useNavigate();

    if (tools.length === 0 && typeFilter === 'ALL' && subTypeFilter === 'ALL' && !searchTerm) {
        return (
            <div className="space-y-8">
                <PageHeader title="Tools & Equipment" subtitle="Manage all tools across projects" />
                <EmptyState
                    title="No Tools Found"
                    message="Please go to the Data Loader to import your equipment lists."
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Tools & Equipment" subtitle="Manage all tools across projects" />

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Search</label>
                        <div className="relative rounded-md">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Search by name, station, or model..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Tool Type</label>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-md bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-300">
                                <Wrench className="h-4 w-4" />
                            </div>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as ToolType | 'ALL')}
                                className="block w-full py-2 px-2 border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="ALL">All Types</option>
                                <option value="SPOT_WELD">Spot Weld</option>
                                <option value="SEALER">Sealer</option>
                                <option value="STUD_WELD">Stud Weld</option>
                                <option value="GRIPPER">Gripper</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                    </div>

                    {typeFilter === 'SPOT_WELD' && (
                        <div>
                            <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Subtype</label>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-md bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-300">
                                    <Layers className="h-4 w-4" />
                                </div>
                                <select
                                    value={subTypeFilter}
                                    onChange={(e) => setSubTypeFilter(e.target.value as SpotWeldSubType | 'ALL')}
                                    className="block w-full py-2 px-2 border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="ALL">All Subtypes</option>
                                    <option value="PNEUMATIC">Pneumatic</option>
                                    <option value="SERVO">Servo</option>
                                    <option value="UNKNOWN">Unknown</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span>Showing {sortedTools.length} of {tools.length} tools</span>
                    {(typeFilter !== 'ALL' || (typeFilter === 'SPOT_WELD' && subTypeFilter !== 'ALL') || searchTerm) && (
                        <button
                            onClick={() => { setSearchTerm(''); setTypeFilter('ALL'); setSubTypeFilter('ALL'); }}
                            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* Tools Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="overflow-x-auto custom-scrollbar">
                    <DataTable
                        data={sortedTools}
                        columns={columns}
                        emptyMessage="No tools found matching current filters."
                    />
                </div>
            </div>
        </div>
    );
}
