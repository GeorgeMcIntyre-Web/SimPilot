import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { StatusPill } from '../../ui/components/StatusPill';
import { useAllEngineerMetrics, useCells } from '../../ui/hooks/useDomainData';
import { Search, ArrowUpDown, Copy, Check, User, AlertTriangle } from 'lucide-react';
import { Cell } from '../../domain/core';

type SortKey = 'name' | 'cellCount' | 'atRiskCellsCount' | 'avgCompletion';
type SortDirection = 'asc' | 'desc';

export function EngineersPage() {
    const metrics = useAllEngineerMetrics();
    const allCells = useCells();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('atRiskCellsCount');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [selectedEngineerName, setSelectedEngineerName] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Filter
    const filteredMetrics = metrics.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    const sortedMetrics = [...filteredMetrics].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc'); // Default to asc for new key, though desc might be better for numbers. Let's stick to simple toggle.
            if (key === 'atRiskCellsCount' || key === 'cellCount' || key === 'avgCompletion') {
                setSortDir('desc'); // Actually, numbers usually better desc
            }
        }
    };

    const handleCopy = async () => {
        if (!navigator.clipboard) return;

        const summary = sortedMetrics.map(m =>
            `Engineer: ${m.name}\nCells: ${m.cellCount} (${m.atRiskCellsCount} at risk)\nProjects: ${m.projectNames}`
        ).join('\n\n');

        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const SortHeader = ({ label, keyName }: { label: string, keyName: SortKey }) => (
        <button
            onClick={(e) => { e.stopPropagation(); handleSort(keyName); }}
            className="flex items-center space-x-1 hover:text-blue-600 font-medium"
        >
            <span>{label}</span>
            <ArrowUpDown className="h-3 w-3" />
        </button>
    );

    const columns: Column<typeof metrics[0]>[] = [
        { header: <SortHeader label="Engineer" keyName="name" />, accessor: (m) => <div className="font-medium text-gray-900 dark:text-white">{m.name}</div> },
        { header: 'Projects', accessor: (m) => <span className="text-sm text-gray-500">{m.projectNames}</span> },
        { header: <SortHeader label="Cells" keyName="cellCount" />, accessor: (m) => m.cellCount },
        {
            header: <SortHeader label="At Risk" keyName="atRiskCellsCount" />, accessor: (m) => (
                m.atRiskCellsCount > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                        {m.atRiskCellsCount}
                    </span>
                ) : (
                    <span className="text-gray-400">0</span>
                )
            )
        },
        {
            header: <SortHeader label="Avg % Complete" keyName="avgCompletion" />, accessor: (m) => (
                <div className="flex items-center">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${m.avgCompletion}%` }} />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{m.avgCompletion}%</span>
                </div>
            )
        },
    ];

    // Selected Engineer Details
    const selectedEngineerCells = selectedEngineerName
        ? allCells.filter(c => c.assignedEngineer === selectedEngineerName)
        : [];

    const cellColumns: Column<Cell>[] = [
        { header: 'Cell Name', accessor: (c) => <Link to={`/projects/${c.projectId}/cells/${c.id}`} className="text-blue-600 hover:underline">{c.name}</Link> },
        { header: 'Station', accessor: (c) => c.code || '-' },
        { header: 'Line', accessor: (c) => c.lineCode || '-' },
        { header: 'Status', accessor: (c) => <StatusPill status={c.status} /> },
        { header: '% Complete', accessor: (c) => c.simulation ? `${c.simulation.percentComplete}%` : '-' },
        { header: 'Issues', accessor: (c) => c.simulation?.hasIssues ? <AlertTriangle className="h-4 w-4 text-red-500" /> : '-' },
    ];

    if (metrics.length === 0) {
        return (
            <div className="space-y-8">
                <PageHeader title="Engineers" subtitle="Workload & risk overview" />
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
                    <User className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Engineers Found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Ensure "PERSONS RESPONSIBLE" is filled in the Simulation Status Excel files.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <PageHeader title="Engineers" subtitle="Workload & risk overview" />
                <button
                    onClick={handleCopy}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                    {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied' : 'Copy Summary'}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="relative rounded-md shadow-sm max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Filter by engineer name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <DataTable
                    data={sortedMetrics}
                    columns={columns}
                    emptyMessage="No engineers match your filter."
                    onRowClick={(row) => setSelectedEngineerName(row.name === selectedEngineerName ? null : row.name)}
                />
            </div>

            {/* Selected Engineer Detail */}
            {selectedEngineerName && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-t-4 border-blue-500 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Assignments: {selectedEngineerName}
                        </h3>
                        <button
                            onClick={() => setSelectedEngineerName(null)}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Close
                        </button>
                    </div>
                    <DataTable
                        data={selectedEngineerCells}
                        columns={cellColumns}
                        emptyMessage="No cells assigned to this engineer."
                    />
                </div>
            )}
        </div>
    );
}
