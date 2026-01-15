/**
 * Robot Equipment List Parser
 *
 * Parses Ford V801 Robot Equipment List Excel files into structured entities.
 */

import {
  RobotEquipmentEntity,
  RobotEquipmentRawRow,
  NormalizedRobotEquipmentRow,
  RobotEquipmentValidationAnomaly,
  RobotEquipmentValidationReport,
  RobotApplicationType,
  RobotBases,
  RobotTrack,
  RobotWeldguns,
  RobotSealing,
  RobotProjectionWelding,
  CableSpec
} from './robotEquipmentListTypes'

// ============================================================================
// COLUMN MAPPING
// ============================================================================

// Column indices for fields that use Row 2 sub-headers (not accessible via Row 1 header keys)
// The Excel file has a multi-row header structure where Row 1 has main headers and Row 2 has sub-headers
const COLUMN_INDEX = {
  AREA_GROUP: 0,              // Area group name (e.g., "DASH", "FRONT STRUCTURE") - forward-fill needed
  ROBOT_TYPE_CONFIRMED: 17,   // Row 2: "Robot Type Confirmed"
  ROBOT_ORDER_SUBMITTED: 18,  // Row 2: "Robot Order Submitted"
  CABLE_CHANGE_CUTOFF: 19,    // Row 2: "Cable Change Cutoff"
  COMMENT: 20,                // Row 2: "Comment"
  FUNCTION: 21,               // Row 2: "Function" (Row 1 is "Robot Application")
  CODE: 22,                   // Row 2: "Code"
  DRESSPACK_TYPE: 23,         // Row 2: "Side Mounted LH / Side Mounted RH"
  DELIVERY_CHECKLIST: 24,     // Row 2: "Robot Unit Dress Pack Check"
  CONTROLLER_CABLE_CHECK: 25, // Row 2: "Controller Cable Check"
  BASE_HEIGHT: 26,            // Row 2: "Height "
  BASE_CODE: 27,              // Row 2: "Base Code"
  BASE_DATE_APPROVED: 28,     // Row 2: "Date Approved"
  BASE_DATE_ISSUED: 29,       // Row 2: "Date Issued to Manafacture"
  BASE_ISSUED_BY: 30,         // Row 2: " Issued By"
  TRACK_LENGTH: 31,           // Row 2: "Length"
  TRACK_RISER_HEIGHT: 32,     // Row 2: "Riser Height"
  TRACK_ROBOT_ORIENTATION: 33,// Row 2: "Robot Orientation"
  TRACK_PART_NUMBER: 34,      // Row 2: "Part Number"
  TRACK_CAT_TRACK_POS: 35,    // Row 2: "Cat track position"
  TRACK_LENGTH_CONFIRMED: 36, // Row 2: "Length Confirmed"
  TRACK_ORDERED: 37,          // Row 2: "Track Ordered"
  TRACK_RTU_SERIAL: 38,       // Row 2: "RTU Serial #"
  TRACK_NOTE: 39,             // Row 2: "Note"
  TRACK_CAT_DRESSOUT: 40,     // Row 2: "Cat track Dressout Check"
  DRESSPACK_FTF: 41,          // Row 2: "FTF/FTS"
  TOOL_CHANGE: 42,            // Row 1: "Tool Change "
  WELDGUNS_NUMBER: 44,        // Row 2: "No.  Of Weld Guns"
  WELDGUNS_GUN_TYPE: 45,      // Row 2: "Gun Type"
  WELDGUNS_GUN_SIZE: 46,      // Row 2: "Gun Size"
  SEALING_ROBOT_SEALER: 47,   // Row 2: "Robot Sealer"
  SEALING_PED_STANDS: 48,     // Row 2: "No. Of Ped Stands"
  SEALING_SEALER: 49,         // Row 2: "Sealer"
  SEALING_ADHESIVE: 50,       // Row 2: "Adhesive"
  STUD_WELD: 51,              // Row 2: "Stud Weld"
  PROJECTION_BOLT: 52,        // Row 2: "Projection Bolt"
  PROJECTION_NUT: 53,         // Row 2: "Projection Nut"
  // Main Cable (columns 54-63)
  MAIN_CABLE_CONTROLLER: 54,
  MAIN_CABLE_FENCE: 55,
  MAIN_CABLE_MAINT: 56,
  MAIN_CABLE_ADDITIONAL: 57,
  MAIN_CABLE_DESC: 58,
  MAIN_CABLE_RESERVE: 59,
  MAIN_CABLE_TOTAL: 60,
  MAIN_CABLE_DATE: 61,
  MAIN_CABLE_ORDER: 62,
  MAIN_CABLE_FTF: 63,
  // Tipdress Cable (columns 64-74)
  TIPDRESS_CONTROLLER: 64,
  TIPDRESS_FENCE: 65,
  TIPDRESS_MAINT: 66,
  TIPDRESS_BASE_HEIGHT: 67,
  TIPDRESS_ADDITIONAL: 68,
  TIPDRESS_DESC: 69,
  TIPDRESS_RESERVE: 70,
  TIPDRESS_TOTAL: 71,
  TIPDRESS_DATE: 72,
  TIPDRESS_ORDER: 73,
  TIPDRESS_FTF: 74,
  // Teach Pendant Cable (columns 75-82)
  TEACH_CONTROLLER: 75,
  TEACH_ADDITIONAL: 76,
  TEACH_DESC: 77,
  TEACH_RESERVE: 78,
  TEACH_TOTAL: 79,
  TEACH_DATE: 80,
  TEACH_ORDER: 81,
  TEACH_FTF: 82,
  // ESOW (columns 83-88)
  FTF_APPROVED_DES_LIST: 83,
  ESOW_ROBOT_TYPE: 84,
  FTF_APPROVED_ESOW: 85,
  DIFFERS_FROM_ESOW: 86,
  ESOW_COMMENT: 87,
  APPLICATION_CONCERN: 88,
  // Install Status
  INSTALL_STATUS: 89,
}

