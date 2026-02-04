// Excel Ingestion Types - Raw Row Types
// Stage 1 & 2 data structures for Excel row processing

import type { EquipmentSourcing } from '../../domain/UnifiedModel'
import type { DetailedAssetKind } from './assetClassification'
import type { ReuseAllocationStatus } from './reuseAllocation'
import type { SourceWorkbookId } from './workbookRegistry'

/**
 * Raw row data extracted from Excel.
 * Stage 1 output - no domain logic applied yet.
 */
export interface RawRow {
  workbookId: SourceWorkbookId
  sheetName: string
  rowIndex: number
  cells: Record<string, unknown>  // headerKey → cell value
}

/**
 * Parsed asset row with domain fields extracted.
 * Stage 2 output - ready for classification and linking.
 */
export interface ParsedAssetRow {
  // Asset identity
  name: string
  detailedKind: DetailedAssetKind
  sourcing: EquipmentSourcing

  // Provenance
  sourceWorkbookId: SourceWorkbookId
  sourceFile: string
  sourceSheetName: string
  sourceRowIndex: number

  // Hierarchy (optional - may be minimal for reuse pool equipment)
  projectCode?: string | null
  areaName?: string | null
  assemblyLine?: string | null
  station?: string | null

  // Asset identity (optional)
  robotNumber?: string | null
  partNumber?: string | null

  // Reuse allocation tracking (for reuse list items)
  reuseAllocationStatus?: ReuseAllocationStatus
  oldProject?: string | null
  oldArea?: string | null
  oldLine?: string | null
  oldStation?: string | null
  targetProject?: string | null
  targetLine?: string | null
  targetStation?: string | null
  targetSector?: string | null

  // Classification hints
  applicationCode?: string | null
  technologyCode?: string | null
  lifecycleHint?: string | null

  // Raw data for classification
  rawTags: string[]
  notes?: string | null
  rawLocation?: string | null  // Unparsed location string for future processing
}

/**
 * Build a unique ID for a raw row
 */
export function buildRawRowId(workbookId: SourceWorkbookId, sheetName: string, rowIndex: number): string {
  return `${workbookId}:${sheetName}:${rowIndex}`
}

/**
 * Build a canonical asset key for cross-workbook linking.
 * Assets with the same key should be merged/linked.
 *
 * For reuse pool equipment, use flexible params (name + location + station)
 */
export function buildAssetKey(input: {
  name?: string | null
  location?: string | null
  station?: string | null
  projectCode?: string | null
  areaName?: string | null
  assemblyLine?: string | null
  robotNumber?: string | null
  assetName?: string | null
}): string {
  const parts: string[] = []

  // Type A: Check if this is a reuse list asset (has name/location but no project hierarchy)
  const isReuseAsset = (input.name !== null && input.name !== undefined && input.name.trim().length > 0) ||
                        (input.location !== null && input.location !== undefined && input.location.trim().length > 0)
  const hasProjectHierarchy = (input.projectCode !== null && input.projectCode !== undefined && input.projectCode.trim().length > 0)

  if (isReuseAsset && !hasProjectHierarchy) {
    // For reuse list assets, use simpler key structure: name|location|station
    if (input.name !== null && input.name !== undefined && input.name.trim().length > 0) {
      parts.push(input.name.trim().toLowerCase())
    }

    if (input.location !== null && input.location !== undefined && input.location.trim().length > 0) {
      parts.push(input.location.trim().toLowerCase())
    }

    if (input.station !== null && input.station !== undefined && input.station.trim().length > 0) {
      parts.push(input.station.trim().toLowerCase())
    }
  } else {
    // For simulation status assets, use full hierarchy: projectCode|areaName|assemblyLine|station|robotNumber|assetName
    if (input.projectCode !== null && input.projectCode !== undefined && input.projectCode.trim().length > 0) {
      parts.push(input.projectCode.trim().toLowerCase())
    }

    if (input.areaName !== null && input.areaName !== undefined && input.areaName.trim().length > 0) {
      parts.push(input.areaName.trim().toLowerCase())
    }

    if (input.assemblyLine !== null && input.assemblyLine !== undefined && input.assemblyLine.trim().length > 0) {
      parts.push(input.assemblyLine.trim().toLowerCase())
    }

    if (input.station !== null && input.station !== undefined && input.station.trim().length > 0) {
      parts.push(input.station.trim().toLowerCase())
    }

    if (input.robotNumber !== null && input.robotNumber !== undefined && input.robotNumber.trim().length > 0) {
      parts.push(input.robotNumber.trim().toLowerCase())
    }

    if (input.assetName !== null && input.assetName !== undefined && input.assetName.trim().length > 0) {
      parts.push(input.assetName.trim().toLowerCase())
    }
  }

  // Must have at least one part
  if (parts.length === 0) {
    return 'UNKNOWN_ASSET'
  }

  return parts.join('|')
}
