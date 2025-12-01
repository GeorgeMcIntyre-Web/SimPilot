// Unified Asset Model
// Extracted to separate file to resolve circular dependencies and build issues

export type EquipmentSourcing = 'NEW_BUY' | 'REUSE' | 'MAKE' | 'FREE_ISSUE' | 'UNKNOWN'

export type AssetKind = 'ROBOT' | 'GUN' | 'TOOL' | 'STAND' | 'OTHER'

export interface UnifiedAsset {
    id: string
    kind: AssetKind
    name: string

    // Core Logic Fields
    areaId?: string
    areaName?: string
    cellId?: string | null
    stationNumber?: string
    sourcing: EquipmentSourcing

    // Specific Fields (Optional based on Kind)
    oemModel?: string       // Robot/Tool
    description?: string    // Robot
    gunNumber?: string      // Gun
    supplier?: string       // Gun
    type?: string           // Gun/Stand
    maxForce?: number | null // Gun
    payloadClass?: string   // Gun
    standNumber?: string    // Stand
    referenceNumber?: string // Stand

    // The "Catch-All" Bucket for future-proofing
    metadata: Record<string, string | number | boolean | null>

    // Source tracking
    sourceFile: string
    lastUpdated?: string
    sheetName: string
    rowIndex: number
    notes?: string
}