// Header-based column access (for columns with valid Row 1 headers)
const COLUMN_MAP = {
  // Identity columns (from header row 1)
  // Note: Row 1 header "Area" actually contains "Person Responsible" data
  PERSON_RESPONSIBLE: 'Area',  // This column header is "Area" but contains Person Responsible data
  STATION: 'Station No.',
  BUNDLE: 'Bundle',
  ROBOT_ID: 'Robo No. New',
  SERIAL_NUMBER: 'Serial #',
  ROBOT_KEY: 'Robot Key',

  // Substitute Robot
  SUBSTITUTE_ROBOT: 'Substitute Robot',
  SUBSTITUTE_SERIAL: 'Substitute Serial Number',
  SUBSTITUTE_KEY: 'Substitute Key',

  // Order
  ORDER: 'order',

  // Robot Type (Row 1 header exists)
  ROBOT_TYPE: 'Robot Type',
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Parse Excel serial date to JavaScript Date
 */
function parseExcelDate(excelDate: any): Date | null {
  if (!excelDate || typeof excelDate !== 'number') return null

  // Excel dates are days since 1900-01-01 (with 1900 leap year bug)
  const excelEpoch = new Date(1899, 11, 30)
  const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000)
  return date
}

/**
 * Normalize boolean value from various formats
 */
function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'y' || lower === 'yes' || lower === 'true' || lower === '1'
  }
  if (typeof value === 'number') return value > 0
  return false
}

/**
 * Normalize number value
 */
function normalizeNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return isNaN(num) ? null : num
}

/**
 * Normalize string value
 */
function normalizeString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value).trim()
}

/**
 * Normalize raw Excel rows to structured data
 * @param rows - Object-based rows using header names as keys
 * @param rawRows - Array-based rows for accessing columns by index (for Column 0 area group)
 * @param _sourceFile - Source file path
 * @param headerRowIndex - Row index where headers are located
 */
