// useSimulationPageState
// Encapsulates all state logic, effects, and derived data for the SimulationPage

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useSimulationSync,
  useSimulationLoading,
  useSimulationErrors,
  useSimulationBoardStations,
  useFilteredStationsSummary,
  type SimulationFilters,
  type StationContext,
  type SortOption,
  type StationsSummary
} from '../../features/simulation'

export interface SimulationPageState {
  // Store state
  isLoading: boolean
  errors: string[]

  // Filters
  filters: SimulationFilters
  setFilters: (filters: SimulationFilters) => void

  // Stations & summary
  stations: StationContext[]
  summary: StationsSummary

  // Selection
  selectedStation: StationContext | null
  handleStationClick: (station: StationContext) => void
  clearSelectedStation: () => void

  // Sort
  sortBy: SortOption
  setSortBy: (sortBy: SortOption) => void

  // Expand/collapse
  expandedLines: Set<string>
  handleToggleLine: (lineKey: string) => void
  handleExpandAll: () => void
  handleCollapseAll: () => void
  allExpanded: boolean
  allCollapsed: boolean
}

export function useSimulationPageState(): SimulationPageState {
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync simulation store with core store
  useSimulationSync()

  // Store state
  const isLoading = useSimulationLoading()
  const errors = useSimulationErrors()

  // Local state
  const [filters, setFilters] = useState<SimulationFilters>({
    program: searchParams.get('program'),
    plant: searchParams.get('plant'),
    unit: searchParams.get('unit'),
    searchTerm: searchParams.get('search') ?? ''
  })
  const [selectedStation, setSelectedStation] = useState<StationContext | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('line-asc')
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())

  // Filtered stations
  const stations = useSimulationBoardStations(filters)
  const summary = useFilteredStationsSummary({
    program: filters.program,
    plant: filters.plant,
    unit: filters.unit
  })

  // Keep expanded lines in sync with current station set
  useEffect(() => {
    const validKeys = new Set(stations.map(station => `${station.unit}|${station.line}`))
    setExpandedLines(prev => {
      const next = new Set<string>()
      prev.forEach(key => {
        if (validKeys.has(key)) next.add(key)
      })
      return next
    })
  }, [stations])

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.program !== null) params.set('program', filters.program)
    if (filters.plant !== null) params.set('plant', filters.plant)
    if (filters.unit !== null) params.set('unit', filters.unit)
    if (filters.searchTerm !== '') params.set('search', filters.searchTerm)
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  const handleStationClick = useCallback((station: StationContext) => {
    setSelectedStation(station)
  }, [])

  const clearSelectedStation = useCallback(() => {
    setSelectedStation(null)
  }, [])

  const handleToggleLine = useCallback((lineKey: string) => {
    setExpandedLines(prev => {
      const next = new Set(prev)
      if (next.has(lineKey)) {
        next.delete(lineKey)
      } else {
        next.add(lineKey)
      }
      return next
    })
  }, [])

  const handleExpandAll = useCallback(() => {
    const lineKeys = new Set<string>()
    stations.forEach(station => {
      lineKeys.add(`${station.unit}|${station.line}`)
    })
    setExpandedLines(lineKeys)
  }, [stations])

  const handleCollapseAll = useCallback(() => {
    setExpandedLines(new Set())
  }, [])

  // Calculate if all lines are expanded or collapsed
  const totalLineCount = new Set(
    stations.map(station => `${station.unit}|${station.line}`)
  ).size
  const allExpanded = expandedLines.size === totalLineCount && totalLineCount > 0
  const allCollapsed = expandedLines.size === 0

  // Auto-select station when navigated with line/station params
  useEffect(() => {
    if (selectedStation !== null) return
    if (stations.length === 0) return

    const targetLine = searchParams.get('line')
    const targetStation = searchParams.get('station')
    const targetStationId = searchParams.get('stationId')

    let match: StationContext | undefined

    if (targetStationId) {
      match = stations.find(
        s => s.contextKey === targetStationId || s.station === targetStationId
      )
    }

    if (!match && (targetLine || targetStation)) {
      match = stations.find(s => {
        const stationMatch = targetStation
          ? s.station.toLowerCase() === targetStation.toLowerCase()
          : true
        const lineMatch = targetLine
          ? s.line.toLowerCase() === targetLine.toLowerCase()
          : true
        return stationMatch && lineMatch
      })
    }

    if (!match && targetStation) {
      match = stations.find(
        s => s.station.toLowerCase() === targetStation.toLowerCase()
      )
    }

    if (match) {
      setSelectedStation(match)
      setExpandedLines(prev => {
        const next = new Set(prev)
        next.add(`${match.unit}|${match.line}`)
        return next
      })
    }
  }, [stations, selectedStation, searchParams])

  return {
    isLoading,
    errors,
    filters,
    setFilters,
    stations,
    summary,
    selectedStation,
    handleStationClick,
    clearSelectedStation,
    sortBy,
    setSortBy,
    expandedLines,
    handleToggleLine,
    handleExpandAll,
    handleCollapseAll,
    allExpanded,
    allCollapsed
  }
}
