/**
 * Simulation Status Types and Interfaces
 *
 * Simulation Status files track robot-by-robot simulation milestone completion.
 * Each row represents one robot at one station with percentage completion for ~28 milestones.
 */

// ============================================================================
// MILESTONE DEFINITIONS
// ============================================================================

/**
 * All simulation milestones with normalized keys
 */
export const SIMULATION_MILESTONES = {
  // Stage 1 - Initial Setup
  ROBOT_POSITION_STAGE_1: 'ROBOT POSITION - STAGE 1',
  CORE_CUBIC_S_CONFIGURED: 'CORE CUBIC S CONFIGURED',
  DRESS_PACK_FRYING_PAN_STAGE_1: 'DRESS PACK & FRYING PAN CONFIGURED - STAGE 1',
  ROBOT_FLANGE_PCD_ADAPTERS_CHECKED: 'ROBOT FLANGE PCD + ADAPTERS CHECKED',
  ALL_EOAT_PAYLOADS_CHECKED: 'ALL EOAT PAYLOADS CHECKED',
  ROBOT_TYPE_CONFIRMED: 'ROBOT TYPE CONFIRMED',
  ROBOT_RISER_CONFIRMED: 'ROBOT RISER CONFIRMED',
  TRACK_LENGTH_CATRAC_CONFIRMED: 'TRACK LENGTH + CATRAC CONFIRMED',
  COLLISIONS_CHECKED_STAGE_1: 'COLLISIONS CHECKED - STAGE 1',
  SPOT_WELDS_DISTRIBUTED_PROJECTED: 'SPOT WELDS DISTRIBUTED + PROJECTED',

  // Weld Gun Equipment
  REFERENCE_WELD_GUN_SELECTED: 'REFERENCE WELD GUN SELECTED',
  REFERENCE_WELD_GUN_COLLISION_CHECK: 'REFERENCE WELD GUN COLLISION CHECK',
  WELD_GUN_FORCE_CHECKED_WIS7: 'WELD GUN FORCE CHECKED IN WIS7',
  WELD_GUN_PROPOSAL_CREATED: 'WELD GUN PROPOSAL CREATED',
  FINAL_WELD_GUN_COLLISION_CHECK: 'FINAL WELD GUN COLLISION CHECK',
  FINAL_WELD_GUN_APPROVED: 'FINAL WELD GUN APPROVED',
  WELD_GUN_EQUIPMENT_PLACED_CONFIRMED: 'WELD GUN EQUIPMENT PLACED AND CONFIRMED',

  // Sealer Equipment
  SEALING_DATA_IMPORTED_CHECKED: 'SEALING DATA IMPORTED AND CHECKED',
  SEALER_PROPOSAL_CREATED_SENT: 'SEALER PROPOSAL CREATED AND SENT',
  SEALER_GUN_APPROVED: 'SEALER GUN APPROVED',
  SEALER_EQUIPMENT_PLACED_CONFIRMED: 'SEALER EQUIPMENT PLACED AND CONFIRMED',

  // Gripper Equipment
  GRIPPER_EQUIPMENT_PROTOTYPE_CREATED: 'GRIPPER EQUIPMENT PROTOTYPE CREATED',
  FINAL_GRIPPER_COLLISION_CHECK: 'FINAL GRIPPER COLLISION CHECK',
  GRIPPER_DESIGN_FINAL_APPROVAL: 'GRIPPER DESIGN FINAL APPROVAL',

  // Tool Change & Fixture
  TOOL_CHANGE_STANDS_PLACED: 'TOOL CHANGE STANDS PLACED',
  FIXTURE_EQUIPMENT_PROTOTYPE_CREATED: 'FIXTURE EQUIPMENT PROTOTYPE CREATED',
  FINAL_FIXTURE_COLLISION_CHECK: 'FINAL FIXTURE COLLISION CHECK',
  FIXTURE_DESIGN_FINAL_APPROVAL: 'FIXTURE DESIGN FINAL APPROVAL',
} as const

export type MilestoneKey = keyof typeof SIMULATION_MILESTONES
export type MilestoneColumnName = typeof SIMULATION_MILESTONES[MilestoneKey]

/**
 * Milestone completion percentage (0-100) or null if not applicable
 */
export type MilestoneValue = number | null

/**
 * All milestones with their completion values
 */
export interface SimulationMilestones {
  robotPositionStage1: MilestoneValue
  coreCubicSConfigured: MilestoneValue
  dressPackFryingPanStage1: MilestoneValue
  robotFlangePcdAdaptersChecked: MilestoneValue
  allEoatPayloadsChecked: MilestoneValue
  robotTypeConfirmed: MilestoneValue
  robotRiserConfirmed: MilestoneValue
  trackLengthCatracConfirmed: MilestoneValue
  collisionsCheckedStage1: MilestoneValue
  spotWeldsDistributedProjected: MilestoneValue
  referenceWeldGunSelected: MilestoneValue
  referenceWeldGunCollisionCheck: MilestoneValue
  weldGunForceCheckedWis7: MilestoneValue
  weldGunProposalCreated: MilestoneValue
  finalWeldGunCollisionCheck: MilestoneValue
  finalWeldGunApproved: MilestoneValue
  weldGunEquipmentPlacedConfirmed: MilestoneValue
  sealingDataImportedChecked: MilestoneValue
  sealerProposalCreatedSent: MilestoneValue
  sealerGunApproved: MilestoneValue
  sealerEquipmentPlacedConfirmed: MilestoneValue
  gripperEquipmentPrototypeCreated: MilestoneValue
  finalGripperCollisionCheck: MilestoneValue
  gripperDesignFinalApproval: MilestoneValue
  toolChangeStandsPlaced: MilestoneValue
  fixtureEquipmentPrototypeCreated: MilestoneValue
  finalFixtureCollisionCheck: MilestoneValue
  fixtureDesignFinalApproval: MilestoneValue
}

// ============================================================================
// APPLICATION TYPES
// ============================================================================

/**
 * Robot application types
 */
export type RobotApplicationType = 'SW' | 'MH/SW' | 'MH+AS' | 'MH+PB' | string

// ============================================================================
// PARSED ROW TYPES
// ============================================================================

/**
 * Raw row from Simulation Status SIMULATION sheet
 */
export interface SimulationStatusRawRow {
  'PERS. RESPONSIBLE'?: unknown
  'STATION'?: unknown
  'ROBOT'?: unknown
  'APPLICATION'?: unknown
  [key: string]: unknown  // Milestone columns
}

/**
 * Normalized simulation status row
 */
export interface NormalizedSimulationRow {
  // Source tracking
  sourceFile: string
  rawRowIndex: number

  // Identity fields
  responsiblePerson: string
  stationFull: string        // "9B-100"
  robotFullId: string        // "9B-100-03"
  application: string        // "SW", "MH/SW", etc.

  // Parsed identifiers
  area: string               // "9B"
  station: string            // "100"
  robot: string              // "03"

  // Milestones
  milestones: SimulationMilestones

  // Raw data
  raw: any
}

// ============================================================================
// ENTITY TYPES
// ============================================================================

/**
 * Simulation Status Entity - represents one robot at one station with milestone status
 */
export interface SimulationStatusEntity {
  // Identity
  canonicalKey: string       // "FORD|SIM|9B-100|R03"
  entityType: 'SIMULATION_STATUS'

  // Identifiers
  area: string               // "9B"
  station: string            // "100"
  stationFull: string        // "9B-100"
  robot: string              // "03"
  robotFullId: string        // "9B-100-03"

  // Metadata
  application: RobotApplicationType
  responsiblePerson: string

  // Milestones
  milestones: SimulationMilestones

  // Computed metrics
  overallCompletion: number  // Average completion percentage across all milestones

  // Cross-references (populated after linking)
  linkedToolingEntityKeys: string[]

  // Source tracking
  source: {
    file: string
    sheet: string
    row: number
  }

  // Raw data
  raw: any
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface SimulationStatusValidationAnomaly {
  type: 'MISSING_STATION' | 'MISSING_ROBOT' | 'INVALID_STATION_FORMAT' | 'INVALID_ROBOT_FORMAT' | 'DUPLICATE_ROBOT' | 'MISSING_MILESTONES'
  row: number
  message: string
  data?: any
}

export interface SimulationStatusValidationReport {
  totalRowsRead: number
  totalEntitiesProduced: number
  missingStationCount: number
  missingRobotCount: number
  invalidFormatCount: number
  duplicateRobotCount: number
  anomalies: SimulationStatusValidationAnomaly[]
}
