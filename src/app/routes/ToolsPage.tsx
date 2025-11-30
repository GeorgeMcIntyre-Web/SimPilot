import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { Tag } from '../../ui/components/Tag';
import { useToolsFiltered, ToolType, SpotWeldSubType, Tool } from '../../ui/hooks/useDomainData';
import { Search, ArrowUpDown } from 'lucide-react';

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
    const filteredTools = tools.filter(t => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            t.name.toLowerCase().includes(term) ||
            (t.stationCode && t.stationCode.toLowerCase().includes(term)) ||
            (t.oemModel && t.oemModel.toLowerCase().includes(term))
        );
    });

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
            className="flex items-center space-x-1 hover:text-blue-600 font-medium"
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

    if (tools.length === 0 && typeFilter === 'ALL' && subTypeFilter === 'ALL' && !searchTerm) {
        return (
            <div className="space-y-8">
                <PageHeader title="Tools & Equipment" subtitle="Manage all tools across projects" />
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">No Tools Found</h3>
                    <p className="text-blue-700 dark:text-blue-300 mb-4">
                        Please go to the Data Loader to import your equipment lists.
                    </p>
                    <Link to="/data-loader" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Go to Data Loader
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Tools & Equipment" subtitle="Manage all tools across projects" />

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
                            placeholder="Search by name, station, or model..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tool Type</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as ToolType | 'ALL')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="ALL">All Types</option>
                        <option value="SPOT_WELD">Spot Weld</option>
                        <option value="SEALER">Sealer</option>
                        <option value="STUD_WELD">Stud Weld</option>
                        <option value="GRIPPER">Gripper</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                {typeFilter === 'SPOT_WELD' && (
                    <div className="w-full md:w-48">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtype</label>
                        <select
                            value={subTypeFilter}
                            onChange={(e) => setSubTypeFilter(e.target.value as SpotWeldSubType | 'ALL')}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="ALL">All Subtypes</option>
                            <option value="PNEUMATIC">Pneumatic</option>
                            <option value="SERVO">Servo</option>
                            <option value="UNKNOWN">Unknown</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Tools Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <DataTable
                    data={sortedTools}
                    columns={columns}
                    emptyMessage="No tools found matching current filters."
                />
            </div>
        </div>
    );
}
