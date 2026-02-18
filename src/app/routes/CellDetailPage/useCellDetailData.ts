import { useState, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import {
  useCells,
  useRobotsByCell,
  useToolsByCell,
  useAllEngineerMetrics,
} from '../../../ui/hooks/useDomainData'
import { coreStore, useCoreStore } from '../../../domain/coreStore'
import { createCellEngineerAssignmentChange } from '../../../domain/changeLog'
import { simBridgeClient } from '../../../integrations/simbridge/SimBridgeClient'
import { useGlobalBusy } from '../../../ui/GlobalBusyContext'
import { log } from '../../../lib/log'
import { useCrossRefData } from '../../../hooks/useCrossRefData'
import { normalizeStationId } from '../../../domain/crossRef/CrossRefUtils'
import { normalizeRobotNumber, coerceRobotLabel } from './helpers'
import { RobotDisplay } from './types'

export function useCellDetailData() {
  const { cellId } = useParams<{ cellId: string }>()
  const location = useLocation()
  const decodedCellId = cellId ? decodeURIComponent(cellId) : undefined

  // Robust lookup: Try by ID first, then fall back to code/name matching
  const allCells = useCells()
  const cell = useMemo(() => {
    if (!decodedCellId) return undefined

    // 1. Precise match by ID
    const matchById = allCells.find((c) => c.id === decodedCellId)
    if (matchById) return matchById

    // 2. Match by station ID (canonical)
    const matchByStationId = allCells.find((c) => c.stationId === decodedCellId)
    if (matchByStationId) return matchByStationId

    // 3. Match by normalized code or name
    const normalizedTarget = decodedCellId.toUpperCase().trim()

    // 3a. Try exact code match
    const matchByCode = allCells.find((c) => c.code?.toUpperCase() === normalizedTarget)
    if (matchByCode) return matchByCode

    // 3b. Try exact name match
    const matchByName = allCells.find((c) => c.name?.toUpperCase() === normalizedTarget)
    if (matchByName) return matchByName

    // 4. Try normalized station code (e.g. "010" matching "10")
    if (/^\d+$/.test(normalizedTarget)) {
      // identifying simplistic numeric codes
      const matchByNumeric = allCells.find((c) => {
        const numericCode = c.code?.replace(/^0+/, '')
        const numericTarget = normalizedTarget.replace(/^0+/, '')
        return numericCode === numericTarget
      })
      if (matchByNumeric) return matchByNumeric
    }

    return undefined
  }, [allCells, decodedCellId])

  const legacyRobots = useRobotsByCell(cell?.id || '')
  const tools = useToolsByCell(cell?.id || '')
  const allEngineers = useAllEngineerMetrics()
  const { pushBusy, popBusy } = useGlobalBusy()

  // Get robots from CrossRef data (includes robots from simulation status)
  const { cells: crossRefCells } = useCrossRefData()

  // Find matching CrossRef cell to get robots from simulation status
  const crossRefCell = useMemo(() => {
    if (!cell?.code) return undefined

    const normalizedCode = normalizeStationId(cell.code)
    return crossRefCells.find((c) => c.stationKey === normalizedCode)
  }, [cell?.code, crossRefCells])

  const crossRefFlags = crossRefCell?.flags || []

  const { assets } = useCoreStore()

  // Build combined robot list (Legacy + Cross-Ref fallback)
  const robots = useMemo(() => {
    // 1. Start with explicitly linked robots from CoreStore
    let baseRobots: RobotDisplay[] = legacyRobots.map((r) => ({ ...r }))

    // 2. If legacy list is empty, try mapping from Cross-Ref snapshots
    if (baseRobots.length === 0 && crossRefCell?.robots) {
      baseRobots = crossRefCell.robots.map((snap) => ({
        id: snap.robotKey,
        name: snap.caption || snap.robotKey,
        oemModel: snap.oemModel,
        metadata: (snap.raw as any)?.metadata || {},
        stationCode: snap.stationKey,
      }))
    }

    const normalizedStation = normalizeRobotNumber(cell?.code)

    // 3. Enrich and link to unified assets
    return baseRobots.map((r) => {
      const displayNumberCandidate =
        r.metadata?.['Robo No. New'] ??
        r.metadata?.['ROBO NO. NEW'] ??
        r.metadata?.robotNumber ??
        r.name
      const displayNumber = coerceRobotLabel(displayNumberCandidate, r.name || 'Unknown Robot')
      const normalizedDisplay = normalizeRobotNumber(displayNumber)

      const matchedAsset = assets.find((a) => {
        if (a.kind !== 'ROBOT') return false

        const candidateLabelCandidate =
          a.metadata?.robotNumber ??
          a.metadata?.['Robo No. New'] ??
          a.metadata?.['ROBO NO. NEW'] ??
          a.name
        const candidateNumber = normalizeRobotNumber(
          coerceRobotLabel(candidateLabelCandidate, a.name),
        )

        const sameNumber = normalizedDisplay.length > 0 && candidateNumber === normalizedDisplay
        if (!sameNumber) return false

        if (!normalizedStation) return true
        return normalizeRobotNumber(a.stationNumber) === normalizedStation
      })

      return {
        ...r,
        name: displayNumber,
        linkAssetId: matchedAsset?.id ?? r.id,
      }
    })
  }, [legacyRobots, crossRefCell?.robots, assets, cell?.code])

  // Build combined tool list
  const mergedTools = useMemo(() => {
    if (tools.length > 0) return tools

    // Fallback to cross-ref tool snapshots
    return (crossRefCell?.tools || []).map((snap) => ({
      id: snap.toolId || `tr-${snap.stationKey}`,
      name: snap.toolId || 'Unknown Tool',
      toolType: (snap.toolType as any) || 'OTHER',
      mountType: 'UNKNOWN' as const,
      raw: snap.raw,
    }))
  }, [tools, crossRefCell?.tools])

  const [isEditingEngineer, setIsEditingEngineer] = useState(false)
  const [selectedEngineer, setSelectedEngineer] = useState<string>('')

  const { from: fromPath, fromLabel } = (location.state || {}) as {
    from?: string
    fromLabel?: string
  }
  const breadcrumbRootHref = fromPath || '/projects'
  const breadcrumbRootLabel = fromLabel || 'Projects'

  const isAtRisk =
    cell?.simulation?.hasIssues === true ||
    (cell?.simulation?.percentComplete &&
      cell.simulation.percentComplete > 0 &&
      cell.simulation.percentComplete < 100 &&
      cell.status === 'Blocked') === true

  const handleEditEngineer = () => {
    setSelectedEngineer(cell?.assignedEngineer || '')
    setIsEditingEngineer(true)
  }

  const handleSaveEngineer = () => {
    if (cell && selectedEngineer !== cell.assignedEngineer) {
      const change = createCellEngineerAssignmentChange(
        cell.id,
        cell.assignedEngineer,
        selectedEngineer,
        cell.projectId,
        cell.areaId,
      )
      coreStore.addChange(change)
      coreStore.updateCellEngineer(cell.id, selectedEngineer)
    }
    setIsEditingEngineer(false)
  }

  const handleOpenSimulation = async () => {
    if (!cell?.simulation?.studyPath) return
    pushBusy('Opening simulation in Tecnomatix...')
    try {
      const connected = await simBridgeClient.connect()
      if (!connected) {
        alert(
          "We couldn't reach the simulation server right now. It's safe to continue your planning – the data in SimPilot is still valid.",
        )
        return
      }

      const success = await simBridgeClient.loadStudy(cell.simulation.studyPath)
      if (success !== true) {
        alert('Failed to load the study. Please check if the file exists on the server.')
      }
    } catch (e) {
      log.error('Failed to open simulation', e)
      alert('An error occurred while trying to open the simulation.')
    } finally {
      popBusy()
    }
  }

  return {
    cell,
    robots,
    mergedTools,
    crossRefFlags,
    isAtRisk,
    isEditingEngineer,
    setIsEditingEngineer,
    selectedEngineer,
    setSelectedEngineer,
    handleEditEngineer,
    handleSaveEngineer,
    handleOpenSimulation,
    breadcrumbRootHref,
    breadcrumbRootLabel,
    allEngineers,
  }
}
