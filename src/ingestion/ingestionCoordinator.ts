// Ingestion Coordinator
// Main entry point for ingesting Excel files and routing to appropriate parsers

import { IngestionWarning } from '../domain/core'
import { coreStore } from '../domain/coreStore'
import { readWorkbook } from './excelUtils'
import { parseSimulationStatus } from './simulationStatusParser'
import { parseRobotList } from './robotListParser'
import { parseToolList } from './toolListParser'
import { applyIngestedData, IngestedData } from './applyIngestedData'
import { createUnknownFileTypeWarning, createParserErrorWarning } from './warningUtils'

// ============================================================================
// PUBLIC API TYPES
// ============================================================================

// Re-export IngestionWarning for convenience
export type { IngestionWarning } from '../domain/core'

/**
 * Input for the ingestion API.
 *
 * File objects can originate from any source: local disk uploads via <input type="file">,
 * downloaded blobs from HTTP APIs, cloud storage providers (SharePoint, OneDrive, S3, etc.),
 * or any other mechanism that produces valid JavaScript File objects.
 *
 * The ingestion layer is intentionally storage- and auth-agnostic. It has no dependencies
 * on authentication libraries (MSAL, OAuth, etc.) or cloud provider SDKs (Microsoft Graph,
 * AWS SDK, etc.). The caller is responsible for:
 *
 * - Obtaining valid Excel workbooks (.xlsx, .xlsm) as File objects
 * - Deciding which files are simulation status vs equipment lists
 * - Handling any authentication or authorization required to access those files
 *
 * @example
 * // Local file upload
 * const files = Array.from(input.files)
 * await ingestFiles({ simulationFiles: files, equipmentFiles: [] })
 *
 * @example
 * // Remote file downloaded as blob
 * const blob = await fetch(url).then(r => r.blob())
 * const file = new File([blob], 'Simulation_Status.xlsx', {
 *   type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
 * })
 * await ingestFiles({ simulationFiles: [file], equipmentFiles: [] })
 */
export interface IngestFilesInput {
  /**
   * Array of File objects containing simulation status data.
   * These files typically contain Projects, Areas, and Cells with simulation progress.
   * At least one simulation file is required for successful ingestion.
   */
  simulationFiles: File[]

  /**
   * Array of File objects containing equipment data (robots, tools, etc.).
   * These files are optional and will be linked to cells when provided.
   */
  equipmentFiles: File[]

  /**
   * Optional metadata about file sources.
   * This is for informational/diagnostic purposes only and does not affect ingestion logic.
   * Keys should match File.name values.
   *
   * @example
   * fileSources: {
   *   'Simulation_Status.xlsx': 'remote',
   *   'Robot_List.xlsx': 'local'
   * }
   */
  fileSources?: Record<string, 'local' | 'remote'>

  /**
   * Optional data source indicator (Local, MS365)
   * Used to track where the data came from for display in UI
   */
  dataSource?: 'Local' | 'MS365'
}

/**
 * Result of ingestion operation.
 *
 * Contains counts of entities created and any warnings encountered during parsing.
 * The core store is automatically updated with the parsed entities.
 */
export interface IngestFilesResult {
  /** Number of projects created */
  projectsCount: number

  /** Number of areas created */
  areasCount: number

  /** Number of cells created */
  cellsCount: number

  /** Number of robots created */
  robotsCount: number

  /** Number of tools created */
  toolsCount: number

