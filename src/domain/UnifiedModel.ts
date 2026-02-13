// Unified Asset Model
// Extracted to separate file to resolve circular dependencies and build issues

export type EquipmentSourcing = 'NEW_BUY' | 'REUSE' | 'MAKE' | 'UNKNOWN'

export type AssetKind = 'ROBOT' | 'GUN' | 'TOOL' | 'OTHER'

export interface UnifiedAsset {
  id: string
  name: string
  kind: AssetKind
  sourcing: EquipmentSourcing
  metadata: Record<string, string | number | boolean | null> // The Catch-All

  // Core Logic Fields
  areaId?: string
  areaName?: string
  projectId?: string
  cellId?: string | null
  stationNumber?: string

  // Canonical IDs for schema-agnostic linking
  stationId?: string | null // canonical station ID (area|station normalized)
  robotId?: string | null // canonical robot ID (stationId|R:caption)
  toolId?: string | null // canonical tool ID (stationId|T:toolCode)

  // Active status (for handling strikethrough/removed tooling)
  isActive?: boolean // default true; false if row has strikethrough (inactive/removed tooling)

  // Specific Fields (Optional - kept for convenience, but could be in metadata)
  oemModel?: string
  description?: string
  gunNumber?: string
  supplier?: string
  type?: string
  maxForce?: number | null
  payloadClass?: string
  standNumber?: string
  referenceNumber?: string

  // Source tracking
  sourceFile: string
  lastUpdated?: string
  sheetName: string
  rowIndex: number
  notes?: string
}
