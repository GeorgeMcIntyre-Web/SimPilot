// Ingestion Coordinator V2 - Parser Router
// Routes files to appropriate parsers based on category

import * as XLSX from 'xlsx'
import type { IngestionWarning } from '../../domain/core'
import type { FileScanSummary } from '../ingestionTelemetry'
import type { SheetCategory } from '../sheetSniffer'
import type { IngestedData } from '../applyIngestedData'
import { parseSimulationStatus } from '../simulationStatusParser'
import { parseRobotList } from '../robotListParser'
import { parseToolList } from '../toolListParser'

/**
 * Result from a parser
 */
export interface ParserResult {
  projects?: { id: string }[]
  areas?: { id: string }[]
  cells?: { id: string }[]
  robots?: { id: string }[]
  tools?: { id: string }[]
  warnings: IngestionWarning[]
}

/**
 * Route to the appropriate parser based on category
 */
export async function routeToParser(
  workbook: XLSX.WorkBook,
  fileName: string,
  scanSummary: FileScanSummary
): Promise<ParserResult> {
  const fileKind = scanSummary.fileKind
  const sheetName = scanSummary.sheetName

  if (fileKind === 'SimulationStatus') {
    const result = await parseSimulationStatus(workbook, fileName, sheetName)
    return {
      projects: result.projects,
      areas: result.areas,
      cells: result.cells,
      warnings: result.warnings
    }
  }

  if (fileKind === 'RobotList') {
    const result = await parseRobotList(workbook, fileName, sheetName)
    return {
      robots: result.robots,
      warnings: result.warnings
    }
  }

  if (fileKind === 'ToolList') {
    const result = await parseToolList(workbook, fileName, sheetName)
    return {
      tools: result.tools,
      warnings: result.warnings
    }
  }

  // Metadata and Unknown don't have parsers yet
  return { warnings: [] }
}

/**
 * Merge parser results into the ingested data accumulator
 */
export function mergeParserResult(
  ingestedData: IngestedData,
  result: ParserResult,
  _category: SheetCategory
): void {
  // Simulation data
  if (result.projects && result.areas && result.cells) {
    if (ingestedData.simulation === undefined) {
      ingestedData.simulation = {
        projects: result.projects as NonNullable<IngestedData['simulation']>['projects'],
        areas: result.areas as NonNullable<IngestedData['simulation']>['areas'],
        cells: result.cells as NonNullable<IngestedData['simulation']>['cells'],
        warnings: result.warnings
      }
      return
    }

    ingestedData.simulation.projects.push(...(result.projects as NonNullable<IngestedData['simulation']>['projects']))
    ingestedData.simulation.areas.push(...(result.areas as NonNullable<IngestedData['simulation']>['areas']))
    ingestedData.simulation.cells.push(...(result.cells as NonNullable<IngestedData['simulation']>['cells']))
    ingestedData.simulation.warnings.push(...result.warnings)
    return
  }

  // Robot data
  if (result.robots) {
    if (ingestedData.robots === undefined) {
      ingestedData.robots = {
        robots: result.robots as NonNullable<IngestedData['robots']>['robots'],
        warnings: result.warnings
      }
      return
    }

    ingestedData.robots.robots.push(...(result.robots as NonNullable<IngestedData['robots']>['robots']))
    ingestedData.robots.warnings.push(...result.warnings)
    return
  }

  // Tool data
  if (result.tools) {
    if (ingestedData.tools === undefined) {
      ingestedData.tools = {
        tools: result.tools as NonNullable<IngestedData['tools']>['tools'],
        warnings: result.warnings
      }
      return
    }

    ingestedData.tools.tools.push(...(result.tools as NonNullable<IngestedData['tools']>['tools']))
    ingestedData.tools.warnings.push(...result.warnings)
  }
}