  /** Structured warnings with file context and diagnostic information */
  warnings: IngestionWarning[]
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

type FileKind = 'SimulationStatus' | 'RobotList' | 'ToolList' | 'Unknown'

interface ClassifiedFile {
  file: File
  kind: FileKind
}

// ============================================================================
// FILE CLASSIFICATION
// ============================================================================

/**
 * Detect file type from filename
 */
function classifyFile(file: File): ClassifiedFile {
  const name = file.name.toLowerCase()

  // Simulation Status files
  if (name.includes('simulation') && name.includes('status')) {
    return { file, kind: 'SimulationStatus' }
  }

  // Robot List files
  if (name.includes('robot') && name.includes('list')) {
    return { file, kind: 'RobotList' }
  }

  // Tool/Weld Gun List files
  if (name.includes('wg') || name.includes('weld') || name.includes('gun')) {
    return { file, kind: 'ToolList' }
  }

  // Generic tool lists
  if (name.includes('tool') || name.includes('equipment')) {
    return { file, kind: 'ToolList' }
  }

  return { file, kind: 'Unknown' }
}

// ============================================================================
// MAIN INGESTION API
// ============================================================================

/**
 * High-level ingestion entry point.
 *
 * Accepts File objects from any source (local upload, downloaded blobs, cloud storage, etc.)
 * and parses them into Projects, Areas, Cells, Robots, and Tools. The parsed entities are
 * automatically stored in the core store and made available via React hooks.
 *
 * This function is intentionally UI- and auth-agnostic. It has no dependencies on:
 * - Authentication libraries (MSAL, OAuth providers, etc.)
 * - Cloud storage SDKs (Microsoft Graph, AWS SDK, Google Drive API, etc.)
 * - Specific UI frameworks or file input mechanisms
 *
 * The caller is free to obtain File objects from any mechanism as long as they are
 * valid Excel workbooks (.xlsx, .xlsm). This includes:
 * - Browser file inputs (<input type="file">)
 * - HTTP downloads (fetch, axios, etc.)
 * - Cloud storage APIs (SharePoint, OneDrive, S3, etc.)
 * - Blob storage or any other source
 *
 * Requirements:
 * - At least one simulation file must be provided
 * - Files must be valid Excel workbooks
 * - Caller handles all authentication and authorization
 *
 * @param input - Configuration specifying which files to ingest
 * @returns Summary of ingestion results including entity counts and any warnings
 *
 * @throws {Error} If file reading fails or Excel format is invalid
 *
 * @example
 * // Local file upload
 * const result = await ingestFiles({
 *   simulationFiles: selectedFiles,
 *   equipmentFiles: []
 * })
 * console.log(`Loaded ${result.projectsCount} projects`)
 *
 * @example
 * // Remote file from cloud storage
 * const blob = await downloadFromSharePoint(fileUrl)
 * const file = new File([blob], 'Simulation_Status.xlsx')
 * const result = await ingestFiles({
 *   simulationFiles: [file],
 *   equipmentFiles: [],
 *   fileSources: { 'Simulation_Status.xlsx': 'remote' }
 * })
 */
export async function ingestFiles(
  input: IngestFilesInput
): Promise<IngestFilesResult> {
  const allFiles = [...input.simulationFiles, ...input.equipmentFiles]

  // Validate input - require at least one simulation file
  if (input.simulationFiles.length === 0) {
    const warning: IngestionWarning = {
      id: 'no-simulation-files',
      kind: 'PARSER_ERROR',
      fileName: '',
      message: 'At least one Simulation Status file is required. Please upload a file containing project and cell data.',
      createdAt: new Date().toISOString()
    }

    return {
      projectsCount: 0,
      areasCount: 0,
      cellsCount: 0,
      robotsCount: 0,
      toolsCount: 0,
      warnings: [warning]
    }
  }

  const ingestedData: IngestedData = {
    simulation: undefined,
    robots: undefined,
    tools: undefined
  }

  const allWarnings: IngestionWarning[] = []

  // Process each file
  for (const file of allFiles) {
    try {
      const classified = classifyFile(file)

      if (classified.kind === 'Unknown') {
        allWarnings.push(createUnknownFileTypeWarning({
          fileName: file.name
        }))
        continue
      }

      // Read workbook
      const workbook = await readWorkbook(file)

      // Route to appropriate parser
      if (classified.kind === 'SimulationStatus') {
        const result = await parseSimulationStatus(workbook, file.name)

        if (!ingestedData.simulation) {
          ingestedData.simulation = result
        } else {
          ingestedData.simulation.projects.push(...result.projects)
          ingestedData.simulation.areas.push(...result.areas)
          ingestedData.simulation.cells.push(...result.cells)
          ingestedData.simulation.warnings.push(...result.warnings)
        }
      }

      if (classified.kind === 'RobotList') {
        const result = await parseRobotList(workbook, file.name)

        if (!ingestedData.robots) {
          ingestedData.robots = result
        } else {
          ingestedData.robots.robots.push(...result.robots)
          ingestedData.robots.warnings.push(...result.warnings)
        }
      }

      if (classified.kind === 'ToolList') {
        const result = await parseToolList(workbook, file.name)

        if (!ingestedData.tools) {
          ingestedData.tools = result
        } else {
          ingestedData.tools.tools.push(...result.tools)
          ingestedData.tools.warnings.push(...result.warnings)
        }
      }
    } catch (error) {
      console.error(`[Ingestion] Error processing file ${file.name}:`, error)
      allWarnings.push(createParserErrorWarning({
        fileName: file.name,
        error: String(error)
      }))
    }
  }

  // Apply ingested data and link entities
  const applyResult = applyIngestedData(ingestedData)

  // Collect all warnings (from parsers and linking)
  allWarnings.push(...applyResult.warnings)

  // Update core store (backward compat: store warnings as strings)
  const warningStrings = allWarnings.map(w => w.message)
  coreStore.setData({
    projects: applyResult.projects,
    areas: applyResult.areas,
    cells: applyResult.cells,
    robots: applyResult.robots,
    tools: applyResult.tools,
    warnings: warningStrings
  }, input.dataSource)

  // Get counts from store
  const state = coreStore.getState()

  return {
    projectsCount: state.projects.length,
    areasCount: state.areas.length,
    cellsCount: state.cells.length,
    robotsCount: state.robots.length,
    toolsCount: state.tools.length,
    warnings: allWarnings
  }
}
