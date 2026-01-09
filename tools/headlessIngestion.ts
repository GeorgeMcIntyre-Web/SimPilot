/**
 * Headless Ingestion Runner
 *
 * Provides a Node.js-compatible wrapper around the SimPilot ingestion pipeline.
 * Bypasses React/browser dependencies (IndexedDB, React hooks) and operates on
 * pure in-memory data structures.
 */

import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import { loadWorkbookFromBuffer } from '../src/ingestion/workbookLoader'
import { scanWorkbook, categoryToFileKind, type FileKind, type SheetDetection } from '../src/ingestion/sheetSniffer'
import { parseSimulationStatus } from '../src/ingestion/simulationStatusParser'
import { parseRobotList } from '../src/ingestion/robotListParser'
import { parseToolList } from '../src/ingestion/toolListParser'
import { parseAssembliesList } from '../src/ingestion/assembliesListParser'
import { applyIngestedData, type IngestedData, type ApplyResult } from '../src/ingestion/applyIngestedData'
import { log } from './nodeLog'

// ============================================================================
// TYPES
// ============================================================================

export interface HeadlessFile {
  path: string
  name: string
  buffer: ArrayBuffer
}

export interface SheetCandidate {
  sheetName: string
  category: string
  score: number
  maxRow: number
  nameScore: number
  strongMatches: string[]
  weakMatches: string[]
}

export interface SheetDiagnostics {
  allSheets: Array<{ name: string; maxRow: number; maxCol: number }>
  chosenSheet: string | null
  chosenScore: number
  topCandidates: SheetCandidate[]
}

export interface HeadlessIngestionResult {
  fileName: string
  filePath: string
  detectedType: FileKind
  detectedSheet: string | null
  detectionScore: number
  sheetDiagnostics?: SheetDiagnostics
  success: boolean
  error?: string
  applyResult?: ApplyResult
  warnings: string[]
}

export interface HeadlessStore {
  projects: ApplyResult['projects']
  areas: ApplyResult['areas']
  cells: ApplyResult['cells']
  tools: ApplyResult['tools']
  robots: ApplyResult['robots']
}

// ============================================================================
// HEADLESS FILE LOADING
// ============================================================================

/**
 * Load a file from filesystem into a HeadlessFile structure
 */
export function loadFile(filePath: string): HeadlessFile {
  const buffer = readFileSync(filePath)
  const name = filePath.split(/[\\/]/).pop() || 'unknown.xlsx'

  return {
    path: filePath,
    name,
    buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }
}

/**
 * Create a File-like object for compatibility with existing parsers
 */
export function createFileFromBuffer(name: string, buffer: ArrayBuffer): File {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  // Create a File-like object
  const file = blob as unknown as File
  Object.defineProperty(file, 'name', { value: name })
  Object.defineProperty(file, 'lastModified', { value: Date.now() })

  return file
}

// ============================================================================
// HEADLESS INGESTION
// ============================================================================

/**
 * Ingest a single Excel file in headless mode
 */
