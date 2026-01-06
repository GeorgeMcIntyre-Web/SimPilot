// UID-Backed Linking Domain Types
// Supports Excel-first, UID-backed linking with rename/move detection
// and multi-plant carry-over tooling

// ============================================================================
// PLANT CONTEXT
// ============================================================================

export type PlantKey = string // "PLANT_A", "PLANT_B", "PLANT_UNKNOWN"

/**
 * Sentinel value for unknown plant context
 * Used when plant cannot be derived from filename, metadata, or user input
 */
export const PLANT_UNKNOWN: PlantKey = 'PLANT_UNKNOWN'

// ============================================================================
// UID TYPES
// ============================================================================

export type StationUid = string // "st_<uuid>"
export type ToolUid = string    // "tl_<uuid>"
export type RobotUid = string   // "rb_<uuid>"
export type EntityUid = StationUid | ToolUid | RobotUid

export type EntityType = 'station' | 'tool' | 'robot'
export type EntityStatus = 'active' | 'inactive'

// ============================================================================
// UID GENERATION
// ============================================================================

export function generateStationUid(): StationUid {
  return `st_${crypto.randomUUID()}`
}

export function generateToolUid(): ToolUid {
  return `tl_${crypto.randomUUID()}`
}

export function generateRobotUid(): RobotUid {
  return `rb_${crypto.randomUUID()}`
}

// ============================================================================
// CANONICAL KEY TYPES
// ============================================================================

/**
 * Station labels extracted from Excel
 * Used to derive canonical key
 */
export interface StationLabels {
  line?: string           // "AL", "CA", "BN"
  bay?: string            // "010", "008"
  stationNo?: string      // "010", "10", "1"
  area?: string           // "REAR UNIT", "RR UN 1"
  fullLabel?: string      // "AL010", "CA008"
}

/**
 * Tool labels extracted from Excel
 */
export interface ToolLabels {
  toolCode?: string       // "GJR 10", "SEALER_01"
  toolName?: string       // "Spot Weld Gun 10"
  gunNumber?: string      // "GUN 10"
}

/**
 * Robot labels extracted from Excel
 */
export interface RobotLabels {
  robotCaption?: string   // "R01", "R02"
  robotName?: string      // "Robot 1"
  eNumber?: string        // "E12345" (serial number)
}

// ============================================================================
// ENTITY RECORDS
// ============================================================================

/**
 * StationRecord with stable UID (plant-scoped)
 * Tracks a real-world manufacturing station at a specific plant
 */
export interface StationRecord {
  uid: StationUid
  key: string                      // Current canonical key (plant-scoped)
  plantKey: PlantKey               // Plant context for this record
  labels: StationLabels            // Raw source fields
  attributes: Record<string, any>  // Metadata (equipment, counts, etc.)
  status: EntityStatus
  createdAt: string               // ISO timestamp
  updatedAt: string

  // Source tracking
  sourceFile?: string
  sheetName?: string
  rowIndex?: number
}

/**
 * ToolRecord with stable UID (multi-plant aware)
 * Tracks a real-world tool/gun/gripper across plants
 * The UID represents the PHYSICAL equipment, not plant-specific labels
 */
export interface ToolRecord {
  uid: ToolUid
  key: string                      // Current canonical key (plant-scoped)
  plantKey: PlantKey               // Plant context for this record
  stationUid?: StationUid | null   // Foreign key to station (current plant)

  // Multi-plant support
  labelsByPlant?: Record<PlantKey, ToolLabels>      // Different labels per plant
  stationUidByPlant?: Record<PlantKey, StationUid>  // Station mapping per plant

  // Single-plant fields (legacy/convenience)
  labels: ToolLabels
  attributes: Record<string, any>
  status: EntityStatus
  createdAt: string
  updatedAt: string

  // Source tracking
  sourceFile?: string
  sheetName?: string
  rowIndex?: number
}

/**
 * RobotRecord with stable UID (plant-scoped)
 * Tracks a real-world robot at a specific plant
 */
