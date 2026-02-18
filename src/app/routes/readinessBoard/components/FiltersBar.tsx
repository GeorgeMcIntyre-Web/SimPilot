import { Search } from 'lucide-react'
import { Chip } from './ui/Chip'
import { StatusMultiSelect } from './ui/StatusMultiSelect'
import { SortToggle } from './ui/SortToggle'
import type { SchedulePhase } from '../../../domain/core'
import { PHASE_LABELS, PHASE_ORDER } from '../constants'
import type { Project } from '../../../domain/core'

interface FiltersBarProps {
  filterPhase: SchedulePhase | 'all'
  setFilterPhase: (phase: SchedulePhase | 'all') => void
  filterProject: string
  setFilterProject: (id: string) => void
  filterStatus: Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>
  setFilterStatus: (values: Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>) => void
  searchTerm: string
  setSearchTerm: (val: string) => void
  sortMode: 'risk' | 'due'
  setSortMode: (mode: 'risk' | 'due') => void
  projects: Project[]
}

export function FiltersBar({
  filterPhase,
  setFilterPhase,
  filterProject,
  setFilterProject,
  filterStatus,
  setFilterStatus,
  searchTerm,
  setSearchTerm,
  sortMode,
  setSortMode,
  projects,
}: FiltersBarProps) {
  return (
    <div className="bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="SEARCH STATIONS, ENGINEERS, LINES..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value as SchedulePhase | 'all')}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
            >
              <option value="all">All Phases</option>
              {PHASE_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PHASE_LABELS[p]}
                </option>
              ))}
            </select>

            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />

            <StatusMultiSelect selected={filterStatus} onChange={setFilterStatus} />

            <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />

            <SortToggle sortMode={sortMode} onChange={setSortMode} />
          </div>
        </div>

        {(filterPhase !== 'all' ||
          filterProject !== 'all' ||
          filterStatus.length > 0 ||
          searchTerm) && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Active Intelligence Filters:
            </span>
            {filterPhase !== 'all' && (
              <Chip
                label={`PHASE: ${PHASE_LABELS[filterPhase]}`}
                onClear={() => setFilterPhase('all')}
              />
            )}
            {filterProject !== 'all' && (
              <Chip
                label={`PROJECT: ${projects.find((p) => p.id === filterProject)?.name}`}
                onClear={() => setFilterProject('all')}
              />
            )}
            {filterStatus.length > 0 && (
              <Chip
                label={`STATUS: ${filterStatus.join(', ')}`}
                onClear={() => setFilterStatus([])}
              />
            )}
            {searchTerm && (
              <Chip label={`SEARCH: ${searchTerm}`} onClear={() => setSearchTerm('')} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
