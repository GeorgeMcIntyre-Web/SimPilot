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

const COLUMN_MAP = {
  // Row 0 columns
  AREA_COLUMN_GROUP: 'Area',

  // Identity columns (from header row 1)
  PERSON_RESPONSIBLE: 'Person Responsible',
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

  // Robot Type
  ROBOT_TYPE: 'Robot Type',
  ROBOT_TYPE_CONFIRMED: 'Robot Type Confirmed',
  ROBOT_ORDER_SUBMITTED: 'Robot Order Submitted',
  CABLE_CHANGE_CUTOFF: 'Cable Change Cutoff',
  COMMENT: 'Comment',

  // Application
  FUNCTION: 'Function',
  CODE: 'Code',

  // Install Status
  INSTALL_STATUS: 'Install status'
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
 */
export function normalizeRobotEquipmentRows(
  rows: RobotEquipmentRawRow[],
  sourceFile: string,
  headerRowIndex: number
): NormalizedRobotEquipmentRow[] {
  const normalized: NormalizedRobotEquipmentRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const sourceRow = headerRowIndex + i + 1

    // Skip rows without robot ID
    const robotId = normalizeString(row[COLUMN_MAP.ROBOT_ID])
    if (!robotId) continue

    // Parse identity
    const area = normalizeString(row[COLUMN_MAP.PERSON_RESPONSIBLE]) || ''
    const station = normalizeString(row[COLUMN_MAP.STATION]) || ''

    // Parse serial number (can be "Not Delivered")
    const serialNumber = normalizeString(row[COLUMN_MAP.SERIAL_NUMBER])

    normalized.push({
      // Identity
      area,
      personResponsible: area,
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

      // Robot Type
      robotType: normalizeString(row[COLUMN_MAP.ROBOT_TYPE]) || '',
      robotTypeConfirmed: !!row[COLUMN_MAP.ROBOT_TYPE_CONFIRMED],
      robotOrderSubmitted: !!row[COLUMN_MAP.ROBOT_ORDER_SUBMITTED],
      cableChangeCutoff: normalizeString(row[COLUMN_MAP.CABLE_CHANGE_CUTOFF]),
      comment: normalizeString(row[COLUMN_MAP.COMMENT]),

      // Application
      application: normalizeString(row[COLUMN_MAP.FUNCTION]) || '',
      applicationCode: normalizeString(row[COLUMN_MAP.CODE]) || '',

      // Dresspack
      dresspackType: normalizeString(row['Side Mounted LH / Side Mounted RH']),
      deliveryChecklistComplete: normalizeBoolean(row['Robot Unit Dress Pack Check']),
      controllerCableCheck: normalizeBoolean(row['Controller Cable Check']),

      // Bases
      baseHeight: row['Height '] || null,
      baseCode: normalizeString(row['Base Code']),
      baseDateApproved: parseExcelDate(row['Date Approved']),
      baseDateIssuedToManufacture: parseExcelDate(row['Date Issued to Manafacture']),
      baseIssuedBy: normalizeString(row[' Issued By']),

      // Track
      trackLength: normalizeNumber(row['Length']),
      trackRiserHeight: normalizeNumber(row['Riser Height']),
      trackRobotOrientation: normalizeString(row['Robot Orientation']),
      trackPartNumber: normalizeString(row['Part Number']),
      trackCatTrackPosition: normalizeString(row['Cat track position']),
      trackLengthConfirmed: normalizeBoolean(row['Length Confirmed']),
      trackOrdered: normalizeBoolean(row['Track Ordered']),
      trackRTUSerialNumber: normalizeString(row['RTU Serial #']),
      trackNote: normalizeString(row['Note']),
      trackCatTrackDressoutCheck: normalizeBoolean(row['Cat track Dressout Check']),

      // Dress pack FTF
      dresspackFTF: normalizeString(row['FTF/FTS']),

      // Tool Change
      toolChange: normalizeString(row['Tool Change ']),

      // Weldguns
      weldgunsNumber: normalizeNumber(row['No.  Of Weld Guns']),
      weldgunsGunType: normalizeString(row['Gun Type']),
      weldgunsGunSize: normalizeString(row['Gun Size']),

      // Sealing
      sealingRobotSealer: normalizeBoolean(row['Robot Sealer']),
      sealingNumberOfPedStands: normalizeNumber(row['No. Of Ped Stands']),
      sealingSealer: normalizeBoolean(row['Sealer']),
      sealingAdhesive: normalizeBoolean(row['Adhesive']),

      // Arc Stud Welding
      studWelding: normalizeBoolean(row['Stud Weld']),

      // Projection Welding
      projectionBolt: normalizeBoolean(row['Projection Bolt']),
      projectionNut: normalizeBoolean(row['Projection Nut']),

      // Main Cable
      mainCableControllerToRobot: normalizeNumber(row['Controller To Robot']),
      mainCableFenceToController: normalizeNumber(row['Fence to Controller']),
      mainCableMaintLoop: normalizeNumber(row['Maint loop']),
      mainCableAdditional: normalizeNumber(row['Additional ']),
      mainCableDescription: normalizeString(row['Description']),
      mainCableReserve: normalizeNumber(row['Reserve']),
      mainCableTotal: normalizeNumber(row['Total']),
      mainCableDateMeasured: parseExcelDate(row['Date Measured']),
      mainCableOrder: normalizeNumber(row['Order']),
      mainCableFTFConfirmed: normalizeNumber(row['FTF Confirmed']),

      // Tipdress Cable
      tipdressCableControllerToTipdresser: normalizeNumber(row['Controller to Tipdresser']),
      tipdressCableFenceToController: normalizeNumber(row['Fence to Controller']),
      tipdressCableMaintLoop: normalizeNumber(row['Maint loop']),
      tipdressCableBaseHeight: normalizeNumber(row['Base height']),
      tipdressCableAdditional: normalizeNumber(row['Additional ']),
      tipdressCableDescription: normalizeString(row['Description']),
      tipdressCableReserve: normalizeNumber(row['Reserve']),
      tipdressCableTotal: normalizeNumber(row['Total']),
      tipdressCableDateMeasured: parseExcelDate(row['Date Measured']),
      tipdressCableOrder: normalizeNumber(row['Order']),
      tipdressCableFTFConfirmed: normalizeNumber(row['FTF Confirmed']),

      // Teach Pendant Cable
      teachPendantCableControllerToTeachPoint: normalizeNumber(row['Controller to teach point']),
      teachPendantCableAdditional: normalizeNumber(row['Additional ']),
      teachPendantCableDescription: normalizeString(row['Description']),
      teachPendantCableReserve: normalizeNumber(row['Reserve']),
      teachPendantCableTotal: normalizeNumber(row['Total']),
      teachPendantCableDateMeasured: parseExcelDate(row['Date Measured']),
      teachPendantCableOrder: normalizeNumber(row['Order']),
      teachPendantCableFTFConfirmed: normalizeNumber(row['FTF Confirmed']),

      // ESOW
      ftfApprovedDesignList: normalizeBoolean(row['FTF Approved Application Des List']),
      esowRobotType: normalizeString(row['ESOW Robot Type']),
      ftfApprovedESOW: normalizeBoolean(row['FTF Approved Application ESOW']),
      differsFromESOW: normalizeBoolean(row['DiffersFrom ESOW?']),
      esowComment: normalizeString(row['Comment']),
      applicationConcern: normalizeString(row['Robot Application Concern?']),

      // Install Status
      installStatus: normalizeString(row[COLUMN_MAP.INSTALL_STATUS]),

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
