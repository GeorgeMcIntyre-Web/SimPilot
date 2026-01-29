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
  DCS_CONFIGURED: 'DCS CONFIGURED',
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
  dcsConfigured: MilestoneValue
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

/**
 * Panels that are always applicable regardless of application type.
 * These cover generic simulation aspects common to all robots.
 */
const UNIVERSAL_PANELS: PanelType[] = [
  'robotSimulation',
  'mrs',
  'olp',
  'documentation',
  'layout',
  'safety',
]

/**
 * Maps application codes to their applicable specialist panels.
 * Universal panels are always included in addition to these.
 *
 * Application codes from the SIMULATION sheet APPLICATION column:
 * - SW   = Spot Welding
 * - SPR  = Self-Piercing Rivet (alternative joining)
 * - MH   = Material Handling (gripper + fixture)
 * - MH/SW, MH+SW = Material Handling + Spot Welding
 * - MH+AS = Material Handling + Adhesive/Sealing
 * - MH+PB = Material Handling + Process/Paint Booth
 * - SEAL, SL = Sealer
 */
const APPLICATION_SPECIALIST_PANELS: Record<string, PanelType[]> = {
  'SW':    ['spotWelding'],
  'SPR':   ['alternativeJoining'],
  'MH':    ['gripper', 'fixture'],
  'MH/SW': ['spotWelding', 'gripper', 'fixture'],
  'MH+SW': ['spotWelding', 'gripper', 'fixture'],
  'MH+AS': ['sealer', 'gripper', 'fixture'],
  'MH+PB': ['gripper', 'fixture'],
  'SEAL':  ['sealer'],
  'SL':    ['sealer'],
}

/**
 * Returns the set of panel types applicable to a given robot application code.
 * Falls back to all panels if the application code is unknown.
 */
export function getApplicablePanels(application: string): Set<PanelType> {
  const code = application.trim().toUpperCase()
  const specialistPanels = APPLICATION_SPECIALIST_PANELS[code]

  if (!specialistPanels) {
    // Unknown application — show all panels to avoid hiding data
    return new Set<PanelType>([
      'robotSimulation', 'spotWelding', 'sealer', 'alternativeJoining',
      'gripper', 'fixture', 'mrs', 'olp', 'documentation', 'layout', 'safety',
    ])
  }

  return new Set<PanelType>([...UNIVERSAL_PANELS, ...specialistPanels])
}

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

  // Milestones (legacy flat structure for backward compatibility)
  milestones: SimulationMilestones

  // Panel-grouped milestones (new structure with all 11 panels)
  panelMilestones?: PanelMilestones

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

// ============================================================================
// PANEL-GROUPED MILESTONE TYPES
// ============================================================================

/**
 * Panel type identifiers for the 11 simulation panels
 */
export type PanelType =
  | 'robotSimulation'
  | 'spotWelding'
  | 'sealer'
  | 'alternativeJoining'
  | 'gripper'
  | 'fixture'
  | 'mrs'
  | 'olp'
  | 'documentation'
  | 'layout'
  | 'safety'

/**
 * A group of related milestones for a single panel
 */
export interface MilestoneGroup {
  /** Individual milestone values keyed by milestone label */
  milestones: Record<string, MilestoneValue>
  /** Calculated completion percentage for this panel (0-100) */
  completion: number
}

/**
 * All panel milestones grouped by panel type
 */
export interface PanelMilestones {
  robotSimulation: MilestoneGroup
  spotWelding: MilestoneGroup
  sealer: MilestoneGroup
  alternativeJoining: MilestoneGroup
  gripper: MilestoneGroup
  fixture: MilestoneGroup
  mrs: MilestoneGroup
  olp: MilestoneGroup
  documentation: MilestoneGroup
  layout: MilestoneGroup
  safety: MilestoneGroup
}

// ============================================================================
// PANEL MILESTONE COLUMN DEFINITIONS
// ============================================================================

/**
 * Robot Simulation panel milestones (SIMULATION sheet, columns 4-12)
 */
