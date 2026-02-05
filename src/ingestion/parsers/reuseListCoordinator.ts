/**
 * REUSE LIST COORDINATOR
 *
 * Central orchestration module that:
 * - Discovers and loads all reuse workbooks (INTERNAL + DesignOS)
 * - Calls the correct parser for each workbook type
 * - Applies precedence rules (INTERNAL > DesignOS)
 * - Deduplicates and produces canonical reuse records
 *
 * Part of Phase 3: Reuse List Orchestration
 */

import * as path from 'path'
import * as fs from 'fs/promises'
import * as XLSX from 'xlsx'
import {
  ReuseAllocationStatus,
  type ParsedAssetRow,
  type WorkbookConfig,
  type SourceWorkbookId,
} from '../excelIngestionTypes'
import { parseReuseListRisers } from './reuseListRisersParser'
import { parseReuseListTipDressers } from './reuseListTipDressersParser'
import { parseReuseListTMSWG } from './reuseListTMSWGParser'

/**
 * Canonical reuse record type
 * Represents a single piece of reusable equipment across all workbooks
 */
export type ReuseRecord = {
  id: string // stable key for deduplication
  assetType: 'Riser' | 'TipDresser' | 'TMSGun'
  allocationStatus: ReuseAllocationStatus

  // OLD location / project (where equipment came from)
  oldProject: string | null
  oldLine: string | null
  oldStation: string | null

  // TARGET (new) location / project (where equipment will go)
  targetProject: string | null
  targetLine: string | null
  targetStation: string | null

  // Technical identifiers
  partNumber?: string | null
  model?: string | null
  serialNumber?: string | null
  riserType?: string | null
  gunId?: string | null
  tipDresserId?: string | null

  // Provenance
  workbookId: string
  sheetName: string
  rowIndex: number
  source: 'INTERNAL' | 'DESIGNOS'

  // Free text tags for debugging
  tags: string[]
}

export type ReuseCoordinatorOptions = {
  dataRoot: string // root dir for 03_Simulation / DesignOS
}

export type ReuseCoordinatorResult = {
  records: ReuseRecord[]
  errors: string[]
}

type WorkbookDescriptor = {
  assetType: 'Riser' | 'TipDresser' | 'TMSGun'
  filename: string
  source: 'INTERNAL' | 'DESIGNOS'
  fullPath: string
}

/**
 * Load and coordinate all reuse lists from INTERNAL and DesignOS sources
 */
export async function loadAllReuseLists(
  options: ReuseCoordinatorOptions,
): Promise<ReuseCoordinatorResult> {
  const errors: string[] = []
  const allParsedRows: Array<{
    parsed: ParsedAssetRow
    workbookConfig: WorkbookConfig
    source: 'INTERNAL' | 'DESIGNOS'
  }> = []

  // Discover all reuse workbooks
  const workbooks = await discoverReuseWorkbooks(options.dataRoot)

  if (workbooks.length === 0) {
    errors.push('No reuse workbooks found in data root')
    return { records: [], errors }
  }

  // Parse each workbook with appropriate parser
  for (const wb of workbooks) {
    const parseResult = await parseWorkbook(wb)

    if (parseResult.parseErrors.length > 0) {
      errors.push(...parseResult.parseErrors)
    }

    const workbookConfig = buildWorkbookConfig(wb)

    for (const parsed of parseResult.parsedRows) {
      allParsedRows.push({
        parsed,
        workbookConfig,
        source: wb.source,
      })
    }
  }

  // Convert to canonical ReuseRecords
  const records = allParsedRows.map(({ parsed, workbookConfig, source }) =>
    parsedRowToReuseRecord(parsed, workbookConfig, source),
  )

  // Apply precedence rules and deduplicate
  const dedupedRecords = applyPrecedenceAndDedupe(records, errors)

  return {
    records: dedupedRecords,
    errors,
  }
}

/**
 * Discover all reuse workbooks in INTERNAL and DesignOS directories
 */
