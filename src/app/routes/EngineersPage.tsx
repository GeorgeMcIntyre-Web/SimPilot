import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { StatusPill } from '../../ui/components/StatusPill';
import { useAllEngineerMetrics, useCells, useProjects } from '../../ui/hooks/useDomainData';
import { Search, ArrowUpDown, Copy, Check, AlertTriangle, ShieldCheck, Users, Gauge } from 'lucide-react';
import { Cell, SchedulePhase } from '../../domain/core';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../ui/components/EmptyState';
import { log } from '../../lib/log';

type SortKey = 'name' | 'cellCount' | 'atRiskCellsCount' | 'avgCompletion';
type SortDirection = 'asc' | 'desc';

export function EngineersPage() {
    const metrics = useAllEngineerMetrics();
    const allCells = useCells();
    const projects = useProjects();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('atRiskCellsCount');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [selectedEngineerName, setSelectedEngineerName] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [atRiskOnly, setAtRiskOnly] = useState(false);
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [completionBand, setCompletionBand] = useState<'all' | 'low' | 'mid' | 'high' | 'no-data'>('all');
    const [loadFilter, setLoadFilter] = useState<'all' | 'light' | 'medium' | 'heavy'>('all');
    const [phaseFilter, setPhaseFilter] = useState<SchedulePhase | 'all'>('all');

    const atRiskEngineers = metrics.filter(m => m.atRiskCellsCount > 0).length;
    const avgCompletion =
        metrics.length > 0
            ? Math.round(metrics.reduce((sum, m) => sum + m.avgCompletion, 0) / metrics.length)
            : 0;

    const engineerCellsMap = useMemo(() => {
        const map = new Map<string, Cell[]>();
        allCells.forEach(cell => {
            const name = cell.assignedEngineer?.trim();
            if (!name) return;
            const list = map.get(name) || [];
            list.push(cell);
            map.set(name, list);
        });
        return map;
    }, [allCells]);

    const getCompletionBand = (value: number) => {
        if (value === null || Number.isNaN(value)) return 'no-data';
        if (value <= 0) return 'low';
        if (value < 50) return 'low';
        if (value < 80) return 'mid';
        return 'high';
    };

    const filteredMetrics = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const completionBandFor = (metricName: string, avg: number) => {
            const cells = engineerCellsMap.get(metricName) || [];
            const withSim = cells.filter(c => c.simulation && c.simulation.percentComplete >= 0);
            if (withSim.length === 0) return 'no-data';
            return getCompletionBand(avg);
        };

        return metrics.filter(m => {
            if (term && !m.name.toLowerCase().includes(term)) return false;
            if (atRiskOnly && m.atRiskCellsCount === 0) return false;
            if (projectFilter !== 'all') {
                const cells = engineerCellsMap.get(m.name) || [];
                if (!cells.some(c => c.projectId === projectFilter)) return false;
            }
            if (phaseFilter !== 'all') {
                const cells = engineerCellsMap.get(m.name) || [];
                if (!cells.some(c => (c.schedule?.phase ?? 'unspecified') === phaseFilter)) return false;
            }
            if (loadFilter !== 'all') {
                const count = m.cellCount;
                const matchesLoad =
                    (loadFilter === 'light' && count <= 3) ||
                    (loadFilter === 'medium' && count > 3 && count <= 6) ||
                    (loadFilter === 'heavy' && count > 6);
                if (!matchesLoad) return false;
            }
            if (completionBand !== 'all') {
                const band = completionBandFor(m.name, m.avgCompletion);
                if (band !== completionBand) return false;
            }
            return true;
        });
    }, [metrics, searchTerm, atRiskOnly, projectFilter, phaseFilter, loadFilter, completionBand, engineerCellsMap]);

    const sortedMetrics = useMemo(() => {
        return [...filteredMetrics].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredMetrics, sortKey, sortDir]);

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
            log.error('Failed to copy', err);
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
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[260px] md:max-w-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                placeholder="Search engineers by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="inline-flex items-center justify-center h-10 px-3 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                        <button
                            onClick={() => setAtRiskOnly(prev => !prev)}
                            className={`inline-flex items-center gap-1 px-3 h-10 rounded-lg text-xs font-semibold border ${atRiskOnly
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            At-risk only
                        </button>

                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <select
                            value={phaseFilter}
                            onChange={(e) => setPhaseFilter(e.target.value as SchedulePhase | 'all')}
                            className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All phases</option>
                            <option value="presim">Pre-sim</option>
                            <option value="offline">Offline</option>
                            <option value="onsite">On-site</option>
                            <option value="rampup">Ramp-up</option>
                            <option value="handover">Handover</option>
                            <option value="unspecified">Unspecified</option>
                        </select>

                        <select
                            value={completionBand}
                            onChange={(e) => setCompletionBand(e.target.value as typeof completionBand)}
                            className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All completion</option>
                            <option value="low">&lt; 50%</option>
                            <option value="mid">50–79%</option>
                            <option value="high">80–100%</option>
                            <option value="no-data">No data</option>
                        </select>

                        <select
                            value={loadFilter}
                            onChange={(e) => setLoadFilter(e.target.value as typeof loadFilter)}
                            className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All loads</option>
                            <option value="light">0–3 cells</option>
                            <option value="medium">4–6 cells</option>
                            <option value="heavy">7+ cells</option>
                        </select>
                    </div>
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
                    density="compact"
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
                        density="compact"
                        emptyMessage="No cells assigned to this engineer."
                    />
                </div>
            )}
        </div>
    );
}

export default EngineersPage
