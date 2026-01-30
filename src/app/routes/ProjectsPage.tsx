import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { useAllProjectMetrics } from '../../ui/hooks/useDomainData';
import { ArrowUpDown, Building2, Users, AlertTriangle, TrendingUp, Grid, List, ArrowRight, Layers } from 'lucide-react';
import { cn } from '../../ui/lib/utils';
import { PageHint } from '../../ui/components/PageHint';
import { EmptyState } from '../../ui/components/EmptyState';

type SortKey = 'name' | 'avgCompletion' | 'atRiskCellsCount' | 'cellCount';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export function ProjectsPage() {
    const projects = useAllProjectMetrics();
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const navigate = useNavigate();

    const totals = useMemo(() => {
        const totalProjects = projects.length;
        const totalStations = projects.reduce((sum, p) => sum + p.cellCount, 0);
        const totalAtRisk = projects.reduce((sum, p) => sum + p.atRiskCellsCount, 0);
        const weightedCompletionDenominator = projects.reduce((sum, p) => sum + p.cellCount, 0);
        const weightedCompletionNumerator = projects.reduce((sum, p) => sum + (p.avgCompletion * p.cellCount), 0);
        const avgCompletion = weightedCompletionDenominator > 0
            ? Math.round(weightedCompletionNumerator / weightedCompletionDenominator)
            : 0;
        return { totalProjects, totalStations, totalAtRisk, avgCompletion };
    }, [projects]);

    if (projects.length === 0) {
        return (
            <div className="space-y-4">
                <PageHeader
                    title="Projects"
                    subtitle={
                        <PageHint
                            standardText="Manage all simulation projects"
                            flowerText="Where manufacturing dreams take shape."
                        />
                    }
                />
                <EmptyState
                    title="No Projects Found"
                    message="Please go to the Data Loader to import your simulation files."
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                    icon={<Building2 className="h-7 w-7" />}
                />
            </div>
        );
    }

    type ProjectWithMetrics = typeof projects[0];

    const getSortedProjects = () => {
        return [...projects].sort((a, b) => {
            const getValue = (project: ProjectWithMetrics, key: SortKey): any => {
                if (key === 'name') return project.name;
                if (key === 'avgCompletion') return project.avgCompletion;
                if (key === 'atRiskCellsCount') return project.atRiskCellsCount;
                if (key === 'cellCount') return project.cellCount;
                return '';
            };

            const valA = getValue(a, sortKey);
            const valB = getValue(b, sortKey);

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
            case 'onHold':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800';
            case 'completed':
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Active';
            case 'onHold': return 'On Hold';
            case 'completed': return 'Completed';
            default: return status;
        }
    };

    const SummaryCard = ({
        label,
        value,
        icon,
        description,
        accent,
    }: {
        label: string;
        value: string | number;
        icon: React.ReactNode;
        description?: string;
        accent?: string;
    }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 h-full shadow-sm flex items-center justify-between gap-3">
            <div className="space-y-0.5">
                <div className={cn("typography-metric text-gray-900 dark:text-white", accent)}>{value}</div>
                <div className="typography-label text-gray-700 dark:text-gray-200">{label}</div>
                {description && (
                    <div className="typography-caption text-gray-500 dark:text-gray-400">{description}</div>
                )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                {icon}
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title="Projects"
                subtitle={
                    <PageHint
                        standardText="Manage all simulation projects"
                        flowerText="Where manufacturing dreams take shape."
                    />
                }
            />

            {/* Top summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard
                    label="Projects"
                    value={totals.totalProjects}
                    icon={<Layers className="h-4 w-4 text-sky-600" />}
                    accent="text-sky-700"
                    description="Active portfolios"
                />
                <SummaryCard
                    label="Stations"
                    value={totals.totalStations}
                    icon={<Users className="h-4 w-4 text-purple-600" />}
                    accent="text-purple-700"
                    description="Total stations across projects"
                />
                <SummaryCard
                    label="Avg Completion"
                    value={`${totals.avgCompletion}%`}
                    icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                    accent="text-emerald-700"
                    description="Weighted by station count"
                />
                <SummaryCard
                    label="At Risk"
                    value={totals.totalAtRisk}
                    icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                    accent="text-amber-700"
                    description="Stations needing attention"
                />
            </div>

            {/* Controls Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Sort Dropdown */}
                        <select
                            value={sortKey}
                            onChange={(e) => {
                                setSortKey(e.target.value as SortKey);
                                setSortDir('asc');
                            }}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="cellCount">Sort by Station Count</option>
                            <option value="avgCompletion">Sort by Completion</option>
                            <option value="atRiskCellsCount">Sort by At Risk</option>
                        </select>

                        <button
                            onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            <ArrowUpDown className={cn("h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform", sortDir === 'desc' && 'rotate-180')} />
                        </button>

                        {/* View Toggle */}
                        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-1.5 transition-colors",
                                    viewMode === 'grid'
                                        ? "bg-blue-600 text-white"
                                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                )}
                                title="Grid View"
                            >
                                <Grid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-1.5 transition-colors border-l border-gray-300 dark:border-gray-600",
                                    viewMode === 'list'
                                        ? "bg-blue-600 text-white"
                                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                )}
                                title="List View"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Projects Grid/List */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getSortedProjects().map((project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="group block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
                        >
                            <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                        <Building2 className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {project.name}
                                            </h3>
                                            {project.customer && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                    {project.customer}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap", getStatusColor(project.status))}>
                                        {getStatusLabel(project.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2">
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                                            <Users className="h-3 w-3" />
                                            <span className="text-[10px] font-medium">Stations</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                            {project.cellCount}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2">
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                                            <TrendingUp className="h-3 w-3" />
                                            <span className="text-[10px] font-medium">Completion</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                            {project.avgCompletion}%
                                        </div>
                                        <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    project.avgCompletion >= 80
                                                        ? "bg-emerald-500"
                                                        : project.avgCompletion >= 50
                                                            ? "bg-amber-500"
                                                            : "bg-rose-500"
                                                )}
                                                style={{ width: `${Math.min(project.avgCompletion, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1.5 rounded-md border",
                                        project.atRiskCellsCount > 0
                                            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                                            : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                                    )}
                                >
                                    <AlertTriangle
                                        className={cn(
                                            "h-3 w-3 flex-shrink-0",
                                            project.atRiskCellsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            "text-xs font-medium",
                                            project.atRiskCellsCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-300"
                                        )}
                                    >
                                        {project.atRiskCellsCount > 0
                                            ? `${project.atRiskCellsCount} ${project.atRiskCellsCount === 1 ? 'station' : 'stations'} at risk`
                                            : 'All stations on track'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                    View project details
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 group-hover:translate-x-1 transition-all duration-200" />
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {getSortedProjects().map((project, idx) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                                idx !== projects.length - 1 && "border-b border-gray-200 dark:border-gray-700"
                            )}
                        >
                            <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {project.name}
                                    </h3>
                                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap", getStatusColor(project.status))}>
                                        {getStatusLabel(project.status)}
                                    </span>
                                </div>
                                {project.customer && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                        {project.customer}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Stations</div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{project.cellCount}</div>
                                </div>

                                <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{project.avgCompletion}%</div>
                                </div>

                                {project.atRiskCellsCount > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded">
                                        <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                        <span className="text-xs font-medium text-rose-700 dark:text-rose-400 whitespace-nowrap">
                                            {project.atRiskCellsCount} at risk
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProjectsPage
