import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { Tag } from '../../ui/components/Tag';
import { useToolsFiltered, ToolType, SpotWeldSubType, Tool } from '../../ui/hooks/useDomainData';
import { Search, Filter } from 'lucide-react';
import { EmptyState } from '../../ui/components/EmptyState';
import { PageHint } from '../../ui/components/PageHint';

export function ToolsPage() {
    const [typeFilter, setTypeFilter] = useState<ToolType | 'ALL'>('ALL');
    const [subTypeFilter, setSubTypeFilter] = useState<SpotWeldSubType | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const tools = useToolsFiltered({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        subType: subTypeFilter === 'ALL' ? undefined : subTypeFilter
    });

    const filteredTools = useMemo(() => {
        if (!searchTerm) return tools;
        const term = searchTerm.toLowerCase();
        return tools.filter(t =>
            t.name.toLowerCase().includes(term) ||
            (t.stationCode && t.stationCode.toLowerCase().includes(term)) ||
            (t.oemModel && t.oemModel.toLowerCase().includes(term))
        );
    }, [searchTerm, tools]);

    // Keep subtype filter in sync with tool type to avoid invalid filtering
    useEffect(() => {
        if (typeFilter !== 'SPOT_WELD' && subTypeFilter !== 'ALL') {
            setSubTypeFilter('ALL');
        }
    }, [typeFilter, subTypeFilter]);

    const columns: Column<Tool>[] = [
        {
            header: 'Tool Name',
            accessor: (t) => t.name,
            sortValue: (t) => t.name
        },
        {
            header: 'Type',
            accessor: (t) => <Tag label={t.toolType} color="blue" />,
            sortValue: (t) => t.toolType
        },
        {
            header: 'Subtype',
            accessor: (t) => t.subType ? <Tag label={t.subType} color="gray" /> : '-',
            sortValue: (t) => t.subType || ''
        },
        { header: 'Line', accessor: (t) => t.lineCode || '-', sortValue: (t) => t.lineCode || '' },
        {
            header: 'Station',
            accessor: (t) => t.stationCode || '-',
            sortValue: (t) => t.stationCode || ''
        },
        { header: 'Model', accessor: (t) => t.oemModel || '-', sortValue: (t) => t.oemModel || '' },
        { header: 'Reuse', accessor: (t) => t.reuseStatus || '-', sortValue: (t) => t.reuseStatus || '' },
        { header: 'Source', accessor: (t) => t.sourceFile ? <span className="text-xs text-gray-500" title={t.sourceFile}>{t.sourceFile.split('/').pop()}</span> : '-', sortValue: (t) => t.sourceFile || '' },
    ];

    const navigate = useNavigate();

    if (tools.length === 0 && typeFilter === 'ALL' && subTypeFilter === 'ALL' && !searchTerm) {
        return (
            <div className="space-y-4">
                <PageHeader
                    title="Tools & Equipment"
                    subtitle={
                        <PageHint
                            standardText="Manage all tools across projects"
                            flowerText="Where every gripper, gun, and gadget finds its purpose."
                        />
                    }
                />
                <EmptyState
                    title="No Tools Found"
                    message="Please go to the Data Loader to import your equipment lists."
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                />
            </div>
        );
    }

    const hasActiveFilters = typeFilter !== 'ALL' || subTypeFilter !== 'ALL' || searchTerm.trim() !== '';

    return (
        <div className="space-y-4">
            <PageHeader
                title="Tools & Equipment"
                subtitle={
                    <PageHint
                        standardText="Manage all tools across projects"
                        flowerText="Where every gripper, gun, and gadget finds its purpose."
                    />
                }
            />

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

                        {/* Search */}
                        <div className="flex-1 min-w-0">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    className="block w-full pl-8 pr-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Search by name, station, or model..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Tool Type */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as ToolType | 'ALL')}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="ALL">All Types</option>
                            <option value="SPOT_WELD">Spot Weld</option>
                            <option value="SEALER">Sealer</option>
                            <option value="STUD_WELD">Stud Weld</option>
                            <option value="GRIPPER">Gripper</option>
                            <option value="OTHER">Other</option>
                        </select>

                        {/* Subtype (only for SPOT_WELD) */}
                        {typeFilter === 'SPOT_WELD' && (
                            <select
                                value={subTypeFilter}
                                onChange={(e) => setSubTypeFilter(e.target.value as SpotWeldSubType | 'ALL')}
                                className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="ALL">All Subtypes</option>
                                <option value="PNEUMATIC">Pneumatic</option>
                                <option value="SERVO">Servo</option>
                                <option value="UNKNOWN">Unknown</option>
                            </select>
                        )}

                        <div className="flex-1" />

                        {/* Count & Clear */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
                            </span>
                            {hasActiveFilters && (
                                <button
                                    onClick={() => { setSearchTerm(''); setTypeFilter('ALL'); setSubTypeFilter('ALL'); }}
                                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline whitespace-nowrap"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tools Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow rounded-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 20rem)' }}>
                <DataTable
                    data={filteredTools}
                    columns={columns}
                    enableSorting
                    defaultSortIndex={0}
                    emptyMessage="No tools found matching current filters."
                />
            </div>
        </div>
    );
}
