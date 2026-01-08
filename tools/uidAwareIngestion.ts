/**
 * UID-Aware Ingestion
 *
 * Integrates UID resolver + diff engine into headless ingestion workflow.
 * Tracks creates/updates/deletes/renames/ambiguous items properly.
 */

import * as XLSX from 'xlsx'
import {
  StationRecord,
  ToolRecord,
  RobotRecord,
  DiffResult,
  PlantKey,
  generateStationUid,
  generateToolUid,
  generateRobotUid
} from '../src/domain/uidTypes'
import {
  resolveStationUid,
  resolveToolUid,
  resolveRobotUid,
  type UidResolutionContext
} from '../src/ingestion/uidResolver'
import { collectAmbiguousItems, type AmbiguousResolutionInput } from '../src/ingestion/ambiguityCollector'
import { diffStationRecords, diffToolRecords } from '../src/ingestion/diffEngine'
import { scanWorkbook } from '../src/ingestion/sheetSniffer'
import { parseSimulationStatus } from '../src/ingestion/simulationStatusParser'
import { parseToolList } from '../src/ingestion/toolListParser'
import { parseRobotList } from '../src/ingestion/robotListParser'
import { type HeadlessFile } from './headlessIngestion'
import { log } from './nodeLog'
import { applyMutations, mutateCellIds, mutateToolIds, mutateRobotIds, type MutationConfig } from './identifierMutator'

// ============================================================================
// TYPES
// ============================================================================

export interface UidIngestionOptions {
  plantKey?: PlantKey
  mutateNames?: boolean
  mutationConfig?: MutationConfig
  ambiguityTarget?: number
  ambiguitySeed?: number
}

export interface UidIngestionResult {
  fileName: string
  filePath: string
  success: boolean
  error?: string
  stationRecords: StationRecord[]
  toolRecords: ToolRecord[]
  robotRecords: RobotRecord[]
  diff?: DiffResult
  ambiguousCount: number
  warnings: string[]
  mutationsApplied?: number
  // Per-category row counts
  simulationStatusRowsParsed: number
  toolListRowsParsed: number
  robotListRowsParsed: number
  assembliesRowsParsed: number
}

export interface UidIngestionSummary {
  totalStations: number
  totalTools: number
  totalRobots: number
  diff: DiffResult
  totalMutations?: number
}

// ============================================================================
// UID-AWARE INGESTION
// ============================================================================

/**
 * Ingest file with full UID resolution and diff tracking
 */
