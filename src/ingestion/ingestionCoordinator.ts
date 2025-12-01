// Ingestion Coordinator
// Main entry point for ingesting Excel files and routing to appropriate parsers

import { IngestionWarning } from '../domain/core'
import { coreStore } from '../domain/coreStore'
import { readWorkbook, sheetToMatrix } from './excelUtils'
import { parseSimulationStatus } from './simulationStatusParser'
import { parseRobotList } from './robotListParser'
import { parseToolList } from './toolListParser'
import { applyIngestedData, IngestedData } from './applyIngestedData'
import { createUnknownFileTypeWarning, createParserErrorWarning } from './warningUtils'
import { captureAllProjectSnapshots } from '../domain/history/captureSnapshot'
import * as XLSX from 'xlsx'

// ============================================================================
// PUBLIC API TYPES
// ============================================================================

// Re-export IngestionWarning for convenience
export type { IngestionWarning } from '../domain/core'

/**
 * Input for the ingestion API.
 */
export interface IngestFilesInput {
  simulationFiles: File[]
  equipmentFiles: File[]
  fileSources?: Record<string, 'local' | 'remote'>
  dataSource?: 'Local' | 'MS365'
}

/**
 * Result of ingestion operation.
 */
export interface IngestFilesResult {
  projectsCount: number
  areasCount: number
  cellsCount: number
  robotsCount: number
  toolsCount: number
  warnings: IngestionWarning[]
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

type FileKind = 'SimulationStatus' | 'RobotList' | 'ToolList' | 'Metadata' | 'Unknown'

// ============================================================================
// FILE CLASSIFICATION
// ============================================================================

/**
 * Detect file type from content (Header Sniffing)
 */
function detectFileType(workbook: XLSX.WorkBook, fileName: string): FileKind {
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return 'Unknown'

  try {
    // Read first 5 rows for sniffing
    const rows = sheetToMatrix(workbook, sheetName, 5)

    // Flatten rows to string for easy searching
    const content = rows.map(row =>
      row.map(cell => String(cell || '').toLowerCase().trim()).join(' ')
    ).join(' ')

    // Metadata Files (HIGHEST PRIORITY - check first)
    // Check for EmployeeList, SupplierList, or Reference Data sheets
    if (
      content.includes('employeelist') ||
      content.includes('supplierlist') ||
      content.includes('supplier name') ||
      (content.includes('employee') && content.includes('id'))
    ) {
      return 'Metadata'
    }

    // Simulation Status
    if (
      (content.includes('robot') && content.includes('reach')) ||
      content.includes('robot position') ||
      content.includes('1st stage sim') ||
      content.includes('1st stage')
    ) {
      return 'SimulationStatus'
    }

    // Robot List
    if (content.includes('fanuc order code') || (content.includes('robot') && content.includes('list'))) {
      return 'RobotList'
    }

    // Zangenpool (detailed gun specs)
    if (content.includes('gun force') && content.includes('gun number')) {
      return 'ToolList'
    }

    // Reuse Lists (Device Name + CARRY OVER)
    if (
      (content.includes('device name') || content.includes('device id')) &&
      (content.includes('carry over') || content.includes('proyect') || content.includes('project'))
    ) {
      return 'ToolList'
    }

    // Tool/Equipment List (general)
    if (
      (content.includes('force') && content.includes('gun')) ||
      content.includes('gun force') ||
      content.includes('tip dresser') ||
      content.includes('riser') ||
      content.includes('height') ||
      content.includes('weld gun') ||
      content.includes('gun') ||
      content.includes('tool') ||
      content.includes('equipment')
    ) {
      return 'ToolList'
    }

  } catch (e) {
    console.warn(`Failed to sniff file content for ${fileName}:`, e)
  }

  // Fallback to filename
  const name = fileName.toLowerCase()
  if (name.includes('simulation') && name.includes('status')) return 'SimulationStatus'
  if (name.includes('robot') && name.includes('list')) return 'RobotList'
  if (name.includes('wg') || name.includes('weld') || name.includes('gun')) return 'ToolList'
  if (name.includes('tool') || name.includes('equipment')) return 'ToolList'

  return 'Unknown'
}

// ============================================================================
// MAIN INGESTION API
// ============================================================================

/**
 * High-level ingestion entry point.
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
      // Read workbook first
      const workbook = await readWorkbook(file)

      // Detect type
      const kind = detectFileType(workbook, file.name)

      if (kind === 'Unknown') {
        allWarnings.push(createUnknownFileTypeWarning({
          fileName: file.name
        }))
        continue
      }

      // Route to appropriate parser
      if (kind === 'SimulationStatus') {
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

      if (kind === 'RobotList') {
        const result = await parseRobotList(workbook, file.name)

        if (!ingestedData.robots) {
          ingestedData.robots = result
        } else {
          ingestedData.robots.robots.push(...result.robots)
          ingestedData.robots.warnings.push(...result.warnings)
        }
      }

      if (kind === 'ToolList') {
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

  // Capture daily snapshot for all imported projects (Git-style history)
  const sourceFileNames = allFiles.map(f => f.name)
  captureAllProjectSnapshots({
    capturedBy: 'ingestion',
    sourceFiles: sourceFileNames,
    description: `Import from ${sourceFileNames.length} file(s)`
  }).catch(err => {
    console.error('[Ingestion] Failed to capture snapshot:', err)
  })

  return {
    projectsCount: state.projects.length,
    areasCount: state.areas.length,
    cellsCount: state.cells.length,
    robotsCount: state.assets.filter(a => a.kind === 'ROBOT').length,
    toolsCount: state.assets.filter(a => a.kind !== 'ROBOT').length,
    warnings: allWarnings
  }
}
