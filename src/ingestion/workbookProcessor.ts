/**
 * Workbook Processor
 * Multi-sheet workbook processing for detecting and parsing all data types
 */

import * as XLSX from 'xlsx'
import { IngestionWarning } from '../domain/core'
import { IngestedData } from './applyIngestedData'
import { getAllDetectedSheets } from './fileClassifier'
import { SheetCategory, SheetDetection } from './sheetSniffer'
import { parseSimulationStatus } from './simulationStatusParser'
import { parseRobotList } from './robotListParser'
import { parseToolList } from './toolListParser'
import { parseAssembliesList } from './assembliesListParser'
import { createParserErrorWarning } from './warningUtils'

/**
 * Process a single workbook and extract all detected data types.
 *
 * This function detects ALL sheet types in a workbook and processes each one.
 * For example, a workbook with both a ToolList sheet and a Robot sheet
 * will have both parsed.
 */
export async function processWorkbook(
    workbook: XLSX.WorkBook,
    fileName: string
): Promise<{
    ingestedData: IngestedData
    warnings: IngestionWarning[]
    detections: Map<SheetCategory, SheetDetection>
}> {
    const ingestedData: IngestedData = {
        simulation: undefined,
        robots: undefined,
        tools: undefined
    }
    const warnings: IngestionWarning[] = []

    // Get all detected sheets
    const detections = getAllDetectedSheets(workbook, fileName)

    // Process SIMULATION_STATUS
    const simDetection = detections.get('SIMULATION_STATUS')
    if (simDetection) {
        try {
            // If the workbook contains any SIMULATION-named sheet, parse all relevant sheets;
            // otherwise fall back to the detected sheet only.
            const hasSimulationSheet = workbook.SheetNames.some(n => n.toUpperCase().includes('SIMULATION'))
            const result = hasSimulationSheet
                ? await parseSimulationStatus(workbook, fileName) // auto-detect & parse all simulation sheets
                : await parseSimulationStatus(workbook, fileName, simDetection.sheetName)
            ingestedData.simulation = result
            warnings.push(...result.warnings)
        } catch (error) {
            warnings.push(createParserErrorWarning({
                fileName,
                sheetName: simDetection.sheetName,
                error: String(error)
            }))
        }
    }

    // Process ROBOT_SPECS
    const robotDetection = detections.get('ROBOT_SPECS')
    if (robotDetection) {
        try {
            const result = await parseRobotList(workbook, fileName, robotDetection.sheetName)
            ingestedData.robots = result
            warnings.push(...result.warnings)
        } catch (error) {
            warnings.push(createParserErrorWarning({
                fileName,
                sheetName: robotDetection.sheetName,
                error: String(error)
            }))
        }
    }

    // Process tool-related categories
    const toolCategories: SheetCategory[] = [
        'IN_HOUSE_TOOLING',
        'REUSE_WELD_GUNS',
        'GUN_FORCE',
        'REUSE_RISERS'
    ]

    for (const category of toolCategories) {
        const toolDetection = detections.get(category)

        if (!toolDetection) {
            continue
        }

        try {
            const result = await parseToolList(workbook, fileName, toolDetection.sheetName)

            if (!ingestedData.tools) {
                ingestedData.tools = result
            } else {
                ingestedData.tools.tools.push(...result.tools)
                ingestedData.tools.warnings.push(...result.warnings)
            }

            warnings.push(...result.warnings)
        } catch (error) {
            warnings.push(createParserErrorWarning({
                fileName,
                sheetName: toolDetection.sheetName,
                error: String(error)
            }))
        }
    }

    // Process ASSEMBLIES_LIST
    const assembliesDetection = detections.get('ASSEMBLIES_LIST')
    if (assembliesDetection) {
        try {
            const result = await parseAssembliesList(workbook, fileName, assembliesDetection.sheetName)

            if (!ingestedData.tools) {
                ingestedData.tools = result
            } else {
                ingestedData.tools.tools.push(...result.tools)
                ingestedData.tools.warnings.push(...result.warnings)
            }

            warnings.push(...result.warnings)
        } catch (error) {
            warnings.push(createParserErrorWarning({
                fileName,
                sheetName: assembliesDetection.sheetName,
                error: String(error)
            }))
        }
    }

    return { ingestedData, warnings, detections }
}