export async function ingestFileWithUid(
  file: HeadlessFile,
  prevStationRecords: StationRecord[],
  prevToolRecords: ToolRecord[],
  prevRobotRecords: RobotRecord[],
  options: UidIngestionOptions = {}
): Promise<UidIngestionResult> {
  const plantKey = options.plantKey || 'PLANT_TEST'
  const mutateNames = options.mutateNames || false
  const mutationConfig = options.mutationConfig
  try {
    const xlsxWorkbook = XLSX.read(file.buffer, { type: 'array' })
    const scanResult = scanWorkbook(xlsxWorkbook, file.name)

    if (!scanResult.bestOverall) {
      return {
        fileName: file.name,
        filePath: file.path,
        success: false,
        error: 'Could not detect sheet type',
        stationRecords: [],
        toolRecords: [],
        robotRecords: [],
        ambiguousCount: 0,
        warnings: []
      }
    }

    const detection = scanResult.bestOverall
    const sheetName = detection.sheetName

    // Initialize resolution context
    const context: UidResolutionContext = {
      stationRecords: prevStationRecords,
      toolRecords: prevToolRecords,
      robotRecords: prevRobotRecords,
      aliasRules: [],
      plantKey
    }

    const newStationRecords: StationRecord[] = []
    const newToolRecords: ToolRecord[] = []
    const newRobotRecords: RobotRecord[] = []
    const ambiguousResolutions: AmbiguousResolutionInput[] = []
    const warnings: string[] = []

    // Row count tracking
    let simulationStatusRowsParsed = 0
    let toolListRowsParsed = 0
    let robotListRowsParsed = 0
    let assembliesRowsParsed = 0
    let cellMutationCount = 0
    let toolMutationCount = 0
    let robotMutationCount = 0

    // Parse based on detected type
    if (detection.category === 'SIMULATION_STATUS') {
      const result = await parseSimulationStatus(xlsxWorkbook, file.name, sheetName)
      warnings.push(...result.warnings.map(w => w.message))

      // Apply mutations to parsed cells BEFORE UID resolution
      let cellsToProcess = result.cells
      if (mutateNames) {
        const cellMutation = mutateCellIds(result.cells, mutationConfig)
        cellsToProcess = cellMutation.mutated
        cellMutationCount = cellMutation.mutationLog.length
        if (cellMutationCount > 0) {
          log.info(`[UidIngestion] Mutated ${cellMutationCount} cell IDs before UID resolution`)
          cellMutation.mutationLog.forEach(m => log.debug(`  - ${m}`))
        }
      }

      simulationStatusRowsParsed = cellsToProcess.length

      // Convert cells to station records with UID resolution
      for (const cell of cellsToProcess) {
        const key = cell.id // Canonical key
        const labels = {
          line: cell.area || '',
          bay: cell.location || '',
          stationNo: cell.station || '',
          fullLabel: `${cell.area} ${cell.location} ${cell.station}`
        }

        const resolution = resolveStationUid(
          key,
          labels,
          { area: cell.area, location: cell.location, station: cell.station },
          context,
          { sourceFile: file.name, sheetName, rowIndex: undefined }
        )

        if (resolution.matchedVia === 'ambiguous') {
          ambiguousResolutions.push({
            key,
            resolution,
            entityType: 'station',
            plantKey,
            attributes: { area: cell.area, location: cell.location, station: cell.station }
          })
        } else if (resolution.uid) {
          const record: StationRecord = {
            uid: resolution.uid,
            key,
            plantKey,
            labels,
            attributes: { area: cell.area, location: cell.location, station: cell.station },
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceFile: file.name
          }
          newStationRecords.push(record)

          // Add to context for subsequent resolutions
          context.stationRecords.push(record)
        }
      }
    } else if (detection.category === 'IN_HOUSE_TOOLING' || detection.category === 'ASSEMBLIES_LIST') {
      const result = await parseToolList(xlsxWorkbook, file.name, sheetName)
      warnings.push(...result.warnings.map(w => w.message))

      // Apply mutations to parsed tools BEFORE UID resolution
      let toolsToProcess = result.tools
      if (mutateNames) {
        const toolMutation = mutateToolIds(result.tools, mutationConfig)
        toolsToProcess = toolMutation.mutated
        toolMutationCount = toolMutation.mutationLog.length
        if (toolMutationCount > 0) {
          log.info(`[UidIngestion] Mutated ${toolMutationCount} tool IDs before UID resolution`)
          toolMutation.mutationLog.forEach(m => log.debug(`  - ${m}`))
        }
      }

      // Track row counts based on category
      if (detection.category === 'ASSEMBLIES_LIST') {
        assembliesRowsParsed = toolsToProcess.length
      } else {
        toolListRowsParsed = toolsToProcess.length
      }

      // Convert tools to tool records with UID resolution
      for (const tool of toolsToProcess) {
        const key = tool.id // Canonical key
        const labels = {
          toolCode: tool.toolNo || tool.name || '',
          toolName: tool.name || '',
          gunNumber: tool.gunNumber || ''
        }

        const resolution = resolveToolUid(
          key,
          labels,
          { name: tool.name, toolNo: tool.toolNo, description: tool.description },
          context,
          { sourceFile: file.name, sheetName }
        )

        if (resolution.matchedVia === 'ambiguous') {
          ambiguousResolutions.push({
            key,
            resolution,
            entityType: 'tool',
            plantKey,
            attributes: { name: tool.name, toolNo: tool.toolNo, description: tool.description }
          })
        } else if (resolution.uid) {
          const record: ToolRecord = {
            uid: resolution.uid,
            key,
            plantKey,
            stationUid: null,
            labels,
            attributes: { name: tool.name, toolNo: tool.toolNo, description: tool.description },
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceFile: file.name
          }
          newToolRecords.push(record)

          // Add to context
          context.toolRecords.push(record)
        }
      }
    } else if (detection.category === 'ROBOT_SPECS') {
      const result = await parseRobotList(xlsxWorkbook, file.name, sheetName)
      warnings.push(...result.warnings.map(w => w.message))

      // Apply mutations to parsed robots BEFORE UID resolution
      let robotsToProcess = result.robots
      if (mutateNames) {
        const robotMutation = mutateRobotIds(result.robots, mutationConfig)
        robotsToProcess = robotMutation.mutated
        robotMutationCount = robotMutation.mutationLog.length
        if (robotMutationCount > 0) {
          log.info(`[UidIngestion] Mutated ${robotMutationCount} robot IDs before UID resolution`)
          robotMutation.mutationLog.forEach(m => log.debug(`  - ${m}`))
        }
      }

      robotListRowsParsed = robotsToProcess.length

      // Convert robots to robot records with UID resolution
      for (const robot of robotsToProcess) {
        const key = robot.id // Canonical key
        const labels = {
          robotNumber: robot.robotNumber || '',
          robotCaption: robot.caption || '',
          eNumber: robot.eNumber || ''
        }

        const resolution = resolveRobotUid(
          key,
          labels,
          { caption: robot.caption, brand: robot.brand, model: robot.model },
          context,
          { sourceFile: file.name, sheetName }
        )

        if (resolution.matchedVia === 'ambiguous') {
          ambiguousResolutions.push({
            key,
            resolution,
            entityType: 'robot',
            plantKey,
            attributes: { caption: robot.caption, brand: robot.brand, model: robot.model }
          })
        } else if (resolution.uid) {
          const record: RobotRecord = {
            uid: resolution.uid,
            key,
            plantKey,
            stationUid: null,
            labels,
            attributes: { caption: robot.caption, brand: robot.brand, model: robot.model },
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceFile: file.name
          }
          newRobotRecords.push(record)

          // Add to context
          context.robotRecords.push(record)
        }
      }
    }

    // Track total mutations from all categories
    const totalMutations = cellMutationCount + toolMutationCount + robotMutationCount

    // Compute diff
    const stationDiff = diffStationRecords(prevStationRecords, newStationRecords)
    const toolDiff = diffToolRecords(prevToolRecords, newToolRecords)
    const ambiguousItems = collectAmbiguousItems(ambiguousResolutions)

    const diff: DiffResult = {
      creates: [...stationDiff.creates, ...toolDiff.creates],
      updates: [...stationDiff.updates, ...toolDiff.updates],
      deletes: [...stationDiff.deletes, ...toolDiff.deletes],
      renamesOrMoves: [...stationDiff.renamesOrMoves, ...toolDiff.renamesOrMoves],
      ambiguous: ambiguousItems
    }

    log.debug(`[UidIngestion] ${file.name}: creates=${diff.creates.length}, updates=${diff.updates.length}, deletes=${diff.deletes.length}, renames=${diff.renamesOrMoves.length}, ambiguous=${diff.ambiguous.length}`)

    return {
      fileName: file.name,
      filePath: file.path,
      success: true,
      stationRecords: newStationRecords,
      toolRecords: newToolRecords,
      robotRecords: newRobotRecords,
      diff,
      ambiguousCount: ambiguousItems.length,
      warnings,
      mutationsApplied: totalMutations,
      simulationStatusRowsParsed,
      toolListRowsParsed,
      robotListRowsParsed,
      assembliesRowsParsed
    }
  } catch (error) {
    return {
      fileName: file.name,
      filePath: file.path,
      success: false,
      error: String(error),
      stationRecords: [],
      toolRecords: [],
      robotRecords: [],
      ambiguousCount: 0,
      warnings: [],
      simulationStatusRowsParsed: 0,
      toolListRowsParsed: 0,
      robotListRowsParsed: 0,
      assembliesRowsParsed: 0
    }
  }
}

