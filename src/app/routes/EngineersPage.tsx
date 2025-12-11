import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { StatusPill } from '../../ui/components/StatusPill';
import { useAllEngineerMetrics, useCells } from '../../ui/hooks/useDomainData';
import { Search, ArrowUpDown, Copy, Check, AlertTriangle, ShieldCheck, Users, Gauge } from 'lucide-react';
import { Cell } from '../../domain/core';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../ui/components/EmptyState';

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

    const atRiskEngineers = metrics.filter(m => m.atRiskCellsCount > 0).length;
    const avgCompletion =
        metrics.length > 0
            ? Math.round(metrics.reduce((sum, m) => sum + m.avgCompletion, 0) / metrics.length)
            : 0;

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

    const ProgressBar = ({ value }: { value: number }) => (
        <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 transition-all"
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{value}%</span>
        </div>
    );

    const EngineerCell = ({ name, projects }: { name: string; projects: string }) => (
        <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200 flex items-center justify-center text-sm font-bold shrink-0">
                {name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">{name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{projects || '—'}</div>
            </div>
        </div>
    );

    const SortHeader = ({ label, keyName }: { label: string, keyName: SortKey }) => (
        <button
            onClick={(e) => { e.stopPropagation(); handleSort(keyName); }}
            className="flex items-center space-x-1 hover:text-indigo-600 text-sm font-semibold text-gray-700 dark:text-gray-200"
        >
            <span>{label}</span>
            <ArrowUpDown className="h-3 w-3" />
        </button>
    );

    const columns: Column<typeof metrics[0]>[] = [
        {
            header: <SortHeader label="Engineer" keyName="name" />,
            accessor: (m) => <EngineerCell name={m.name} projects={m.projectNames} />
        },
        { header: 'Projects', accessor: (m) => <span className="text-xs text-gray-600 dark:text-gray-400">{m.projectNames}</span> },
        { header: <SortHeader label="Cells" keyName="cellCount" />, accessor: (m) => m.cellCount },
        {
            header: <SortHeader label="At Risk" keyName="atRiskCellsCount" />, accessor: (m) => (
                m.atRiskCellsCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-100 dark:border-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {m.atRiskCellsCount}
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">0</span>
                )
            )
        },
        {
            header: <SortHeader label="Avg % Complete" keyName="avgCompletion" />, accessor: (m) => (
                <ProgressBar value={m.avgCompletion} />
            )
        },
    ];

    // Selected Engineer Details
    const selectedEngineerCells = selectedEngineerName
        ? allCells.filter(c => c.assignedEngineer === selectedEngineerName)
        : [];

    const cellColumns: Column<Cell>[] = [
        { header: 'Cell Name', accessor: (c) => <Link to={`/projects/${c.projectId}/cells/${encodeURIComponent(c.id)}`} className="text-blue-600 hover:underline">{c.name}</Link> },
        { header: 'Station', accessor: (c) => c.code || '-' },
        { header: 'Line', accessor: (c) => c.lineCode || '-' },
        { header: 'Status', accessor: (c) => <StatusPill status={c.status} /> },
        { header: '% Complete', accessor: (c) => c.simulation ? `${c.simulation.percentComplete}%` : '-' },
        { header: 'Issues', accessor: (c) => c.simulation?.hasIssues ? <AlertTriangle className="h-4 w-4 text-red-500" /> : '-' },
    ];

    const navigate = useNavigate();

    if (metrics.length === 0) {
        return (
            <div className="space-y-8">
                <PageHeader title="Engineers" subtitle="Workload & risk overview" />
                <EmptyState
                    title="No Engineers Found"
                    message="Ensure 'PERSONS RESPONSIBLE' is filled in the Simulation Status Excel files."
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <PageHeader title="Engineers" subtitle="Workload & risk overview" />
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                        {copied ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                        {copied ? 'Copied' : 'Copy Summary'}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm">
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-200">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 font-semibold">Total Engineers</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{metrics.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-200">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 font-semibold">With At-Risk Cells</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{atRiskEngineers}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-200">
                            <Gauge className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 font-semibold">Avg Completion</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{avgCompletion}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="relative rounded-lg max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="Search engineers by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 font-semibold">Roster</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Click a row to see assignments</p>
                    </div>
                </div>
                <DataTable
                    data={sortedMetrics}
                    columns={columns}
                    emptyMessage="No engineers match your filter."
                    onRowClick={(row) => setSelectedEngineerName(row.name === selectedEngineerName ? null : row.name)}
                />
            </div>

            {/* Selected Engineer Detail */}
            {selectedEngineerName && (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-indigo-200 dark:border-indigo-700 p-6 animate-fade-in">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-indigo-500 font-semibold">Assignments</p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedEngineerName}</h3>
                        </div>
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