export const ROBOT_SIMULATION_MILESTONES = {
  ROBOT_POSITION_STAGE_1: 'ROBOT POSITION - STAGE 1',
  DCS_CONFIGURED: 'DCS CONFIGURED',
  DRESS_PACK_FRYING_PAN_STAGE_1: 'DRESS PACK & FRYING PAN CONFIGURED - STAGE 1',
  ROBOT_FLANGE_PCD_ADAPTERS_CHECKED: 'ROBOT FLANGE PCD + ADAPTERS CHECKED',
  ALL_EOAT_PAYLOADS_CHECKED: 'ALL EOAT PAYLOADS CHECKED',
  ROBOT_TYPE_CONFIRMED: 'ROBOT TYPE CONFIRMED',
  ROBOT_RISER_CONFIRMED: 'ROBOT RISER CONFIRMED',
  TRACK_LENGTH_CATRAC_CONFIRMED: 'TRACK LENGTH + CATRAC CONFIRMED',
  COLLISIONS_CHECKED_STAGE_1: 'COLLISIONS CHECKED - STAGE 1',
} as const

/**
 * Spot Welding panel milestones (SIMULATION sheet, columns 13-20)
 */
export const SPOT_WELDING_MILESTONES = {
  SPOT_WELDS_DISTRIBUTED_PROJECTED: 'SPOT WELDS DISTRIBUTED + PROJECTED',
  REFERENCE_WELD_GUN_SELECTED: 'REFERENCE WELD GUN SELECTED',
  REFERENCE_WELD_GUN_COLLISION_CHECK: 'REFERENCE WELD GUN COLLISION CHECK',
  WELD_GUN_FORCE_CHECKED_WIS7: 'WELD GUN FORCE CHECKED IN WIS7',
  WELD_GUN_PROPOSAL_CREATED: 'WELD GUN PROPOSAL CREATED',
  FINAL_WELD_GUN_COLLISION_CHECK: 'FINAL WELD GUN COLLISION CHECK',
  FINAL_WELD_GUN_APPROVED: 'FINAL WELD GUN APPROVED',
  WELD_GUN_EQUIPMENT_PLACED_CONFIRMED: 'WELD GUN EQUIPMENT PLACED AND CONFIRMED',
} as const

/**
 * Sealer panel milestones (SIMULATION sheet, columns 21-24)
 */
export const SEALER_MILESTONES = {
  SEALING_DATA_IMPORTED_CHECKED: 'SEALING DATA IMPORTED AND CHECKED',
  SEALER_PROPOSAL_CREATED_SENT: 'SEALER PROPOSAL CREATED AND SENT',
  SEALER_GUN_APPROVED: 'SEALER GUN APPROVED',
  SEALER_EQUIPMENT_PLACED_CONFIRMED: 'SEALER EQUIPMENT PLACED AND CONFIRMED',
} as const

/**
 * Alternative Joining Applications panel milestones (SIMULATION sheet, columns 25-29)
 */
export const ALTERNATIVE_JOINING_MILESTONES = {
  JOINING_DATA_DISTRIBUTED: 'JOINING DATA DISTRIBUTED',
  REFERENCE_EQUIPMENT_SELECTED: 'REFERENCE EQUIPMENT SELECTED',
  EQUIPMENT_COLLISION_CHECK: 'EQUIPMENT COLLISION CHECK',
  EQUIPMENT_PEDESTAL_ADAPTOR_APPROVED: 'EQUIPMENT PEDESTAL / ROBOT MOUNT ADAPTOR APPROVED',
  EQUIPMENT_PLACED_CONFIRMED: 'EQUIPMENT PLACED AND CONFIRMED',
} as const

/**
 * Gripper panel milestones (SIMULATION sheet, columns 30-33)
 */
