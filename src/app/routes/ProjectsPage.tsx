import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAllProjectMetrics } from '../../ui/hooks/useDomainData'
import {
  Building2,
  AlertTriangle,
  ArrowRight,
  Layers,
  ChevronRight,
  Target,
  Search,
  ChevronDown,
} from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import { EmptyState } from '../../ui/components/EmptyState'
import { StatCard } from '../../ui/components/StatCard'

type SortKey = 'name' | 'avgCompletion' | 'atRiskCellsCount' | 'cellCount'
type SortDirection = 'asc' | 'desc'
export function ProjectsPage() {
  const projects = useAllProjectMetrics()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const sortDir: SortDirection = 'asc'
  const [searchQuery, setSearchQuery] = useState('')
  const viewMode = 'grid' as const
  const navigate = useNavigate()

  const totals = useMemo(() => {
    const totalProjects = projects.length
    const totalStations = projects.reduce((sum, p) => sum + p.cellCount, 0)
    const totalAtRisk = projects.reduce((sum, p) => sum + p.atRiskCellsCount, 0)
    const weightedCompletionDenominator = projects.reduce((sum, p) => sum + p.cellCount, 0)
    const weightedCompletionNumerator = projects.reduce(
      (sum, p) => sum + p.avgCompletion * p.cellCount,
      0,
    )
    const avgCompletion =
      weightedCompletionDenominator > 0
        ? Math.round(weightedCompletionNumerator / weightedCompletionDenominator)
        : 0
    return { totalProjects, totalStations, totalAtRisk, avgCompletion }
  }, [projects])

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 dark:text-gray-200">Projects Portfolio</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
                Simulation <span className="text-indigo-600 dark:text-indigo-400">Projects</span>
              </h1>
              <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-1">
                Infrastructure Portfolio
              </h2>
            </div>
          </div>
        </div>
        <EmptyState
          title="No Projects Found"
          message="Please go to the Data Loader to import your simulation files."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
          icon={<Building2 className="h-7 w-7" />}
        />
      </div>
    )
  }

  type ProjectWithMetrics = (typeof projects)[0]

  const getSortedProjects = () => {
    let filtered = [...projects]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.customer && p.customer.toLowerCase().includes(q)),
      )
    }

    return filtered.sort((a, b) => {
      const getValue = (project: ProjectWithMetrics, key: SortKey): any => {
        if (key === 'name') return project.name
        if (key === 'avgCompletion') return project.avgCompletion
        if (key === 'atRiskCellsCount') return project.atRiskCellsCount
        if (key === 'cellCount') return project.cellCount
        return ''
      }

      const valA = getValue(a, sortKey)
      const valB = getValue(b, sortKey)

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Running':
        return 'Active'
      case 'OnHold':
        return 'On Hold'
      case 'Closed':
        return 'Closed'
      case 'Planning':
        return 'Planning'
      default:
        return status
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 dark:text-gray-200">Projects</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              Simulation <span className="text-indigo-600 dark:text-indigo-400">Projects</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Total Projects"
            value={totals.totalProjects}
            icon={<Layers className="h-6 w-6 text-indigo-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Active Stations"
            value={totals.totalStations}
            icon={<Target className="h-6 w-6 text-emerald-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500/20 to-orange-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="At Risk"
            value={totals.totalAtRisk}
            icon={<AlertTriangle className="h-6 w-6 text-rose-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-rose-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative group w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter projects by name or customer..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
            />
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
              {getSortedProjects().length} Results
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-sm hover:border-indigo-500/50 transition-all"
            >
              <option value="cellCount">Sort: Station Count</option>
              <option value="avgCompletion">Sort: Progress</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Projects Grid / Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {getSortedProjects().map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group relative bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 p-5"
            >
              {/* Accent Glow */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-2xl opacity-40 group-hover:opacity-80 transition-opacity" />

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight tracking-tight truncate">
                      {project.name}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                      {project.customer || 'Internal Project'}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border',
                    project.status === 'Running'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : project.status === 'OnHold'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-gray-500/10 text-gray-500 border-gray-500/20',
                  )}
                >
                  {getStatusLabel(project.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Stations
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">
                    {project.cellCount}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Progress Status
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-white text-right">
                    {project.avgCompletion}%
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-6">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    project.avgCompletion >= 90
                      ? 'bg-emerald-500'
                      : project.avgCompletion >= 50
                        ? 'bg-indigo-500'
                        : 'bg-rose-500',
                  )}
                  style={{ width: `${project.avgCompletion}%` }}
                />
              </div>

              <div
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors',
                  project.atRiskCellsCount > 0
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-500'
                    : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500',
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  <span>
                    {project.atRiskCellsCount > 0
                      ? `${project.atRiskCellsCount} Risks Identified`
                      : 'Project Stable'}
                  </span>
                </div>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm"
          style={{ backgroundColor: 'rgb(18, 24, 39)' }}
        >
          <table
            className="min-w-full divide-y divide-gray-700 text-sm"
            style={{ backgroundColor: 'rgb(18, 24, 39)' }}
          >
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(18, 24, 39)' }}>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-3 px-3 pl-4 sm:pl-4 text-sm font-semibold">Project</th>
                <th className="py-3 px-3 text-sm font-semibold">Customer</th>
                <th className="py-3 px-3 text-sm font-semibold text-center whitespace-nowrap">
                  Units
                </th>
                <th className="py-3 px-3 text-sm font-semibold text-center whitespace-nowrap">
                  Progress
                </th>
                <th className="py-3 px-3 text-sm font-semibold text-center">Status</th>
                <th className="py-3 px-3 text-sm font-semibold text-center whitespace-nowrap">
                  Risk
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y divide-gray-700 text-gray-200"
              style={{ backgroundColor: 'rgb(18, 24, 39)' }}
            >
              {getSortedProjects().map((project) => (
                <tr
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group hover:bg-gray-800/60 transition-colors cursor-pointer"
                >
                  <td className="whitespace-nowrap py-3 px-3 pl-4 sm:pl-4">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline block truncate max-w-[220px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap py-3 px-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    {project.customer || '--'}
                  </td>
                  <td className="whitespace-nowrap py-3 px-3 text-center text-sm font-black text-gray-900 dark:text-white tabular-nums">
                    {project.cellCount}
                  </td>
                  <td className="whitespace-nowrap py-3 px-3">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-24 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            project.avgCompletion >= 90
                              ? 'bg-emerald-500'
                              : project.avgCompletion >= 50
                                ? 'bg-indigo-500'
                                : 'bg-rose-500',
                          )}
                          style={{ width: `${project.avgCompletion}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-gray-700 dark:text-gray-300 tabular-nums w-10 text-right">
                        {project.avgCompletion}%
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-3 px-3 text-center">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border',
                        project.status === 'Running'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : project.status === 'OnHold'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-gray-500/10 text-gray-500 border-gray-500/20',
                      )}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 px-3 text-center">
                    {project.atRiskCellsCount > 0 ? (
                      <div className="inline-flex items-center gap-1.5 text-rose-500">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {project.atRiskCellsCount} AT RISK
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                        STABLE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
