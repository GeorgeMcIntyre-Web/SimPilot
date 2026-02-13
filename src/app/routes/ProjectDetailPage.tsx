import { useState, useMemo } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Activity,
  Target,
  Layers,
  AlertTriangle,
  Search,
  Building2,
} from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import { StatCard } from '../../ui/components/StatCard'
import { useProjectById, useAreas, useCells, useProjectMetrics } from '../../ui/hooks/useDomainData'
import { Cell, Area } from '../../domain/core'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const project = useProjectById(projectId || '')
  const areas = useAreas(projectId)
  const cells = useCells(projectId)
  const [searchParams, setSearchParams] = useSearchParams()
  const projectMetrics = useProjectMetrics(projectId || '')
  const navigate = useNavigate()

  // Directly derive selectedAreaId from URL, defaulting to 'ALL'
  const selectedAreaId = useMemo(() => {
    const fromUrl = searchParams.get('areaId')
    if (!fromUrl || fromUrl.trim() === '') return 'ALL'
    return fromUrl.trim()
  }, [searchParams])

  const [areaSearch, setAreaSearch] = useState('')
  const [stationSearch, setStationSearch] = useState('')

  // Sidebar area search filter
  const normalizedAreaSearch = areaSearch.trim().toLowerCase()
  const visibleAreas = useMemo(() => {
    return normalizedAreaSearch
      ? areas.filter((a: Area) => a.name.toLowerCase().includes(normalizedAreaSearch))
      : areas
  }, [areas, normalizedAreaSearch])

  // Filter cells based on the selected area ID from the URL and station search
  const filteredCells = useMemo(() => {
    let result = cells

    const normalizedSelected = selectedAreaId.toUpperCase()
    if (normalizedSelected !== 'ALL' && normalizedSelected !== '') {
      result = result.filter((c: Cell) => c.areaId?.trim() === selectedAreaId)
    }

    if (stationSearch.trim()) {
      const q = stationSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.assignedEngineer?.toLowerCase().includes(q),
      )
    }

    return result
  }, [cells, selectedAreaId, stationSearch])

  if (!project || !projectMetrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Building2 className="h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Project Not Found</h2>
        <p className="text-gray-500">The project you are looking for does not exist.</p>
        <Link
          to="/projects"
          className="text-indigo-600 hover:text-indigo-500 font-bold uppercase text-xs tracking-widest"
        >
          Back to Projects
        </Link>
      </div>
    )
  }

  const getStationLabel = (c: Cell): string => {
    if (c.code) return c.code
    if (c.name?.includes(' - ')) {
      const parts = c.name.split(' - ')
      return parts[parts.length - 1]
    }
    return c.name || ''
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

  const getCellStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'Blocked':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      case 'InProgress':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
      case 'ReadyForReview':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            SimPilot
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/projects" className="hover:text-indigo-600 transition-colors">
            Projects
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 dark:text-gray-200">{project.name}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              {project.name.split(' ')[0]}{' '}
              <span className="text-indigo-600 dark:text-indigo-400">
                {project.name.split(' ').slice(1).join(' ') || 'Node'}
              </span>
            </h1>
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-1">
              Project Intelligence
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-3">
              <div
                className={cn(
                  'h-2 w-2 rounded-full animate-pulse',
                  project.status === 'Running' ? 'bg-emerald-500' : 'bg-amber-500',
                )}
              />
              <div>
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">
                  Project Status
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                  {getStatusLabel(project.status)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Total Stations"
            value={projectMetrics.cellCount}
            icon={<Target className="h-6 w-6 text-indigo-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Avg Completion"
            value={`${projectMetrics.avgCompletion}%`}
            icon={<Activity className="h-6 w-6 text-emerald-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Active Areas"
            value={areas.length}
            icon={<Layers className="h-6 w-6 text-blue-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-blue-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500/20 to-orange-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="At Risk"
            value={projectMetrics.atRiskCellsCount}
            icon={<AlertTriangle className="h-6 w-6 text-rose-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-rose-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar: Areas */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col sticky top-24">
            <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20">
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
                Project Areas
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  placeholder="Filter areas..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
                />
              </div>

              <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                <button
                  onClick={() => setSearchParams({ areaId: 'ALL' })}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border outline-none',
                    selectedAreaId.toUpperCase() === 'ALL'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-indigo-500/50',
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    All Areas
                  </span>
                  <Activity className="h-3 w-3 opacity-50" />
                </button>
                {visibleAreas.map((area: Area) => (
                  <button
                    key={area.id}
                    onClick={() => setSearchParams({ areaId: area.id })}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl transition-all border outline-none',
                      selectedAreaId === area.id
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-indigo-500/50',
                    )}
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest truncate">
                      {area.name}
                    </div>
                  </button>
                ))}
                {visibleAreas.length === 0 && (
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center py-8">
                    No results
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/20">
              <Link
                to={`/timeline/${project.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:border-indigo-500/50 transition-all shadow-sm"
              >
                <Activity className="h-3 w-3" />
                View Project Timeline
              </Link>
            </div>
          </div>
        </div>

        {/* Right Content: Stations Table */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Project <span className="text-indigo-600 dark:text-indigo-400">Stations</span>
              <span className="ml-3 text-xs font-black text-gray-400 tabular-nums">
                ({filteredCells.length})
              </span>
            </h2>

            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                placeholder="Search stations..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto max-h-[800px] overflow-y-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50/50 dark:bg-gray-900/50 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Station Node
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Area Sector
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Lead Engineer
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Sync Status
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      State
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[rgb(31,41,55)]">
                  {filteredCells.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Target className="h-8 w-8 text-gray-200" />
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            No station nodes found
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCells.map((cell) => {
                      const stationLabel = getStationLabel(cell)
                      const areaName = areas.find((a: Area) => a.id === cell.areaId)?.name || '-'
                      const percent = cell.simulation?.percentComplete || 0

                      return (
                        <tr
                          key={cell.id}
                          onClick={() => navigate(`/cells/${encodeURIComponent(cell.id)}`)}
                          className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Target className="h-3 w-3" />
                              </div>
                              <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {stationLabel || '--'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                              {areaName}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            {cell.assignedEngineer ? (
                              <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3 text-indigo-500/50" />
                                <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                                  {cell.assignedEngineer}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-1000',
                                    percent >= 90
                                      ? 'bg-emerald-500'
                                      : percent >= 50
                                        ? 'bg-indigo-500'
                                        : 'bg-rose-500',
                                  )}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-black text-gray-900 dark:text-white tabular-nums w-8">
                                {percent}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border',
                                getCellStatusBadge(cell.status),
                              )}
                            >
                              {cell.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetailPage
