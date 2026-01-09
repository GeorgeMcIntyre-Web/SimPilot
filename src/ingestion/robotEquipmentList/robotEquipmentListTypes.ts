/**
 * Robot Equipment List Types
 *
 * Type definitions for Ford V801 Robot Equipment List data.
 * Tracks detailed equipment specifications and delivery status for each robot.
 */

// ============================================================================
// CORE ENTITY
// ============================================================================

export interface RobotEquipmentEntity {
  // Identity
  canonicalKey: string              // "FORD|ROBOT|9B-100-03"
  robotId: string                   // "9B-100-03"
  station: string                   // "9B-100"
  area: string                      // "Dash" or "9B"
  areaFull: string                  // "Dash"

  // Robot Details
  serialNumber: string | null       // "3858" or "Not Delivered"
  robotKey: string                  // "Robot_1"
  robotType: string                 // "BXP210L"
  application: RobotApplicationType // "Spot Welding"
  applicationCode: string           // "SW"

  // Assignment
  personResponsible: string         // "Robyn Holtzhausen"
  bundle: string                    // "Bundle 1"
  order: number | null              // 1

  // Status
  installStatus: string | null      // "Powered on", "Not Delivered", etc.
  robotTypeConfirmed: boolean       // true if robot type confirmed
  robotOrderSubmitted: boolean      // true if order submitted
  isRemoved: boolean                // true if robot is struck through (cancelled/removed)

  // Substitute Robot
  substituteRobot: string | null
  substituteSerialNumber: string | null
  substituteKey: string | null

  // Equipment Details
  bases: RobotBases | null
  track: RobotTrack | null
  weldguns: RobotWeldguns | null
  sealing: RobotSealing | null
  studWelding: boolean
  projectionWelding: RobotProjectionWelding | null

  // Cables
  mainCable: CableSpec | null
  tipdressCable: CableSpec | null
  teachPendantCable: CableSpec | null

  // Dresspack
  dresspackType: string | null      // "Side Mounted LH / Side Mounted RH"
  deliveryChecklistComplete: boolean
  controllerCableCheck: boolean

  // ESOW Compliance
  ftfApprovedDesignList: boolean
  esowRobotType: string | null
  ftfApprovedESOW: boolean
  differsFromESOW: boolean
  esowComment: string | null
  applicationConcern: string | null

  // Metadata
  source: {
    file: string
    sheet: string
    row: number
  }
}

// ============================================================================
// EQUIPMENT COMPONENTS
// ============================================================================

export interface RobotBases {
  height: number | string | null    // Height or "Base Plate"
  baseCode: string | null           // "DESG_BR01_KAW03"
  dateApproved: Date | null
  dateIssuedToManufacture: Date | null
  issuedBy: string | null
}

export interface RobotTrack {
  length: number | null
  riserHeight: number | null
  robotOrientation: string | null
  partNumber: string | null
  catTrackPosition: string | null
  lengthConfirmed: boolean
  trackOrdered: boolean
  rtuSerialNumber: string | null
  note: string | null
  catTrackDressoutCheck: boolean
}

export interface RobotWeldguns {
  numberOfGuns: number | null
  gunType: string | null
  gunSize: string | null
}

export interface RobotSealing {
  robotSealer: boolean
  numberOfPedStands: number | null
  sealer: boolean
  adhesive: boolean
}

export interface RobotProjectionWelding {
  projectionBolt: boolean
  projectionNut: boolean
}

export interface CableSpec {
  controllerToRobot: number | null       // Main measurement
  fenceToController: number | null
  maintLoop: number | null
  additional: number | null
  description: string | null
  reserve: number | null
  total: number | null
  dateMeasured: Date | null
  order: number | null
  ftfConfirmed: number | null
}

// ============================================================================
// APPLICATION TYPES
// ============================================================================

export type RobotApplicationType =
  | 'Spot Welding'
  | 'Material Handling'
  | 'Material Handling/Spot Welding'
  | 'Sealing'
  | 'Stud Welding'
  | 'Vision'
  | 'Other'

// ============================================================================
// RAW ROW FROM EXCEL
// ============================================================================

