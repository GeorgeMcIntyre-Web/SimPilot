// Excel Ingestion Types - Extended Asset
// Extended asset type with Excel-specific metadata

import type { UnifiedAsset } from '../../domain/UnifiedModel'
import type { DetailedAssetKind } from './assetClassification'
import { mapDetailedKindToAssetKind } from './assetClassification'
import type { SimulationSourceKind, SiteLocation } from './sourceLocation'
import type { ReuseAllocationStatus } from './reuseAllocation'
import type { SourceWorkbookId } from './workbookRegistry'

/**
 * Extended asset type that builds on UnifiedAsset.
 * Adds Excel-specific metadata and provenance tracking.
 */
export interface ExcelIngestedAsset extends UnifiedAsset {
  // Additional classification
  detailedKind: DetailedAssetKind

  // Simulation context
  simulationSourceKind: SimulationSourceKind
  siteLocation: SiteLocation

  // Hierarchy (in addition to UnifiedAsset's areaId/cellId)
  projectCode?: string
  assemblyLine?: string | null
  station?: string | null

  // Robot-specific
  robotNumber?: string | null
  robotOrderCode?: string | null
  robotType?: string | null
  payloadKg?: number | null
  reachMm?: number | null
  trackUsed?: boolean | null

  // Application/Technology
  applicationCode?: string | null
  technologyCode?: string | null

  // Reuse allocation tracking (for equipment from reuse lists)
  reuseAllocationStatus?: ReuseAllocationStatus

  // OLD location (from reuse list - where equipment came from)
  oldProject?: string | null
  oldLine?: string | null
  oldStation?: string | null
  oldArea?: string | null

  // NEW/TARGET location (from reuse list - where it's being allocated to)
  targetProject?: string | null   // "Project STLA/P1H/O1H/LPM"
  targetLine?: string | null       // "New Line"
  targetStation?: string | null    // "New station"
  targetSector?: string | null     // "New Sector"

  // Provenance (enhances UnifiedAsset's sourceFile/sheetName/rowIndex)
  primaryWorkbookId: SourceWorkbookId
  sourceWorkbookIds: SourceWorkbookId[]
  sourceSheetNames: string[]
  rawRowIds: string[]

  // Free-form tags for debugging and future rules
  rawTags: string[]
}

/**
 * Convert ExcelIngestedAsset to UnifiedAsset for storage/API
 */
export function toUnifiedAsset(excelAsset: ExcelIngestedAsset): UnifiedAsset {
  return {
    id: excelAsset.id,
    name: excelAsset.name,
    kind: mapDetailedKindToAssetKind(excelAsset.detailedKind),
    sourcing: excelAsset.sourcing,
    metadata: {
      ...excelAsset.metadata,
      detailedKind: excelAsset.detailedKind,
      simulationSourceKind: excelAsset.simulationSourceKind,
      siteLocation: excelAsset.siteLocation,
      projectCode: excelAsset.projectCode ?? null,
      assemblyLine: excelAsset.assemblyLine ?? null,
      robotNumber: excelAsset.robotNumber ?? null,
      robotOrderCode: excelAsset.robotOrderCode ?? null,
      robotType: excelAsset.robotType ?? null,
      applicationCode: excelAsset.applicationCode ?? null,
      technologyCode: excelAsset.technologyCode ?? null,
      reuseAllocationStatus: excelAsset.reuseAllocationStatus ?? null,
      oldProject: excelAsset.oldProject ?? null,
      oldLine: excelAsset.oldLine ?? null,
      oldStation: excelAsset.oldStation ?? null,
      oldArea: excelAsset.oldArea ?? null,
      targetProject: excelAsset.targetProject ?? null,
      targetLine: excelAsset.targetLine ?? null,
      targetStation: excelAsset.targetStation ?? null,
      targetSector: excelAsset.targetSector ?? null,
      primaryWorkbookId: excelAsset.primaryWorkbookId,
      sourceWorkbookIds: JSON.stringify(excelAsset.sourceWorkbookIds),
      rawTags: JSON.stringify(excelAsset.rawTags)
    },
    areaId: excelAsset.areaId,
    areaName: excelAsset.areaName,
    cellId: excelAsset.cellId,
    stationNumber: excelAsset.station ?? undefined,
    sourceFile: excelAsset.sourceFile,
    sheetName: excelAsset.sheetName,
    rowIndex: excelAsset.rowIndex,
    notes: excelAsset.notes,
    lastUpdated: excelAsset.lastUpdated,
    type: excelAsset.robotType ?? excelAsset.type,
    payloadClass: excelAsset.payloadKg !== null && excelAsset.payloadKg !== undefined
      ? `${excelAsset.payloadKg}kg`
      : excelAsset.payloadClass
  }
}