/**
 * Ingest multiple files and accumulate records + diff
 */
export async function ingestFilesWithUid(
  files: HeadlessFile[],
  options: UidIngestionOptions = {}
): Promise<{
  results: UidIngestionResult[]
  summary: UidIngestionSummary
}> {
  let prevStationRecords: StationRecord[] = []
  let prevToolRecords: ToolRecord[] = []
  let prevRobotRecords: RobotRecord[] = []

  const results: UidIngestionResult[] = []

  for (const file of files) {
    const result = await ingestFileWithUid(
      file,
      prevStationRecords,
      prevToolRecords,
      prevRobotRecords,
      options
    )

    results.push(result)

    // Accumulate records for next file
    if (result.success) {
      prevStationRecords = [...prevStationRecords, ...result.stationRecords]
      prevToolRecords = [...prevToolRecords, ...result.toolRecords]
      prevRobotRecords = [...prevRobotRecords, ...result.robotRecords]
    }
  }

  // Compute overall diff
  const overallDiff: DiffResult = {
    creates: results.flatMap(r => r.diff?.creates || []),
    updates: results.flatMap(r => r.diff?.updates || []),
    deletes: results.flatMap(r => r.diff?.deletes || []),
    renamesOrMoves: results.flatMap(r => r.diff?.renamesOrMoves || []),
    ambiguous: results.flatMap(r => r.diff?.ambiguous || [])
  }

  const totalMutations = results.reduce((sum, r) => sum + (r.mutationsApplied || 0), 0)

  const summary: UidIngestionSummary = {
    totalStations: prevStationRecords.length,
    totalTools: prevToolRecords.length,
    totalRobots: prevRobotRecords.length,
    diff: overallDiff,
    totalMutations
  }

  return { results, summary }
}