export const GRIPPER_MILESTONES = {
  GRIPPER_EQUIPMENT_PROTOTYPE_CREATED: 'GRIPPER EQUIPMENT PROTOTYPE CREATED',
  FINAL_GRIPPER_COLLISION_CHECK: 'FINAL GRIPPER COLLISION CHECK',
  GRIPPER_DESIGN_FINAL_APPROVAL: 'GRIPPER DESIGN FINAL APPROVAL',
  TOOL_CHANGE_STANDS_PLACED: 'TOOL CHANGE STANDS PLACED',
} as const

/**
 * Fixture panel milestones (SIMULATION sheet, columns 34-36)
 */
export const FIXTURE_MILESTONES = {
  FIXTURE_EQUIPMENT_PROTOTYPE_CREATED: 'FIXTURE EQUIPMENT PROTOTYPE CREATED',
  FINAL_FIXTURE_COLLISION_CHECK: 'FINAL FIXTURE COLLISION CHECK',
  FIXTURE_DESIGN_FINAL_APPROVAL: 'FIXTURE DESIGN FINAL APPROVAL',
} as const

/**
 * MRS panel milestones (MRS_OLP sheet)
 */
export const MRS_MILESTONES = {
  FULL_ROBOT_PATHS_CREATED: 'FULL ROBOT PATHS CREATED WITH AUX DATA SET',
  FINAL_ROBOT_POSITION: 'FINAL ROBOT POSITION',
  COLLISION_CHECKS_RCS: 'COLLISION CHECKS DONE WITH RCS MODULE',
  MACHINE_OPERATION_CHECKED: 'MACHINE OPERATION CHECKED AND MATCHES SIM',
  CYCLETIME_CHART_UPDATED: 'CYCLETIME CHART SEQUECNE AND COUNTS UPDATED',
  RCS_MULTI_RESOURCE_RUNNING: 'RCS MULTI RESOURCE SIMULATION RUNNING IN CYCLETIME',
  RCS_MULTI_RESOURCE_VIDEO: 'RCS MULTI  RESOURCE VIDEO RECORDED',
} as const

/**
 * OLP panel milestones (MRS_OLP sheet)
 */
export const OLP_MILESTONES = {
  UTILITIES_PATHS_CREATED: 'UTILITIES PATHS CRTEATED',
  OLP_DONE_TO_GUIDELINE: 'OLP DONE TO PROGRAMMING GUIDELINE',
} as const

/**
 * Documentation panel milestones (DOCUMENTATION sheet)
 */
export const DOCUMENTATION_MILESTONES = {
  INTERLOCK_ZONING_CREATED: 'INTERLOCK ZONING DOCUMENTATION CREATED',
  WIS7_SPOT_LIST_UPDATED: 'WIS7 SPOT LIST UPDATED',
  DCS_DOCUMENTATION_CREATED: 'DCS DOCUMENTATION CREATED',
  ROBOT_INSTALLATION_DOCS: 'ROBOT INSTALLATION DOCUMENTATION CREATED',
  ONE_A4_SHEET_COMPLETED: '1A4 SHEET CREATED + COMPLETED',
} as const

/**
 * Layout panel milestones (SAFETY_LAYOUT sheet)
 */
export const LAYOUT_MILESTONES = {
  LATEST_LAYOUT_IN_SIM: 'LATEST LAYOUT IN SIMULATION',
  CABLE_TRAYS_CHECKED: '3D CABLE TRAYS CHECKED AND MATCH LAYOUT',
  FENCING_CHECKED: '3D FENCING CHECKED AND MATCH LAYOUT',
  DUNNAGES_CHECKED: '3D DUNNAGES CHECKED AND MATCH LAYOUT',
  CABINETS_CHECKED: '3D CABINETS CHECKED AND MATCH LAYOUT',
  FINAL_LAYOUT_INCLUDED: 'FINAL LAYOUT INCLUDED MATCHING LAYOUT + SIM',
  FOUNDATION_PLATES_INCLUDED: 'ALL EQUIPMENT FOUNDATION PLATES INCLUDED IN SIM ',
} as const

/**
 * Safety panel milestones (SAFETY_LAYOUT sheet)
 */