async function discoverReuseWorkbooks(dataRoot: string): Promise<WorkbookDescriptor[]> {
  const workbooks: WorkbookDescriptor[] = []

  const configs: Array<{
    source: 'INTERNAL' | 'DESIGNOS'
    subdir: string
    assetType: 'Riser' | 'TipDresser' | 'TMSGun'
    filename: string
  }> = [
    // INTERNAL workbooks
    {
      source: 'INTERNAL',
      subdir: '03_Simulation/01_Equipment_List',
      assetType: 'Riser',
      filename: 'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
    },
    {
      source: 'INTERNAL',
      subdir: '03_Simulation/01_Equipment_List',
      assetType: 'TipDresser',
      filename: 'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx',
    },
    {
      source: 'INTERNAL',
      subdir: '03_Simulation/01_Equipment_List',
      assetType: 'TMSGun',
      filename: 'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
    },

    // DesignOS workbooks
    {
      source: 'DESIGNOS',
      subdir: 'DesignOS/01_Equipment_List',
      assetType: 'Riser',
      filename: 'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
    },
    {
      source: 'DESIGNOS',
      subdir: 'DesignOS/01_Equipment_List',
      assetType: 'TipDresser',
      filename: 'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx',
    },
    {
      source: 'DESIGNOS',
      subdir: 'DesignOS/01_Equipment_List',
      assetType: 'TMSGun',
      filename: 'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
    },
  ]

  for (const config of configs) {
    const fullPath = path.join(dataRoot, config.subdir, config.filename)

    try {
      await fs.access(fullPath)
      workbooks.push({
        assetType: config.assetType,
        filename: config.filename,
        source: config.source,
        fullPath,
      })
    } catch (_err) {
      // File doesn't exist, not an error - just skip
      continue
    }
  }

  return workbooks
}

/**
 * Parse a single workbook using the correct parser
 */
async function parseWorkbook(
  wb: WorkbookDescriptor,
): Promise<{ parsedRows: ParsedAssetRow[]; parseErrors: string[] }> {
  const parseErrors: string[] = []

  try {
    // Load workbook
    const workbook = XLSX.readFile(wb.fullPath)
    const workbookConfig = buildWorkbookConfig(wb)

    // Get the first sheet (reuse lists typically have one main sheet)
    const sheetName = workbook.SheetNames[0]

    if (sheetName === undefined) {
      parseErrors.push(`No sheets found in ${wb.filename}`)
      return { parsedRows: [], parseErrors }
    }

    const sheet = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

    let parsedRows: ParsedAssetRow[] = []

    if (wb.assetType === 'Riser') {
      parsedRows = parseReuseListRisers(rawRows, workbookConfig, sheetName, wb.filename)
    }

    if (wb.assetType === 'TipDresser') {
      parsedRows = parseReuseListTipDressers(rawRows, workbookConfig, sheetName, wb.filename)
    }

    if (wb.assetType === 'TMSGun') {
      parsedRows = parseReuseListTMSWG(rawRows, workbookConfig, sheetName, wb.filename)
    }

    return { parsedRows, parseErrors }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    parseErrors.push(`Failed to parse ${wb.filename}: ${message}`)
    return { parsedRows: [], parseErrors }
  }
}

/**
 * Build workbook config for a reuse workbook
 */
function buildWorkbookConfig(wb: WorkbookDescriptor): WorkbookConfig {
  const workbookId = deriveWorkbookId(wb)

  return {
    workbookId,
    simulationSourceKind: wb.source === 'INTERNAL' ? 'InternalSimulation' : 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: `${wb.filename} (${wb.source})`,
    expectedSheets: [],
  }
}

/**
 * Derive workbook ID from descriptor
 */
function deriveWorkbookId(wb: WorkbookDescriptor): SourceWorkbookId {
  if (wb.filename === 'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx') {
    return wb.source === 'INTERNAL'
      ? 'GLOBAL_ZA_REUSE_RISERS_INTERNAL'
      : 'GLOBAL_ZA_REUSE_RISERS_OUTSOURCE'
  }

  if (wb.filename === 'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx') {
    return wb.source === 'INTERNAL'
      ? 'GLOBAL_ZA_REUSE_TIP_DRESSER_INTERNAL'
      : 'GLOBAL_ZA_REUSE_TIP_DRESSER_OUTSOURCE'
  }

  if (wb.filename === 'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx') {
    return wb.source === 'INTERNAL'
      ? 'GLOBAL_ZA_REUSE_TMS_WG_INTERNAL'
      : 'GLOBAL_ZA_REUSE_TMS_WG_OUTSOURCE'
  }

  return 'UNKNOWN_WORKBOOK'
}

/**
 * Convert ParsedAssetRow to canonical ReuseRecord
 */