export interface RobotRecord {
  uid: RobotUid
  key: string                      // Current canonical key (plant-scoped)
  plantKey: PlantKey               // Plant context for this record
  stationUid?: StationUid | null   // Foreign key to station
  labels: RobotLabels
  attributes: Record<string, any>
  status: EntityStatus
  createdAt: string
  updatedAt: string

  // Source tracking
  sourceFile?: string
  sheetName?: string
  rowIndex?: number
}

// ============================================================================
// ALIAS RULES
// ============================================================================

/**
 * AliasRule: User-confirmed mapping from old key to UID (plant-scoped)
 * Created when user resolves ambiguous rename/move
 */
export interface AliasRule {
  id: string               // Unique ID for the rule
  fromKey: string          // Old canonical key (plant-scoped)
  toUid: EntityUid         // Target entity UID
  entityType: EntityType
  plantKey?: PlantKey      // Plant scope (if omitted, treated as global)
  isGlobal?: boolean       // True if alias applies across all plants
  reason: string           // "User confirmed station renumber" / "Carry-over from Plant A"
  createdAt: string
  createdBy?: string       // User ID if available
}

// ============================================================================
// IMPORT RUN
// ============================================================================

export type ImportSourceType = 'toolList' | 'robotList' | 'simulationStatus'

/**
 * ImportRun: Record of each ingestion operation (plant-aware)
 */
export interface ImportRun {
  id: string               // Unique ID
  sourceFileName: string
  sourceType: ImportSourceType
  plantKey: PlantKey       // Plant context for this import
  plantKeySource: 'filename' | 'metadata' | 'user_selected' | 'unknown'
  importedAt: string
  fileHash?: string        // SHA-256 of file content for deduplication
  counts: {
    created: number
    updated: number
    deleted: number
    renamed: number
    ambiguous: number
  }
  warnings?: string[]      // e.g., "Plant context unknown; collisions possible"
  userDecisions?: {       // Alias rules created during this import
    ruleIds: string[]
  }
}

// ============================================================================
// DIFF RESULT
// ============================================================================

export interface DiffCreate {
  key: string
  plantKey: PlantKey
  attributes: Record<string, any>
  suggestedName?: string
}

export interface DiffUpdate {
  uid: EntityUid
  key: string
  plantKey: PlantKey
  oldAttributes: Record<string, any>
  newAttributes: Record<string, any>
  changedFields: string[]
}

export interface DiffDelete {
  uid: EntityUid
  key: string
  plantKey: PlantKey
  lastSeen: string       // ISO timestamp
}

export interface DiffRenameOrMove {
  oldKey?: string
  newKey: string
  plantKey: PlantKey
  oldPlantKey?: PlantKey  // If cross-plant carryover
  uid?: EntityUid         // If already resolved
  confidence: number      // 0-100
  matchReasons: string[]  // ["Same tool codes", "Same robot", "Same E-number"]
  requiresUserDecision: boolean
  isCrossPlant?: boolean  // True if suspected carry-over between plants
  candidates?: Array<{    // Possible matches if ambiguous
    uid: EntityUid
    key: string
    plantKey: PlantKey
    matchScore: number
    reasons: string[]
  }>
}

export interface DiffAmbiguous {
  newKey: string
  plantKey: PlantKey
  newAttributes: Record<string, any>
  candidates: Array<{
    uid: EntityUid
    key: string
    plantKey: PlantKey
    matchScore: number
    reasons: string[]
  }>
  action: 'resolve'      // User must choose candidate or create new
}

/**
 * DiffResult: Complete diff from import (plant-aware)
 */
export interface DiffResult {
  importRunId: string
  sourceFile: string
  sourceType: ImportSourceType
  plantKey: PlantKey
  computedAt: string

  creates: DiffCreate[]
  updates: DiffUpdate[]
  deletes: DiffDelete[]
  renamesOrMoves: DiffRenameOrMove[]
  ambiguous: DiffAmbiguous[]

  summary: {
    totalRows: number
    created: number
    updated: number
    deleted: number
    renamed: number
    ambiguous: number
    skipped: number
  }
  warnings?: string[]  // e.g., "Plant context PLANT_UNKNOWN; collisions possible"
}