export async function ingestFileHeadless(
  file: HeadlessFile
): Promise<HeadlessIngestionResult> {
  try {
    log.debug(`[HeadlessIngestion] Processing ${file.name}`)

    // Load workbook
    const normalizedWorkbook = loadWorkbookFromBuffer(file.buffer, file.name)

    if (normalizedWorkbook.sheets.length === 0) {
      return {
        fileName: file.name,
        filePath: file.path,
        detectedType: 'Unknown',
        detectedSheet: null,
        detectionScore: 0,
        success: false,
        error: 'No sheets found in workbook',
        warnings: []
      }
    }

    // Convert to XLSX.WorkBook for compatibility with existing parsers
    const xlsxWorkbook = XLSX.read(file.buffer, { type: 'array' })

    // Detect sheet type
    const scanResult = scanWorkbook(xlsxWorkbook, file.name)

    // Collect sheet diagnostics
    const allSheets = xlsxWorkbook.SheetNames.map(name => {
      const sheet = xlsxWorkbook.Sheets[name]
      const range = sheet && sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null
      return {
        name,
        maxRow: range ? range.e.r + 1 : 0,
        maxCol: range ? range.e.c + 1 : 0
      }
    })

    const topCandidates = scanResult.allDetections
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(d => ({
        sheetName: d.sheetName,
        category: d.category,
        score: d.score,
        maxRow: d.maxRow || 0,
        nameScore: d.nameScore || 0,
        strongMatches: d.strongMatches,
        weakMatches: d.weakMatches
      }))

    const sheetDiagnostics: SheetDiagnostics = {
      allSheets,
      chosenSheet: scanResult.bestOverall?.sheetName || null,
      chosenScore: scanResult.bestOverall?.score || 0,
      topCandidates
    }

    if (!scanResult.bestOverall) {
      return {
        fileName: file.name,
        filePath: file.path,
        detectedType: 'Unknown',
        detectedSheet: null,
        detectionScore: 0,
        sheetDiagnostics,
        success: false,
        error: 'Could not detect sheet type',
        warnings: []
      }
    }

    const detection = scanResult.bestOverall
    const fileKind = categoryToFileKind(detection.category)
    const sheetName = detection.sheetName

    log.debug(`[HeadlessIngestion] Detected type: ${fileKind}, sheet: ${sheetName}, score: ${detection.score}`)

    // Parse based on detected type
    const ingestedData: IngestedData = {
      simulation: undefined,
      robots: undefined,
      tools: undefined
    }

    const allWarnings: string[] = []

    try {
      if (fileKind === 'SimulationStatus') {
        const result = await parseSimulationStatus(xlsxWorkbook, file.name, sheetName)
        ingestedData.simulation = result
        allWarnings.push(...result.warnings.map(w => w.message))
      } else if (fileKind === 'RobotList') {
        const result = await parseRobotList(xlsxWorkbook, file.name, sheetName)
        ingestedData.robots = result
        allWarnings.push(...result.warnings.map(w => w.message))
      } else if (fileKind === 'ToolList') {
        const result = await parseToolList(xlsxWorkbook, file.name, sheetName)
        ingestedData.tools = result
        allWarnings.push(...result.warnings.map(w => w.message))
      } else if (fileKind === 'AssembliesList') {
        const result = await parseAssembliesList(xlsxWorkbook, file.name, sheetName)
        ingestedData.tools = result
        allWarnings.push(...result.warnings.map(w => w.message))
      } else {
        return {
          fileName: file.name,
          filePath: file.path,
          detectedType: fileKind,
          detectedSheet: sheetName,
          detectionScore: detection.score,
          sheetDiagnostics,
          success: false,
          error: `Unsupported file type: ${fileKind}`,
          warnings: []
        }
      }

      // Apply ingested data (linking, normalization)
      const applyResult = applyIngestedData(ingestedData)
      allWarnings.push(...applyResult.warnings.map(w => w.message))

      return {
        fileName: file.name,
        filePath: file.path,
        detectedType: fileKind,
        detectedSheet: sheetName,
        detectionScore: detection.score,
        sheetDiagnostics,
        success: true,
        applyResult,
        warnings: allWarnings
      }
    } catch (parseError) {
      return {
        fileName: file.name,
        filePath: file.path,
        detectedType: fileKind,
        detectedSheet: sheetName,
        detectionScore: detection.score,
        sheetDiagnostics,
        success: false,
        error: String(parseError),
        warnings: allWarnings
      }
    }
  } catch (error) {
    // For early errors before sheet detection, provide empty diagnostics
    const xlsxWorkbook = XLSX.read(file.buffer, { type: 'array' }).catch(() => null)
    const emptyDiagnostics: SheetDiagnostics = {
      allSheets: [],
      chosenSheet: null,
      chosenScore: 0,
      topCandidates: []
    }

    return {
      fileName: file.name,
      filePath: file.path,
      detectedType: 'Unknown',
      detectedSheet: null,
      detectionScore: 0,
      sheetDiagnostics: emptyDiagnostics,
      success: false,
      error: String(error),
      warnings: []
    }
  }
}

/**
 * Ingest multiple files in sequence and merge results
 */
export async function ingestFilesHeadless(
  files: HeadlessFile[]
): Promise<{
  results: HeadlessIngestionResult[]
  store: HeadlessStore
}> {
  const results: HeadlessIngestionResult[] = []
  const store: HeadlessStore = {
    projects: [],
    areas: [],
    cells: [],
    tools: [],
    robots: []
  }

  for (const file of files) {
    const result = await ingestFileHeadless(file)
    results.push(result)

    // Merge successful results into store
    if (result.success && result.applyResult) {
      // Simple merge: concatenate arrays (deduplication would happen in real app)
      store.projects.push(...result.applyResult.projects)
      store.areas.push(...result.applyResult.areas)
      store.cells.push(...result.applyResult.cells)
      store.tools.push(...result.applyResult.tools)
      store.robots.push(...result.applyResult.robots)
    }
  }

  return { results, store }
}

/**
 * Ingest files in a specific order (Tool -> Robot -> Simulation)
 * This ensures proper cross-referencing
 */
export async function ingestFilesOrdered(
  files: HeadlessFile[]
): Promise<{
  results: HeadlessIngestionResult[]
  store: HeadlessStore
}> {
  // First pass: detect types
  const detectionPromises = files.map(async file => {
    const xlsxWorkbook = XLSX.read(file.buffer, { type: 'array' })
    const scanResult = scanWorkbook(xlsxWorkbook, file.name)
    const detection = scanResult.bestOverall
    const fileKind = detection ? categoryToFileKind(detection.category) : 'Unknown'

    return { file, fileKind }
  })

  const detected = await Promise.all(detectionPromises)

  // Sort files by ingestion priority
  const priority: Record<FileKind, number> = {
    ToolList: 1,
    RobotList: 2,
    SimulationStatus: 3,
    AssembliesList: 4,
    Unknown: 5,
    Metadata: 6
  }

  const sorted = detected.sort((a, b) => {
    return priority[a.fileKind] - priority[b.fileKind]
  })

  log.info(`[HeadlessIngestion] Ingestion order:`)
  sorted.forEach((item, idx) => {
    log.info(`  ${idx + 1}. ${item.file.name} (${item.fileKind})`)
  })

  // Ingest in order
  return ingestFilesHeadless(sorted.map(s => s.file))
}
