import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { useAllProjectMetrics } from '../../ui/hooks/useDomainData';
import { ArrowUpDown, Building2, Users, AlertTriangle, TrendingUp, Grid, List } from 'lucide-react';
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

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

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

            {/* Controls Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getSortedProjects().map((project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
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

                            {/* Content */}
                            <div className="p-4 space-y-3">
                                {/* Metrics Row */}
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
                                    </div>
                                </div>

                                {/* At Risk */}
                                {project.atRiskCellsCount > 0 && (
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-md">
                                        <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                        <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
                                            {project.atRiskCellsCount} {project.atRiskCellsCount === 1 ? 'station' : 'stations'} at risk
                                        </span>
                                    </div>
                                )}
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
                            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />

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