export const SAFETY_MILESTONES = {
  DCS_CONFIGURED: 'DCS CONFIGURED',
  LIGHT_CURTAIN_VERIFIED: 'LIGHT CURTAIN CALCULATIONS VERIFIED ',
  ROBOT_MAIN_CABLE_VERIFIED: 'ROBOT MAIN CABLE LENGTH VERIFIED',
  TIPDRESSER_CABLE_VERIFIED: 'TIPDRESSER SERVO CABLE VERIFIED ',
  RTU_CABLE_VERIFIED: 'RTU CABLE LENGTH VERIFIED',
  PEDESTAL_SPOT_WELD_CABLE: 'PEDESTAL SPOT WELD CABLE VERIFIED ',
} as const

/**
 * Mapping of panel types to their milestone constants
 */
export const PANEL_MILESTONE_DEFINITIONS: Record<PanelType, Record<string, string>> = {
  robotSimulation: ROBOT_SIMULATION_MILESTONES,
  spotWelding: SPOT_WELDING_MILESTONES,
  sealer: SEALER_MILESTONES,
  alternativeJoining: ALTERNATIVE_JOINING_MILESTONES,
  gripper: GRIPPER_MILESTONES,
  fixture: FIXTURE_MILESTONES,
  mrs: MRS_MILESTONES,
  olp: OLP_MILESTONES,
  documentation: DOCUMENTATION_MILESTONES,
  layout: LAYOUT_MILESTONES,
  safety: SAFETY_MILESTONES,
}

/**
 * Maps panel slug (URL-friendly) to panel type
 */
export const PANEL_SLUG_TO_TYPE: Record<string, PanelType> = {
  'robot-simulation': 'robotSimulation',
  'spot-welding': 'spotWelding',
  'sealer': 'sealer',
  'alternative-joining-applications': 'alternativeJoining',
  'gripper': 'gripper',
  'fixture': 'fixture',
  'mrs': 'mrs',
  'olp': 'olp',
  'documentation': 'documentation',
  'layout': 'layout',
  'safety': 'safety',
}

/**
 * Maps panel type to display name
 */
export const PANEL_TYPE_TO_DISPLAY: Record<PanelType, string> = {
  robotSimulation: 'Robot Simulation',
  spotWelding: 'Spot Welding',
  sealer: 'Sealer',
  alternativeJoining: 'Alternative Joining Applications',
  gripper: 'Gripper',
  fixture: 'Fixture',
  mrs: 'Multi Resource Simulation',
  olp: 'OLP',
  documentation: 'Documentation',
  layout: 'Layout',
  safety: 'Safety',
}

/**
 * Maps sheet names to the panels they contain
 */
export const SHEET_TO_PANELS: Record<string, PanelType[]> = {
  'SIMULATION': ['robotSimulation', 'spotWelding', 'sealer', 'alternativeJoining', 'gripper', 'fixture'],
  'MRS_OLP': ['mrs', 'olp'],
  'DOCUMENTATION': ['documentation'],
  'SAFETY_LAYOUT': ['safety', 'layout'],
}

/**
 * Creates an empty PanelMilestones structure
 */
export function createEmptyPanelMilestones(): PanelMilestones {
  const createEmptyGroup = (): MilestoneGroup => ({
    milestones: {},
    completion: 0,
  })

  return {
    robotSimulation: createEmptyGroup(),
    spotWelding: createEmptyGroup(),
    sealer: createEmptyGroup(),
    alternativeJoining: createEmptyGroup(),
    gripper: createEmptyGroup(),
    fixture: createEmptyGroup(),
    mrs: createEmptyGroup(),
    olp: createEmptyGroup(),
    documentation: createEmptyGroup(),
    layout: createEmptyGroup(),
    safety: createEmptyGroup(),
  }
}

/**
 * Calculates completion percentage for a milestone group
 * Counts milestones with value === 100 as complete
 */
export function calculateGroupCompletion(milestones: Record<string, MilestoneValue>): number {
  const values = Object.values(milestones).filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return 0

  const completedCount = values.filter(v => v === 100).length
  return Math.round((completedCount / values.length) * 100)
}