export function normalizeRobotEquipmentRows(
  rows: RobotEquipmentRawRow[],
  rawRows: any[][],
  _sourceFile: string,
  headerRowIndex: number
): NormalizedRobotEquipmentRow[] {
  const normalized: NormalizedRobotEquipmentRow[] = []

  // Track the current area group for forward-fill
  // Column 0 contains area group name but only for the first row of each group
  let currentAreaGroup = ''

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rawRow = rawRows[i] || []
    const sourceRow = headerRowIndex + i + 1

    // Skip rows without robot ID
    const robotId = normalizeString(row[COLUMN_MAP.ROBOT_ID])
    if (!robotId) continue

    // Forward-fill area group from Column 0
    // This column only has a value for the first row of each area group
    const areaGroupValue = normalizeString(rawRow[COLUMN_INDEX.AREA_GROUP])
    if (areaGroupValue) {
      currentAreaGroup = areaGroupValue
    }

    // Parse identity
    // Note: The "Area" header column actually contains Person Responsible data
    const personResponsible = normalizeString(row[COLUMN_MAP.PERSON_RESPONSIBLE]) || ''
    const station = normalizeString(row[COLUMN_MAP.STATION]) || ''

    // Parse serial number (can be "Not Delivered")
    const serialNumber = normalizeString(row[COLUMN_MAP.SERIAL_NUMBER])

    normalized.push({
      // Identity
      area: currentAreaGroup,  // Use forward-filled area group from Column 0
      personResponsible,       // Person responsible from "Area" column
      station,
      bundle: normalizeString(row[COLUMN_MAP.BUNDLE]) || '',
      robotId,
      serialNumber,
      robotKey: normalizeString(row[COLUMN_MAP.ROBOT_KEY]) || '',

      // Substitute
      substituteRobot: normalizeString(row[COLUMN_MAP.SUBSTITUTE_ROBOT]),
      substituteSerialNumber: normalizeString(row[COLUMN_MAP.SUBSTITUTE_SERIAL]),
      substituteKey: normalizeString(row[COLUMN_MAP.SUBSTITUTE_KEY]),

      // Order
      order: normalizeNumber(row[COLUMN_MAP.ORDER]),

      // Robot Type - use column indices for fields without Row 1 headers
      robotType: normalizeString(row[COLUMN_MAP.ROBOT_TYPE]) || '',
      robotTypeConfirmed: normalizeBoolean(rawRow[COLUMN_INDEX.ROBOT_TYPE_CONFIRMED]),
      robotOrderSubmitted: normalizeBoolean(rawRow[COLUMN_INDEX.ROBOT_ORDER_SUBMITTED]),
      cableChangeCutoff: normalizeString(rawRow[COLUMN_INDEX.CABLE_CHANGE_CUTOFF]),
      comment: normalizeString(rawRow[COLUMN_INDEX.COMMENT]),

      // Application - use column indices
      application: normalizeString(rawRow[COLUMN_INDEX.FUNCTION]) || '',
      applicationCode: normalizeString(rawRow[COLUMN_INDEX.CODE]) || '',

      // Dresspack - use column indices
      dresspackType: normalizeString(rawRow[COLUMN_INDEX.DRESSPACK_TYPE]),
      deliveryChecklistComplete: normalizeBoolean(rawRow[COLUMN_INDEX.DELIVERY_CHECKLIST]),
      controllerCableCheck: normalizeBoolean(rawRow[COLUMN_INDEX.CONTROLLER_CABLE_CHECK]),

      // Bases - use column indices
      baseHeight: rawRow[COLUMN_INDEX.BASE_HEIGHT] || null,
      baseCode: normalizeString(rawRow[COLUMN_INDEX.BASE_CODE]),
      baseDateApproved: parseExcelDate(rawRow[COLUMN_INDEX.BASE_DATE_APPROVED]),
      baseDateIssuedToManufacture: parseExcelDate(rawRow[COLUMN_INDEX.BASE_DATE_ISSUED]),
      baseIssuedBy: normalizeString(rawRow[COLUMN_INDEX.BASE_ISSUED_BY]),

      // Track - use column indices
      trackLength: normalizeNumber(rawRow[COLUMN_INDEX.TRACK_LENGTH]),
      trackRiserHeight: normalizeNumber(rawRow[COLUMN_INDEX.TRACK_RISER_HEIGHT]),
      trackRobotOrientation: normalizeString(rawRow[COLUMN_INDEX.TRACK_ROBOT_ORIENTATION]),
      trackPartNumber: normalizeString(rawRow[COLUMN_INDEX.TRACK_PART_NUMBER]),
      trackCatTrackPosition: normalizeString(rawRow[COLUMN_INDEX.TRACK_CAT_TRACK_POS]),
      trackLengthConfirmed: normalizeBoolean(rawRow[COLUMN_INDEX.TRACK_LENGTH_CONFIRMED]),
      trackOrdered: normalizeBoolean(rawRow[COLUMN_INDEX.TRACK_ORDERED]),
      trackRTUSerialNumber: normalizeString(rawRow[COLUMN_INDEX.TRACK_RTU_SERIAL]),
      trackNote: normalizeString(rawRow[COLUMN_INDEX.TRACK_NOTE]),
      trackCatTrackDressoutCheck: normalizeBoolean(rawRow[COLUMN_INDEX.TRACK_CAT_DRESSOUT]),

      // Dress pack FTF - use column index
      dresspackFTF: normalizeString(rawRow[COLUMN_INDEX.DRESSPACK_FTF]),

      // Tool Change - use column index
      toolChange: normalizeString(rawRow[COLUMN_INDEX.TOOL_CHANGE]),

      // Weldguns - use column indices
      weldgunsNumber: normalizeNumber(rawRow[COLUMN_INDEX.WELDGUNS_NUMBER]),
      weldgunsGunType: normalizeString(rawRow[COLUMN_INDEX.WELDGUNS_GUN_TYPE]),
      weldgunsGunSize: normalizeString(rawRow[COLUMN_INDEX.WELDGUNS_GUN_SIZE]),

      // Sealing - use column indices
      sealingRobotSealer: normalizeBoolean(rawRow[COLUMN_INDEX.SEALING_ROBOT_SEALER]),
      sealingNumberOfPedStands: normalizeNumber(rawRow[COLUMN_INDEX.SEALING_PED_STANDS]),
      sealingSealer: normalizeBoolean(rawRow[COLUMN_INDEX.SEALING_SEALER]),
      sealingAdhesive: normalizeBoolean(rawRow[COLUMN_INDEX.SEALING_ADHESIVE]),

      // Arc Stud Welding - use column index
      studWelding: normalizeBoolean(rawRow[COLUMN_INDEX.STUD_WELD]),

      // Projection Welding - use column indices
      projectionBolt: normalizeBoolean(rawRow[COLUMN_INDEX.PROJECTION_BOLT]),
      projectionNut: normalizeBoolean(rawRow[COLUMN_INDEX.PROJECTION_NUT]),

      // Main Cable - use column indices
      mainCableControllerToRobot: normalizeNumber(rawRow[COLUMN_INDEX.MAIN_CABLE_CONTROLLER]),
      mainCableFenceToController: normalizeNumber(rawRow[COLUMN_INDEX.MAIN_CABLE_FENCE]),
      mainCableMaintLoop: normalizeNumber(rawRow[COLUMN_INDEX.MAIN_CABLE_MAINT]),
      mainCableAdditional: normalizeNumber(rawRow[COLUMN_INDEX.MAIN_CABLE_ADDITIONAL]),
      mainCableDescription: normalizeString(rawRow[COLUMN_INDEX.MAIN_CABLE_DESC]),
      mainCableReserve: normalizeNumber(rawRow[COLUMN_INDEX.MAIN_CABLE_RESERVE]),
      mainCableTotal: normalizeNumber(rawRow[COLUMN_INDEX.MAIN_CABLE_TOTAL]),
      mainCableDateMeasured: parseExcelDate(rawRow[COLUMN_INDEX.MAIN_CABLE_DATE]),
      mainCableOrder: normalizeNumber(rawRow[COLUMN_INDEX.MAIN_CABLE_ORDER]),
      mainCableFTFConfirmed: normalizeNumber(rawRow[COLUMN_INDEX.MAIN_CABLE_FTF]),

      // Tipdress Cable - use column indices
      tipdressCableControllerToTipdresser: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_CONTROLLER]),
      tipdressCableFenceToController: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_FENCE]),
      tipdressCableMaintLoop: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_MAINT]),
      tipdressCableBaseHeight: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_BASE_HEIGHT]),
      tipdressCableAdditional: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_ADDITIONAL]),
      tipdressCableDescription: normalizeString(rawRow[COLUMN_INDEX.TIPDRESS_DESC]),
      tipdressCableReserve: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_RESERVE]),
      tipdressCableTotal: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_TOTAL]),
      tipdressCableDateMeasured: parseExcelDate(rawRow[COLUMN_INDEX.TIPDRESS_DATE]),
      tipdressCableOrder: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_ORDER]),
      tipdressCableFTFConfirmed: normalizeNumber(rawRow[COLUMN_INDEX.TIPDRESS_FTF]),

      // Teach Pendant Cable - use column indices
      teachPendantCableControllerToTeachPoint: normalizeNumber(rawRow[COLUMN_INDEX.TEACH_CONTROLLER]),
      teachPendantCableAdditional: normalizeNumber(rawRow[COLUMN_INDEX.TEACH_ADDITIONAL]),
      teachPendantCableDescription: normalizeString(rawRow[COLUMN_INDEX.TEACH_DESC]),
      teachPendantCableReserve: normalizeNumber(rawRow[COLUMN_INDEX.TEACH_RESERVE]),
      teachPendantCableTotal: normalizeNumber(rawRow[COLUMN_INDEX.TEACH_TOTAL]),
      teachPendantCableDateMeasured: parseExcelDate(rawRow[COLUMN_INDEX.TEACH_DATE]),
      teachPendantCableOrder: normalizeNumber(rawRow[COLUMN_INDEX.TEACH_ORDER]),
      teachPendantCableFTFConfirmed: normalizeNumber(rawRow[COLUMN_INDEX.TEACH_FTF]),

      // ESOW - use column indices
      ftfApprovedDesignList: normalizeBoolean(rawRow[COLUMN_INDEX.FTF_APPROVED_DES_LIST]),
      esowRobotType: normalizeString(rawRow[COLUMN_INDEX.ESOW_ROBOT_TYPE]),
      ftfApprovedESOW: normalizeBoolean(rawRow[COLUMN_INDEX.FTF_APPROVED_ESOW]),
      differsFromESOW: normalizeBoolean(rawRow[COLUMN_INDEX.DIFFERS_FROM_ESOW]),
      esowComment: normalizeString(rawRow[COLUMN_INDEX.ESOW_COMMENT]),
      applicationConcern: normalizeString(rawRow[COLUMN_INDEX.APPLICATION_CONCERN]),

      // Install Status - use column index
      installStatus: normalizeString(rawRow[COLUMN_INDEX.INSTALL_STATUS]),

      // Metadata
      sourceRow
    })
  }

  return normalized
}

