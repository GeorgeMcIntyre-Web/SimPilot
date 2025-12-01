import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage';
import { PageHeader } from '../../ui/components/PageHeader';
import { KpiTile } from '../../ui/components/KpiTile';
import { DataTable, Column } from '../../ui/components/DataTable';
import { StatusPill } from '../../ui/components/StatusPill';
import { useGlobalSimulationMetrics, useCells, useAllEngineerMetrics, useAllProjectMetrics, useHasSimulationData } from '../../ui/hooks/useDomainData';
import { Cell } from '../../domain/core';
import { LayoutDashboard, FolderKanban, Factory, AlertTriangle, ArrowUpDown, Users, Copy, Check } from 'lucide-react';
import { FlowerAccent } from '../../ui/components/FlowerAccent';
import { FlowerEmptyState } from '../../ui/components/FlowerEmptyState';
import { PageHint } from '../../ui/components/PageHint';
import { DaleDashboardIntro } from '../../ui/components/DaleDashboardIntro';
import { useDaleDayMood } from '../../ui/hooks/useDaleDayMood';
import { FirstRunBanner } from '../../ui/components/FirstRunBanner';

type SortKey = 'percentComplete' | 'name' | 'status';
type SortDirection = 'asc' | 'desc';

export function DashboardPage() {
    const metrics = useGlobalSimulationMetrics();
    const engineerMetrics = useAllEngineerMetrics();
    const projectMetrics = useAllProjectMetrics();
    const cells = useCells();
    const hasData = useHasSimulationData();
    console.log('DashboardPage render. hasData:', hasData);
    const navigate = useNavigate();
    const mood = useDaleDayMood();

    const [isDaleMode, setIsDaleMode] = useState(() => getUserPreference('simpilot.dashboard.mode', true));

    useEffect(() => {
        setUserPreference('simpilot.dashboard.mode', isDaleMode);
    }, [isDaleMode]);
    const [sortKey, setSortKey] = useState<SortKey>('percentComplete');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');
    const [copied, setCopied] = useState(false);

    // Guard clause for empty state
    if (!hasData) {
        return (
            <div className="space-y-8">
                <PageHeader
                    title="Dashboard"
                    subtitle={
                        <PageHint
                            standardText="Overview of simulation progress"
                            flowerText="Load the demo from Data Loader to see a full, realistic example."
                        />
                    }
                />

                <FirstRunBanner />

                {isDaleMode && <DaleDashboardIntro />}

                <FlowerEmptyState
                    title="Welcome to SimPilot"
                    message="No data loaded yet. Plant some data by loading files in the Data Loader."
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                />
            </div>
        );
    }

    const atRiskCells = cells.filter((c: Cell) => {
        if (!c.simulation) return false;
        return c.simulation.hasIssues || (c.simulation.percentComplete > 0 && c.simulation.percentComplete < 100 && c.status === 'Blocked');
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    const getSortedCells = () => {
        return [...atRiskCells].sort((a, b) => {
            const getValue = (cell: Cell, key: SortKey): string | number => {
                if (key === 'percentComplete') return cell.simulation?.percentComplete || 0;
                if (key === 'name') return cell.name;
                if (key === 'status') return cell.status;
                return '';
            };

            const valA = getValue(a, sortKey);
            const valB = getValue(b, sortKey);

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const handleCopy = async () => {
        if (!navigator.clipboard) return;

        const summary = `SimPilot Dashboard Summary\n\n` +
            `Total Projects: ${metrics.totalProjects}\n` +
            `Total Cells: ${metrics.totalCells}\n` +
            `Avg Completion: ${metrics.avgCompletion}%\n` +
            `At Risk Cells: ${metrics.atRiskCellsCount}\n\n` +
            `Top At Risk Engineers:\n` +
            engineerMetrics.slice(0, 5).map(e => `- ${e.name}: ${e.atRiskCellsCount} at risk`).join('\n');

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
            onClick={() => handleSort(keyName)}
            className="flex items-center space-x-1 hover:text-blue-600 font-medium"
        >
            <span>{label}</span>
            <ArrowUpDown className="h-3 w-3" />
        </button>
    );

    const atRiskColumns: Column<Cell>[] = [
        { header: <SortHeader label="Cell Name" keyName="name" />, accessor: (c) => <Link to={`/projects/${c.projectId}/cells/${c.id}`} className="text-blue-600 hover:underline font-medium">{c.name}</Link> },
        { header: 'Station', accessor: (c) => c.code },
        { header: <SortHeader label="Status" keyName="status" />, accessor: (c) => <StatusPill status={c.status} /> },
        { header: <SortHeader label="% Complete" keyName="percentComplete" />, accessor: (c) => c.simulation ? `${c.simulation.percentComplete}%` : '-' },
        { header: 'Issues', accessor: (c) => c.simulation?.hasIssues ? <span className="text-red-600 font-bold">Yes</span> : 'No' },
    ];

    const engineerColumns: Column<typeof engineerMetrics[0]>[] = [
        { header: 'Engineer', accessor: (e) => <div className="font-medium">{e.name}</div> },
        { header: 'Projects', accessor: (e) => <span className="text-xs text-gray-500">{e.projectNames}</span> },
        { header: 'Cells', accessor: (e) => e.cellCount },
        { header: 'At Risk', accessor: (e) => e.atRiskCellsCount > 0 ? <span className="text-red-600 font-bold">{e.atRiskCellsCount}</span> : '0' },
        { header: 'Avg %', accessor: (e) => `${e.avgCompletion}%` },
    ];

    const projectColumns: Column<typeof projectMetrics[0]>[] = [
        { header: 'Project', accessor: (p) => <Link to={`/projects/${p.id}`} className="text-blue-600 hover:underline font-medium">{p.name}</Link> },
        { header: 'Cells', accessor: (p) => p.cellCount },
        { header: 'At Risk', accessor: (p) => p.atRiskCellsCount > 0 ? <span className="text-red-600 font-bold">{p.atRiskCellsCount}</span> : '0' },
        { header: 'Avg %', accessor: (p) => `${p.avgCompletion}%` },
    ];

    return (
        <div className="space-y-8" data-testid="dashboard-root">
            <div className="flex justify-between items-start">
                <PageHeader
                    title={
                        <span className="flex items-center">
                            Dashboard <FlowerAccent className="ml-2 h-6 w-6 text-rose-400" />
                        </span>
                    }
                    subtitle={
                        <PageHint
                            standardText="Overview of simulation progress"
                            flowerText={
                                mood === 'calm'
                                    ? "Garden status: mostly calm today 🌿"
                                    : mood === 'spiky' || mood === 'stormy'
                                        ? "Garden has a few thorns today – I’ve highlighted the worst cells for you."
                                        : "Quick health check of all projects and cells."
                            }
                        />
                    }
                />
                <div className="flex items-center space-x-4">
                    {isDaleMode && (
                        <>
                            <Link
                                to="/dale-console"
                                data-testid="open-dale-console"
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm mr-2"
                            >
                                Open Dale Console
                            </Link>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                                {copied ? 'Copied' : 'Copy Summary'}
                            </button>
                        </>
                    )}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setIsDaleMode(false)}
                            aria-pressed={!isDaleMode}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!isDaleMode ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Standard
                        </button>
                        <button
                            onClick={() => setIsDaleMode(true)}
                            data-testid="dashboard-dale-toggle"
                            aria-pressed={isDaleMode}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isDaleMode ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Dale Mode
                        </button>
                    </div>
                </div>
            </div>

            <FirstRunBanner />

            {/* KPI Tiles (Global) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiTile
                    label="Total Projects"
                    value={metrics.totalProjects}
                    icon={<FolderKanban className="h-6 w-6 text-indigo-500" />}
                    data-testid="kpi-total-projects"
                />
                <KpiTile
                    label="Total Cells"
                    value={metrics.totalCells}
                    icon={<Factory className="h-6 w-6 text-emerald-600" />}
                    data-testid="kpi-total-cells"
                />
                <KpiTile
                    label="Avg Completion"
                    value={`${metrics.avgCompletion}%`}
                    description="Across all active cells"
                    icon={<LayoutDashboard className="h-6 w-6 text-rose-500" />}
                />
                <KpiTile
                    label="At Risk Cells"
                    value={metrics.atRiskCellsCount}
                    description="Blocked or with issues"
                    icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
                    data-testid="kpi-at-risk-cells"
                />
            </div>

            {isDaleMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top At Risk Cells */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 lg:col-span-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                            Top At-Risk Cells (Global)
                        </h3>
                        <DataTable
                            data={atRiskCells.sort((a: Cell, b: Cell) => (a.simulation?.percentComplete || 0) - (b.simulation?.percentComplete || 0)).slice(0, 10)}
                            columns={atRiskColumns}
                            emptyMessage="No cells currently at risk."
                        />
                    </div>

                    {/* Engineers Summary */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                <Users className="h-5 w-5 text-blue-500 mr-2" />
                                Engineers Summary
                            </h3>
                            <Link to="/engineers" className="text-sm text-blue-600 hover:underline">View All</Link>
                        </div>
                        <DataTable
                            data={engineerMetrics.slice(0, 5)}
                            columns={engineerColumns}
                            emptyMessage="No engineer data available."
                            onRowClick={() => navigate('/engineers')}
                        />
                    </div>

                    {/* Projects Snapshot */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                <FolderKanban className="h-5 w-5 text-purple-500 mr-2" />
                                Projects Snapshot
                            </h3>
                            <Link to="/projects" className="text-sm text-blue-600 hover:underline">View All</Link>
                        </div>
                        <DataTable
                            data={projectMetrics}
                            columns={projectColumns}
                            emptyMessage="No projects loaded."
                        />
                    </div>
                </div>
            ) : (
                /* Standard Mode */
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">At Risk Cells</h3>
                    <DataTable
                        data={getSortedCells()}
                        columns={atRiskColumns}
                        emptyMessage="No cells currently at risk."
                    />
                </div>
            )}
        </div>
    );
}