export interface RobotEquipmentRawRow {
  [key: string]: any
}

export interface NormalizedRobotEquipmentRow {
  // Identity
  area: string
  personResponsible: string
  station: string
  bundle: string
  robotId: string
  serialNumber: string | null
  robotKey: string

  // Substitute
  substituteRobot: string | null
  substituteSerialNumber: string | null
  substituteKey: string | null

  // Order
  order: number | null

  // Robot Type
  robotType: string
  robotTypeConfirmed: boolean
  robotOrderSubmitted: boolean
  cableChangeCutoff: string | null
  comment: string | null

  // Application
  application: string
  applicationCode: string

  // Dresspack
  dresspackType: string | null
  deliveryChecklistComplete: boolean
  controllerCableCheck: boolean

  // Bases
  baseHeight: number | string | null
  baseCode: string | null
  baseDateApproved: Date | null
  baseDateIssuedToManufacture: Date | null
  baseIssuedBy: string | null

  // Track
  trackLength: number | null
  trackRiserHeight: number | null
  trackRobotOrientation: string | null
  trackPartNumber: string | null
  trackCatTrackPosition: string | null
  trackLengthConfirmed: boolean
  trackOrdered: boolean
  trackRTUSerialNumber: string | null
  trackNote: string | null
  trackCatTrackDressoutCheck: boolean

  // Dress pack FTF
  dresspackFTF: string | null

  // Tool Change
  toolChange: string | null

  // Weldguns
  weldgunsNumber: number | null
  weldgunsGunType: string | null
  weldgunsGunSize: string | null

  // Sealing
  sealingRobotSealer: boolean
  sealingNumberOfPedStands: number | null
  sealingSealer: boolean
  sealingAdhesive: boolean

  // Arc Stud Welding
  studWelding: boolean

  // Projection Welding
  projectionBolt: boolean
  projectionNut: boolean

  // Main Cable
  mainCableControllerToRobot: number | null
  mainCableFenceToController: number | null
  mainCableMaintLoop: number | null
  mainCableAdditional: number | null
  mainCableDescription: string | null
  mainCableReserve: number | null
  mainCableTotal: number | null
  mainCableDateMeasured: Date | null
  mainCableOrder: number | null
  mainCableFTFConfirmed: number | null

  // Tipdress Cable
  tipdressCableControllerToTipdresser: number | null
  tipdressCableFenceToController: number | null
  tipdressCableMaintLoop: number | null
  tipdressCableBaseHeight: number | null
  tipdressCableAdditional: number | null
  tipdressCableDescription: string | null
  tipdressCableReserve: number | null
  tipdressCableTotal: number | null
  tipdressCableDateMeasured: Date | null
  tipdressCableOrder: number | null
  tipdressCableFTFConfirmed: number | null

  // Teach Pendant Cable
  teachPendantCableControllerToTeachPoint: number | null
  teachPendantCableAdditional: number | null
  teachPendantCableDescription: string | null
  teachPendantCableReserve: number | null
  teachPendantCableTotal: number | null
  teachPendantCableDateMeasured: Date | null
  teachPendantCableOrder: number | null
  teachPendantCableFTFConfirmed: number | null

  // ESOW
  ftfApprovedDesignList: boolean
  esowRobotType: string | null
  ftfApprovedESOW: boolean
  differsFromESOW: boolean
  esowComment: string | null
  applicationConcern: string | null

  // Install Status
  installStatus: string | null

  // Metadata
  sourceRow: number
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface RobotEquipmentValidationAnomaly {
  type: 'MISSING_ROBOT_ID' | 'MISSING_STATION' | 'DUPLICATE_ROBOT' | 'INVALID_FORMAT' | 'MISSING_DATA'
  row: number
  message: string
  data?: any
}

export interface RobotEquipmentValidationReport {
  totalRowsRead: number
  totalEntitiesProduced: number
  duplicateRobotCount: number
  invalidFormatCount: number
  missingStationCount: number
  missingRobotIdCount: number
  removedRobotCount: number          // Struck-through (removed/cancelled) robots
  anomalies: RobotEquipmentValidationAnomaly[]
}