// ============================================================================
// ENTITY CONVERSION
// ============================================================================

/**
 * Extract area code from station (e.g., "9B-100" -> "9B")
 */
function extractAreaCode(station: string): string {
  const match = station.match(/^([A-Z0-9]+)-/)
  return match ? match[1] : station
}

/**
 * Classify robot application type
 */
function classifyApplication(application: string): RobotApplicationType {
  const normalized = application.toLowerCase().trim()

  if (normalized.includes('spot') && normalized.includes('material')) {
    return 'Material Handling/Spot Welding'
  }
  if (normalized.includes('spot')) return 'Spot Welding'
  if (normalized.includes('material')) return 'Material Handling'
  if (normalized.includes('seal')) return 'Sealing'
  if (normalized.includes('stud')) return 'Stud Welding'
  if (normalized.includes('vision')) return 'Vision'

  return 'Other'
}

/**
 * Convert normalized row to entity
 */
export function robotEquipmentRowToEntity(
  row: NormalizedRobotEquipmentRow,
  sheetName: string,
  sourceFile: string,
  anomalies: RobotEquipmentValidationAnomaly[]
): RobotEquipmentEntity | null {
  // Validate required fields
  if (!row.robotId) {
    anomalies.push({
      type: 'MISSING_ROBOT_ID',
      row: row.sourceRow,
      message: 'Missing robot ID'
    })
    return null
  }

  if (!row.station) {
    anomalies.push({
      type: 'MISSING_STATION',
      row: row.sourceRow,
      message: `Robot ${row.robotId} missing station`
    })
    return null
  }

  // Extract area code
  const areaCode = extractAreaCode(row.station)

  // Build bases
  const bases: RobotBases | null = row.baseHeight || row.baseCode ? {
    height: row.baseHeight,
    baseCode: row.baseCode,
    dateApproved: row.baseDateApproved,
    dateIssuedToManufacture: row.baseDateIssuedToManufacture,
    issuedBy: row.baseIssuedBy
  } : null

  // Build track
  const track: RobotTrack | null = row.trackLength || row.trackPartNumber ? {
    length: row.trackLength,
    riserHeight: row.trackRiserHeight,
    robotOrientation: row.trackRobotOrientation,
    partNumber: row.trackPartNumber,
    catTrackPosition: row.trackCatTrackPosition,
    lengthConfirmed: row.trackLengthConfirmed,
    trackOrdered: row.trackOrdered,
    rtuSerialNumber: row.trackRTUSerialNumber,
    note: row.trackNote,
    catTrackDressoutCheck: row.trackCatTrackDressoutCheck
  } : null

  // Build weldguns
  const weldguns: RobotWeldguns | null = row.weldgunsNumber ? {
    numberOfGuns: row.weldgunsNumber,
    gunType: row.weldgunsGunType,
    gunSize: row.weldgunsGunSize
  } : null

  // Build sealing
  const sealing: RobotSealing | null = row.sealingRobotSealer || row.sealingSealer || row.sealingAdhesive ? {
    robotSealer: row.sealingRobotSealer,
    numberOfPedStands: row.sealingNumberOfPedStands,
    sealer: row.sealingSealer,
    adhesive: row.sealingAdhesive
  } : null

  // Build projection welding
  const projectionWelding: RobotProjectionWelding | null = row.projectionBolt || row.projectionNut ? {
    projectionBolt: row.projectionBolt,
    projectionNut: row.projectionNut
  } : null

  // Build cables
  const mainCable: CableSpec | null = row.mainCableControllerToRobot !== null ? {
    controllerToRobot: row.mainCableControllerToRobot,
    fenceToController: row.mainCableFenceToController,
    maintLoop: row.mainCableMaintLoop,
    additional: row.mainCableAdditional,
    description: row.mainCableDescription,
    reserve: row.mainCableReserve,
    total: row.mainCableTotal,
    dateMeasured: row.mainCableDateMeasured,
    order: row.mainCableOrder,
    ftfConfirmed: row.mainCableFTFConfirmed
  } : null

  const tipdressCable: CableSpec | null = row.tipdressCableControllerToTipdresser !== null ? {
    controllerToRobot: row.tipdressCableControllerToTipdresser,
    fenceToController: row.tipdressCableFenceToController,
    maintLoop: row.tipdressCableMaintLoop,
    additional: row.tipdressCableAdditional,
    description: row.tipdressCableDescription,
    reserve: row.tipdressCableReserve,
    total: row.tipdressCableTotal,
    dateMeasured: row.tipdressCableDateMeasured,
    order: row.tipdressCableOrder,
    ftfConfirmed: row.tipdressCableFTFConfirmed
  } : null

  const teachPendantCable: CableSpec | null = row.teachPendantCableControllerToTeachPoint !== null ? {
    controllerToRobot: row.teachPendantCableControllerToTeachPoint,
    fenceToController: null,
    maintLoop: null,
    additional: row.teachPendantCableAdditional,
    description: row.teachPendantCableDescription,
    reserve: row.teachPendantCableReserve,
    total: row.teachPendantCableTotal,
    dateMeasured: row.teachPendantCableDateMeasured,
    order: row.teachPendantCableOrder,
    ftfConfirmed: row.teachPendantCableFTFConfirmed
  } : null

  return {
    canonicalKey: `FORD|ROBOT|${row.robotId}`,
    robotId: row.robotId,
    station: row.station,
    area: areaCode,
    areaFull: row.area,
    serialNumber: row.serialNumber,
    robotKey: row.robotKey,
    robotType: row.robotType,
    application: classifyApplication(row.application),
    applicationCode: row.applicationCode,
    personResponsible: row.personResponsible,
    bundle: row.bundle,
    order: row.order,
    installStatus: row.installStatus,
    robotTypeConfirmed: row.robotTypeConfirmed,
    robotOrderSubmitted: row.robotOrderSubmitted,
    isRemoved: false,  // Will be set by strikethrough detection
    substituteRobot: row.substituteRobot,
    substituteSerialNumber: row.substituteSerialNumber,
    substituteKey: row.substituteKey,
    bases,
    track,
    weldguns,
    sealing,
    studWelding: row.studWelding,
    projectionWelding,
    mainCable,
    tipdressCable,
    teachPendantCable,
    dresspackType: row.dresspackType,
    deliveryChecklistComplete: row.deliveryChecklistComplete,
    controllerCableCheck: row.controllerCableCheck,
    ftfApprovedDesignList: row.ftfApprovedDesignList,
    esowRobotType: row.esowRobotType,
    ftfApprovedESOW: row.ftfApprovedESOW,
    differsFromESOW: row.differsFromESOW,
    esowComment: row.esowComment,
    applicationConcern: row.applicationConcern,
    source: {
      file: sourceFile,
      sheet: sheetName,
      row: row.sourceRow
    }
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate robot equipment entities
 */
export function validateRobotEquipmentEntities(
  entities: RobotEquipmentEntity[],
  totalRowsRead: number,
  existingAnomalies: RobotEquipmentValidationAnomaly[]
): RobotEquipmentValidationReport {
  const anomalies = [...existingAnomalies]

  // Check for duplicates
  const seenRobotIds = new Set<string>()
  let duplicateCount = 0

  for (const entity of entities) {
    if (seenRobotIds.has(entity.robotId)) {
      anomalies.push({
        type: 'DUPLICATE_ROBOT',
        row: entity.source.row,
        message: `Duplicate robot ID: ${entity.robotId}`
      })
      duplicateCount++
    }
    seenRobotIds.add(entity.robotId)
  }

  // Count removed robots
  const removedCount = entities.filter(e => e.isRemoved).length

  return {
    totalRowsRead,
    totalEntitiesProduced: entities.length,
    duplicateRobotCount: duplicateCount,
    invalidFormatCount: existingAnomalies.filter(a => a.type === 'INVALID_FORMAT').length,
    missingStationCount: existingAnomalies.filter(a => a.type === 'MISSING_STATION').length,
    missingRobotIdCount: existingAnomalies.filter(a => a.type === 'MISSING_ROBOT_ID').length,
    removedRobotCount: removedCount,
    anomalies
  }
}