function parsedRowToReuseRecord(
  parsed: ParsedAssetRow,
  _workbookConfig: WorkbookConfig,
  source: 'INTERNAL' | 'DESIGNOS',
): ReuseRecord {
  // Determine asset type from detailedKind
  let assetType: 'Riser' | 'TipDresser' | 'TMSGun' = 'Riser'

  if (parsed.detailedKind === 'TipDresser') {
    assetType = 'TipDresser'
  }

  if (parsed.detailedKind === 'TMSGun' || parsed.detailedKind === 'WeldGun') {
    assetType = 'TMSGun'
  }

  if (parsed.detailedKind === 'Riser') {
    assetType = 'Riser'
  }

  // Build stable ID for deduplication
  const id = buildStableIdFromParsed(parsed, assetType)

  return {
    id,
    assetType,
    allocationStatus: parsed.reuseAllocationStatus || 'UNKNOWN',

    oldProject: parsed.oldProject || null,
    oldLine: parsed.oldLine || null,
    oldStation: parsed.oldStation || null,

    targetProject: parsed.targetProject || null,
    targetLine: parsed.targetLine || null,
    targetStation: parsed.targetStation || null,

    partNumber: parsed.partNumber || null,
    model: null,
    serialNumber: null,
    riserType: null,
    gunId: null,
    tipDresserId: null,

    workbookId: parsed.sourceWorkbookId,
    sheetName: parsed.sourceSheetName,
    rowIndex: parsed.sourceRowIndex,
    source,

    tags: [],
  }
}

/**
 * Build a stable ID for deduplication from ParsedAssetRow
 * Uses assetType + identifiers + old location
 */
function buildStableIdFromParsed(parsed: ParsedAssetRow, assetType: string): string {
  const parts: string[] = [assetType]

  // Add primary identifiers
  if (parsed.partNumber) {
    parts.push(`pn:${parsed.partNumber}`)
  }

  if (parsed.name) {
    parts.push(`name:${parsed.name}`)
  }

  // Add old location as disambiguation
  if (parsed.oldProject) {
    parts.push(`old:${parsed.oldProject}`)
  }

  if (parsed.oldStation) {
    parts.push(`sta:${parsed.oldStation}`)
  }

  // Must have at least some identifying info
  if (parts.length === 1) {
    // Only assetType, add fallback from workbook/row
    parts.push(`wb:${parsed.sourceWorkbookId}:${parsed.sourceRowIndex}`)
  }

  return parts.join('|')
}

/**
 * Apply precedence rules and deduplicate records
 *
 * Rules:
 * 1. INTERNAL copy is canonical when same file exists in both INTERNAL and DesignOS
 * 2. If item exists in both, prefer INTERNAL attributes but add DesignOS as tag
 * 3. If item exists only in DesignOS, include as valid reuse candidate
 */
function applyPrecedenceAndDedupe(records: ReuseRecord[], errors: string[]): ReuseRecord[] {
  const recordMap = new Map<string, ReuseRecord>()

  for (const record of records) {
    const existingRecord = recordMap.get(record.id)

    if (existingRecord === undefined) {
      // First occurrence of this ID
      recordMap.set(record.id, record)
      continue
    }

    // Duplicate found - apply precedence
    if (existingRecord.source === 'INTERNAL') {
      // INTERNAL already present, add DesignOS as tag
      if (record.source === 'DESIGNOS') {
        existingRecord.tags.push('also-in-designos')
      }
      continue
    }

    if (record.source === 'INTERNAL') {
      // Replace DesignOS with INTERNAL
      const mergedTags = [...record.tags, 'also-in-designos']
      recordMap.set(record.id, { ...record, tags: mergedTags })
      continue
    }

    // Both DesignOS - keep first, note duplicate
    existingRecord.tags.push('duplicate-in-designos')
    errors.push(`Duplicate DesignOS record for ID: ${record.id}`)
  }

  return Array.from(recordMap.values())
}

/**
 * Summarize reuse records for debugging and data health
 */
export function summarizeReuseRecords(records: ReuseRecord[]): {
  total: number
  byType: Record<string, number>
  byStatus: Record<ReuseAllocationStatus, number>
} {
  const byType: Record<string, number> = {}
  const byStatus: Record<ReuseAllocationStatus, number> = {
    AVAILABLE: 0,
    ALLOCATED: 0,
    IN_USE: 0,
    RESERVED: 0,
    UNKNOWN: 0,
  }

  for (const record of records) {
    // Count by type
    const currentTypeCount = byType[record.assetType] || 0
    byType[record.assetType] = currentTypeCount + 1

    // Count by status
    const currentStatusCount = byStatus[record.allocationStatus] || 0
    byStatus[record.allocationStatus] = currentStatusCount + 1
  }

  return {
    total: records.length,
    byType,
    byStatus,
  }
}
