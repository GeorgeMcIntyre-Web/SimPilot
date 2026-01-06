// UID-Backed Linking Domain Types
// Supports Excel-first, UID-backed linking with rename/move detection

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
 * StationRecord with stable UID
 * Tracks a real-world manufacturing station
 */
export interface StationRecord {
  uid: StationUid
  key: string                      // Current canonical key
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
 * ToolRecord with stable UID
 * Tracks a real-world tool/gun/gripper
 */
export interface ToolRecord {
  uid: ToolUid
  key: string                      // Current canonical key
  stationUid?: StationUid | null   // Foreign key to station
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
 * RobotRecord with stable UID
 * Tracks a real-world robot
 */
export interface RobotRecord {
  uid: RobotUid
  key: string                      // Current canonical key
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
 * AliasRule: User-confirmed mapping from old key to UID
 * Created when user resolves ambiguous rename/move
 */
export interface AliasRule {
  id: string               // Unique ID for the rule
  fromKey: string          // Old canonical key
  toUid: EntityUid         // Target entity UID
  entityType: EntityType
  reason: string           // "User confirmed station renumber"
  createdAt: string
  createdBy?: string       // User ID if available
}

// ============================================================================
// IMPORT RUN
// ============================================================================

export type ImportSourceType = 'toolList' | 'robotList' | 'simulationStatus'

/**
 * ImportRun: Record of each ingestion operation
 */
export interface ImportRun {
  id: string               // Unique ID
  sourceFileName: string
  sourceType: ImportSourceType
  importedAt: string
  fileHash?: string        // SHA-256 of file content for deduplication
  counts: {
    created: number
    updated: number
    deleted: number
    renamed: number
    ambiguous: number
  }
  userDecisions?: {       // Alias rules created during this import
    ruleIds: string[]
  }
}

// ============================================================================
// DIFF RESULT
// ============================================================================

export interface DiffCreate {
  key: string
  attributes: Record<string, any>
  suggestedName?: string
}

export interface DiffUpdate {
  uid: EntityUid
  key: string
  oldAttributes: Record<string, any>
  newAttributes: Record<string, any>
  changedFields: string[]
}

export interface DiffDelete {
  uid: EntityUid
  key: string
  lastSeen: string       // ISO timestamp
}

export interface DiffRenameOrMove {
  oldKey?: string
  newKey: string
  uid?: EntityUid        // If already resolved
  confidence: number     // 0-100
  matchReasons: string[] // ["Same tool codes", "Same robot", "Same area"]
  requiresUserDecision: boolean
  candidates?: Array<{   // Possible matches if ambiguous
    uid: EntityUid
    key: string
    matchScore: number
    reasons: string[]
  }>
}

export interface DiffAmbiguous {
  newKey: string
  newAttributes: Record<string, any>
  candidates: Array<{
    uid: EntityUid
    key: string
    matchScore: number
    reasons: string[]
  }>
  action: 'resolve'      // User must choose candidate or create new
}

/**
 * DiffResult: Complete diff from import
 */
export interface DiffResult {
  importRunId: string
  sourceFile: string
  sourceType: ImportSourceType
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
}
