import { useMemo, useState } from 'react'
import { useSimPilotStore } from '../../domain/simPilotStore'
import type {
  ToolingItem,
  ToolingDesignStage,
  WorkflowStage,
  BottleneckReason,
  ToolingWorkflowStatus
} from '../../domain/toolingTypes'

const defaultFilters = {
  program: '' as string,
  plant: '' as string,
  unit: '' as string,
  area: '' as string,
  station: '' as string,
  toolType: '' as string,
  designStage: '' as ToolingDesignStage | '',
  workflowStage: '' as WorkflowStage | '',
  bottleneckReason: '' as BottleneckReason | '',
  search: '' as string
}

export type ToolingFilterState = typeof defaultFilters

export interface ToolingFilterOptions {
  programs: string[]
  plants: string[]
  units: string[]
  areas: string[]
  stations: string[]
  toolTypes: string[]
  designStages: ToolingDesignStage[]
  workflowStages: WorkflowStage[]
  bottleneckReasons: BottleneckReason[]
}

export interface ToolingFilterCounts {
  total: number
  filtered: number
  bottlenecked: number
}

export interface UseToolingFiltersResult {
  items: ToolingItem[]
  filters: ToolingFilterState
  setFilter: <K extends keyof ToolingFilterState>(key: K, value: ToolingFilterState[K]) => void
  resetFilters: () => void
  options: ToolingFilterOptions
  counts: ToolingFilterCounts
  workflowById: Map<string, ToolingWorkflowStatus>
}

export function useToolingFilters(): UseToolingFiltersResult {
  const { toolingSnapshot, workflowStatuses } = useSimPilotStore()
  const [filters, setFilters] = useState<ToolingFilterState>(defaultFilters)

  const workflowById = useMemo(() => {
    const map = new Map<string, ToolingWorkflowStatus>()
    for (const status of workflowStatuses) {
      map.set(status.toolingId, status)
    }
    return map
  }, [workflowStatuses])

  const allItems = useMemo(() => toolingSnapshot.items, [toolingSnapshot])

  const items = useMemo(() => {
    if (allItems.length === 0) return []

    const search = filters.search.trim().toLowerCase()

    return allItems.filter((item) => {
      if (filters.program && item.context.program !== filters.program) return false
      if (filters.plant && item.context.plant !== filters.plant) return false
      if (filters.unit && item.context.unit !== filters.unit) return false
      if (filters.area && item.context.area !== filters.area) return false
      if (filters.station && item.context.station !== filters.station) return false
      if (filters.toolType && item.toolType !== filters.toolType) return false
      if (filters.designStage && item.designStage !== filters.designStage) return false

      if (filters.workflowStage) {
        const workflow = workflowById.get(item.id)
        if (!workflow) return false
        if (workflow.dominantStage !== filters.workflowStage) return false
      }

      if (filters.bottleneckReason) {
        const workflow = workflowById.get(item.id)
        if (!workflow) return false
        if (workflow.bottleneckReason !== filters.bottleneckReason) return false
      }

      if (!search) return true

      const haystack = [
        item.gaDescription,
        item.toolingNumber,
        ...item.equipmentNumbers
      ].join(' ').toLowerCase()

      return haystack.includes(search)
    })
  }, [allItems, filters, workflowById])

  const counts = useMemo<ToolingFilterCounts>(() => {
    if (items.length === 0) {
      return {
        total: allItems.length,
        filtered: 0,
        bottlenecked: 0
      }
    }

    const bottlenecked = items.filter((item) => {
      const workflow = workflowById.get(item.id)
      if (!workflow) return false
      if (!workflow.bottleneckReason) return false
      return workflow.bottleneckReason !== 'NONE'
    }).length

    return {
      total: allItems.length,
      filtered: items.length,
      bottlenecked
    }
  }, [allItems.length, items, workflowById])

  const options = useMemo<ToolingFilterOptions>(() => {
    const unique = <T extends string>(values: Array<T | undefined>): T[] => {
      const set = new Set<T>()
      for (const value of values) {
        if (value) set.add(value)
      }
      return Array.from(set).sort()
    }

    return {
      programs: unique(allItems.map((item) => item.context.program)),
      plants: unique(allItems.map((item) => item.context.plant)),
      units: unique(allItems.map((item) => item.context.unit)),
      areas: unique(allItems.map((item) => item.context.area)),
      stations: unique(allItems.map((item) => item.context.station)),
      toolTypes: unique(allItems.map((item) => item.toolType)),
      designStages: unique(allItems.map((item) => item.designStage)) as ToolingDesignStage[],
      workflowStages: unique(workflowStatuses.map((status) => status.dominantStage)) as WorkflowStage[],
      bottleneckReasons: unique(
        workflowStatuses
          .map((status) => status.bottleneckReason)
          .filter((reason): reason is BottleneckReason => Boolean(reason && reason !== 'NONE'))
      )
    }
  }, [allItems, workflowStatuses])

  const setFilter = <K extends keyof ToolingFilterState>(key: K, value: ToolingFilterState[K]) => {
    setFilters((prev) => {
      if (prev[key] === value) return prev
      return { ...prev, [key]: value }
    })
  }

  const resetFilters = () => {
    setFilters({ ...defaultFilters })
  }

  return {
    items,
    filters,
    setFilter,
    resetFilters,
    options,
    counts,
    workflowById
  }
}
