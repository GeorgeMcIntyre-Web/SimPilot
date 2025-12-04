// STLA-S Data Ingestion Harness
// Verifies schema-agnostic ingestion engine with real STLA-S Excel files

const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

// Import ingestion modules (using require for CJS)
// Note: These need to be built first via `npm run build`
// For now, we'll implement inline to avoid build dependencies

// ============================================================================
// FILE CONFIGURATION
// ============================================================================

// REAL STLA-S files from SimPilot_Data repository
const BASE_PATH = 'C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData'

const FILES = [
  // Simulation Status files (5)
  { path: path.join(BASE_PATH, 'STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx'), type: 'SIM_STATUS' },
  { path: path.join(BASE_PATH, 'STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx'), type: 'SIM_STATUS' },
  { path: path.join(BASE_PATH, 'STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx'), type: 'SIM_STATUS' },
  { path: path.join(BASE_PATH, 'STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx'), type: 'SIM_STATUS' },
  { path: path.join(BASE_PATH, 'STLA-S_UNDERBODY_Simulation_Status_DES.xlsx'), type: 'SIM_STATUS' },

  // Tool List (1)
  { path: path.join(BASE_PATH, 'STLA_S_ZAR Tool List.xlsx'), type: 'TOOL_LIST' },

  // Assemblies Lists (4) - INCLUDING BOTTOM_TRAY
  { path: path.join(BASE_PATH, 'J11006_TMS_STLA_S_BOTTOM_TRAY_Assemblies_List.xlsm'), type: 'ASSEMBLIES_LIST' },
  { path: path.join(BASE_PATH, 'J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm'), type: 'ASSEMBLIES_LIST' },
  { path: path.join(BASE_PATH, 'J11006_TMS_STLA_S_REAR_UNIT_Assemblies_List.xlsm'), type: 'ASSEMBLIES_LIST' },
  { path: path.join(BASE_PATH, 'J11006_TMS_STLA_S_UNDERBODY_Assemblies_List.xlsm'), type: 'ASSEMBLIES_LIST' },

  // Robot List (1)
  { path: path.join(BASE_PATH, 'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx'), type: 'ROBOT_LIST' }
]

// ============================================================================
// SIMPLIFIED NORMALIZERS (inline for CJS)
// ============================================================================

function normalizeAreaName(raw) {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  return trimmed.toUpperCase().replace(/\s+/g, ' ')
}

function normalizeStationCode(raw) {
  if (!raw) return null
  let normalized = String(raw).trim()
  if (!normalized) return null

  // Remove common prefixes
  normalized = normalized.replace(/^STATION\s*[-_]?/i, '')
  normalized = normalized.replace(/^OP\s*[-_]?/i, '')
  normalized = normalized.replace(/^ST\s*[-_]?/i, '')

  // Strip leading zeros
  normalized = normalized.replace(/(\d+)/g, (match) => {
    const num = parseInt(match, 10)
    return num.toString()
  })

  return normalized.toUpperCase()
}

function buildStationId(area, station) {
  const normalizedArea = normalizeAreaName(area)
  const normalizedStation = normalizeStationCode(station)

  if (!normalizedArea && !normalizedStation) return null

  if (normalizedArea && normalizedStation) {
    return `${normalizedArea}|${normalizedStation}`
  }

  if (normalizedStation) {
    return `__GLOBAL__|${normalizedStation}`
  }

  return `${normalizedArea}|__NO_STATION__`
}

// ============================================================================
// SCHEMA DETECTION (inline simplified version)
// ============================================================================

function classifyFileType(filename) {
  const lower = filename.toLowerCase()

  if (lower.includes('simulation_status') || lower.includes('simulation status')) {
    return 'SIM_STATUS'
  }

  if (lower.includes('tool list') || lower.includes('tool_list') || lower.includes('toollist')) {
    return 'TOOL_LIST'
  }

  if (lower.includes('assemblies_list') || lower.includes('assemblies list')) {
    return 'ASSEMBLIES_LIST'
  }

  if (lower.includes('robotlist') || lower.includes('robot_list') || lower.includes('robot list')) {
    return 'ROBOT_LIST'
  }

  return 'UNKNOWN'
}

function findHeaderRow(rows, keywords, minKeywords = 1) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const stringCells = row.slice(0, 15).filter(cell =>
      typeof cell === 'string' && cell.trim().length > 0
    )

    if (stringCells.length < 3) continue

    // Count how many keywords match
    const matchCount = keywords.filter(kw => {
      return row.some(cell => {
        if (typeof cell !== 'string') return false
        const upper = cell.toUpperCase()
        return upper.includes(kw)
      })
    }).length

    if (matchCount >= minKeywords) return i
  }

  return null
}

function detectSchemaForFile(workbook, filename, fileType) {
  const sheetNames = workbook.SheetNames

  // Try to find appropriate sheet
  let sheetName = sheetNames[0]

  // For SIM_STATUS, prefer "SIMULATION" sheet
  if (fileType === 'SIM_STATUS') {
    const simSheet = sheetNames.find(name => name.toUpperCase().includes('SIMULATION'))
    if (simSheet) sheetName = simSheet
  }

  // For ASSEMBLIES, prefer "A_List"
  if (fileType === 'ASSEMBLIES_LIST') {
    if (sheetNames.includes('A_List')) sheetName = 'A_List'
  }

  // For TOOL_LIST, prefer "ToolList" or sheet with "TOOL" in name
  if (fileType === 'TOOL_LIST') {
    const toolSheet = sheetNames.find(name => name.toUpperCase() === 'TOOLLIST' || name.toUpperCase().includes('TOOL'))
    if (toolSheet) sheetName = toolSheet
  }

  // For ROBOT_LIST, prefer sheet with "STLA" or "ROBOT" in name
  if (fileType === 'ROBOT_LIST') {
    const robotSheet = sheetNames.find(name => name.toUpperCase().includes('STLA') || name.toUpperCase().includes('ROBOT'))
    if (robotSheet) sheetName = robotSheet
  }

  if (!sheetName) return null

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // Get keywords and min matches based on file type
  const config = {
    'SIM_STATUS': {
      keywords: ['AREA', 'STATION', 'ROBOT', 'APPLICATION', 'LINE'],
      minKeywords: 2,
      startRow: 0
    },
    'TOOL_LIST': {
      keywords: ['EQUIPMENT', 'TOOL', 'GUN', 'STATION', 'TYPE', 'SHOWN', 'SUB', 'AREA'],
      minKeywords: 2,
      startRow: 0
    },
    'ASSEMBLIES_LIST': {
      keywords: ['STATION', 'TOOL', 'NUMBER', 'DESCRIPTION', 'STAGE', 'DETAILING'],
      minKeywords: 2,
      startRow: 8  // Assemblies lists typically start searching around row 8
    },
    'ROBOT_LIST': {
      keywords: ['ROBOT', 'AREA', 'STATION', 'NUMBER', 'LINE', 'INDEX', 'ASSEMBLY'],
      minKeywords: 2,
      startRow: 0
    }
  }

  const { keywords, minKeywords, startRow } = config[fileType] || { keywords: ['AREA', 'STATION'], minKeywords: 1, startRow: 0 }

  // Search from specified start row
  let headerRowIndex = null
  for (let i = startRow; i < Math.min(rows.length, 20); i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const stringCells = row.slice(0, 15).filter(cell =>
      typeof cell === 'string' && cell.trim().length > 0
    )

    if (stringCells.length < 3) continue

    const matchCount = keywords.filter(kw => {
      return row.some(cell => {
        if (typeof cell !== 'string') return false
        const upper = cell.toUpperCase()
        return upper.includes(kw)
      })
    }).length

    if (matchCount >= minKeywords) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === null) return null

  const headerRow = rows[headerRowIndex]

  // Detect key columns (flexible matching with priority)
  const columnMapping = {}
  headerRow.forEach((header, idx) => {
    if (!header) return
    const headerUpper = String(header).toUpperCase().trim()

    // Area detection - exact match first
    if (headerUpper === 'AREA' || headerUpper === 'AREA NAME') {
      columnMapping.AREA_NAME = idx
    } else if (headerUpper === 'INDEX' && !columnMapping.AREA_NAME) {
      columnMapping.AREA_NAME = idx
    }

    // Station detection - prefer exact "STATION" matches
    if (headerUpper === 'STATION' || headerUpper === 'STATION CODE' || headerUpper === 'STATION NUMBER') {
      columnMapping.STATION_CODE = idx
    } else if (headerUpper.match(/^OP\s*\d+$/i) && !columnMapping.STATION_CODE) {
      columnMapping.STATION_CODE = idx
    }

    // Robot detection - prefer "Robot caption" or just "Robot"
    if (headerUpper === 'ROBOT' || headerUpper === 'ROBOT CAPTION' || headerUpper === 'ROBOT NAME') {
      columnMapping.ROBOT_CAPTION = idx
    } else if (headerUpper === 'ROBOTS TOTAL' && !columnMapping.ROBOT_CAPTION) {
      columnMapping.ROBOT_CAPTION = idx
    }

    // E-number detection - be specific
    if (headerUpper.includes('E-NUMBER') || headerUpper === 'ROBOTNUMBER' ||
        headerUpper === 'ROBOT NUMBER' || headerUpper.includes('ROBOTNUMBER (E-NUMBER)')) {
      columnMapping.E_SERIAL = idx
    }

    // Equipment type - exact match
    if (headerUpper === 'EQUIPMENT TYPE' || headerUpper === 'TOOL TYPE') {
      columnMapping.EQUIPMENT_TYPE = idx
    }

    // Assembly Line detection
    if (headerUpper === 'ASSEMBLY LINE' || headerUpper === 'LINE' || headerUpper === 'LINE CODE') {
      columnMapping.ASSEMBLY_LINE = idx
    }
  })

  return {
    sheetName,
    headerRowIndex,
    headerRow,
    rows,
    columnMapping
  }
}

// ============================================================================
// STRIKETHROUGH DETECTION
// ============================================================================

/**
 * Check if a row has strikethrough formatting on key cells
 * Returns true if strikethrough is detected (inactive row)
 */
function hasStrikethrough(workbook, sheetName, rowIndex, colIndices) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return false

  // Check if any of the specified columns have strikethrough
  for (const colIdx of colIndices) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIdx })
    const cell = sheet[cellAddress]

    if (!cell) continue

    // Check if cell has font style with strikethrough
    if (cell.s && cell.s.font && cell.s.font.strike) {
      return true
    }
  }

  return false
}

// ============================================================================
// DATA EXTRACTION
// ============================================================================

function extractSimulationCells(schema, filename) {
  if (!schema) return []

  const cells = []
  const dataStartIndex = schema.headerRowIndex + 1

  for (let i = dataStartIndex; i < schema.rows.length; i++) {
    const row = schema.rows[i]
    if (!row || row.length === 0) continue

    const areaIdx = schema.columnMapping.AREA_NAME
    const stationIdx = schema.columnMapping.STATION_CODE

    if (areaIdx === undefined || stationIdx === undefined) continue

    const areaName = row[areaIdx] ? String(row[areaIdx]).trim() : null
    const stationCode = row[stationIdx] ? String(row[stationIdx]).trim() : null

    if (!areaName || !stationCode) continue

    const stationId = buildStationId(areaName, stationCode)

    cells.push({
      areaName,
      stationCode,
      stationId,
      sourceFile: path.basename(filename),
      rowIndex: i
    })
  }

  return cells
}

function extractRobots(schema, filename) {
  if (!schema) return []

  const robots = []
  const dataStartIndex = schema.headerRowIndex + 1

  for (let i = dataStartIndex; i < schema.rows.length; i++) {
    const row = schema.rows[i]
    if (!row || row.length === 0) continue

    const areaIdx = schema.columnMapping.AREA_NAME
    const stationIdx = schema.columnMapping.STATION_CODE
    const robotIdx = schema.columnMapping.ROBOT_CAPTION
    const serialIdx = schema.columnMapping.E_SERIAL

    const areaName = areaIdx !== undefined && row[areaIdx] ? String(row[areaIdx]).trim() : null
    const stationCode = stationIdx !== undefined && row[stationIdx] ? String(row[stationIdx]).trim() : null
    const robotCaption = robotIdx !== undefined && row[robotIdx] ? String(row[robotIdx]).trim() : null
    const serialNumber = serialIdx !== undefined && row[serialIdx] ? String(row[serialIdx]).trim() : null

    if (!serialNumber && !robotCaption) continue

    const stationId = buildStationId(areaName, stationCode)

    robots.push({
      areaName,
      stationCode,
      stationId,
      robotCaption,
      serialNumber: serialNumber || robotCaption,
      sourceFile: path.basename(filename),
      rowIndex: i
    })
  }

  return robots
}

/**
 * Infer area name from Assemblies List or Tool List filename
 */
function inferAreaFromFilename(filename) {
  const upper = filename.toUpperCase()

  if (upper.includes('FRONT_UNIT') || upper.includes('FRONT UNIT')) {
    return normalizeAreaName('FRONT UNIT')
  }

  if (upper.includes('REAR_UNIT') || upper.includes('REAR UNIT')) {
    return normalizeAreaName('REAR UNIT')
  }

  if (upper.includes('UNDERBODY')) {
    return normalizeAreaName('UNDERBODY')
  }

  if (upper.includes('BOTTOM_TRAY') || upper.includes('BOTTOM TRAY')) {
    return normalizeAreaName('BOTTOM TRAY')
  }

  return null
}

/**
 * Extract station code from Assemblies List station labels
 * e.g., "S010 GJR 02 - 03" -> "S010"
 */
function extractStationCodeFromAssembliesLabel(label) {
  if (!label) return null

  const trimmed = String(label).trim()
  if (!trimmed) return null

  // Try alphanumeric pattern first (e.g., "S010", "BN010", "CA008")
  const alphaNumMatch = trimmed.match(/^([A-Z]{1,2}\d{1,4})\b/i)
  if (alphaNumMatch) {
    return alphaNumMatch[1].toUpperCase()
  }

  // Try numeric pattern (e.g., "010", "20")
  const numMatch = trimmed.match(/^(\d{1,4})\b/)
  if (numMatch) {
    return numMatch[1]
  }

  return null
}

function extractAssets(schema, filename, fileType, workbook) {
  if (!schema) return []

  const assets = []
  const dataStartIndex = schema.headerRowIndex + 1

  // Infer area from filename for Assemblies Lists and Tool Lists
  const inferredArea = (fileType === 'ASSEMBLIES_LIST' || fileType === 'TOOL_LIST')
    ? inferAreaFromFilename(filename)
    : null

  for (let i = dataStartIndex; i < schema.rows.length; i++) {
    const row = schema.rows[i]
    if (!row || row.length === 0) continue

    // For Assemblies Lists: Filter by Column A marker
    if (fileType === 'ASSEMBLIES_LIST') {
      const columnA = String(row[0] || '').trim().toUpperCase()
      // Only parse rows where Column A = 'X' (main tools)
      // Skip 'Y' (sub-components), 'Z' (GA markers), 'T' (totals)
      if (columnA !== 'X') {
        continue
      }
    }

    // For Tool List and Assemblies, look for station/tool info
    const areaIdx = schema.columnMapping.AREA_NAME
    const stationIdx = schema.columnMapping.STATION_CODE
    const equipmentTypeIdx = schema.columnMapping.EQUIPMENT_TYPE

    let areaName = areaIdx !== undefined && row[areaIdx] ? String(row[areaIdx]).trim() : null
    let stationCode = stationIdx !== undefined && row[stationIdx] ? String(row[stationIdx]).trim() : null
    const equipmentType = equipmentTypeIdx !== undefined && row[equipmentTypeIdx] ? String(row[equipmentTypeIdx]).trim() : null

    // Use inferred area if no area in row
    if (!areaName && inferredArea) {
      areaName = inferredArea
    }

    // For Assemblies Lists: extract station code from compound labels
    if (fileType === 'ASSEMBLIES_LIST' && stationCode) {
      const extracted = extractStationCodeFromAssembliesLabel(stationCode)
      if (extracted) {
        stationCode = extracted
      }
    }

    if (!stationCode) continue

    const stationId = buildStationId(areaName, stationCode)

    // Check for strikethrough (inactive tooling) on Tool List and Assemblies
    let isActive = true
    if (fileType === 'TOOL_LIST' || fileType === 'ASSEMBLIES_LIST') {
      // Check key columns for strikethrough: station and equipment type
      const colsToCheck = [stationIdx, equipmentTypeIdx].filter(idx => idx !== undefined)
      const struck = hasStrikethrough(workbook, schema.sheetName, i, colsToCheck)
      if (struck) {
        isActive = false
      }
    }

    assets.push({
      areaName,
      stationCode,
      stationId,
      equipmentType,
      isActive,
      sourceFile: path.basename(filename),
      rowIndex: i
    })
  }

  return assets
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('=' .repeat(80))
  console.log('STLA-S DATA INGESTION HARNESS')
  console.log('=' .repeat(80))
  console.log('')

  const allCells = []
  const allRobots = []
  const allAssets = []

  // Process each file
  for (const fileDesc of FILES) {
    const filePath = fileDesc.path

    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${path.basename(filePath)} - File not found`)
      console.log('')
      continue
    }

    console.log(`[SCHEMA] ${path.basename(filePath)}`)

    const workbook = XLSX.readFile(filePath, { cellStyles: true })
    const detectedType = classifyFileType(filePath)
    const schema = detectSchemaForFile(workbook, filePath, detectedType)

    if (!schema) {
      console.log(`  ERROR: Could not detect schema`)
      console.log('')
      continue
    }

    console.log(`  fileType: ${detectedType}`)
    console.log(`  sheet: ${schema.sheetName}`)
    console.log(`  headerRow: ${schema.headerRowIndex}`)

    // Log column mappings
    Object.entries(schema.columnMapping).forEach(([field, idx]) => {
      const colName = schema.headerRow[idx]
      console.log(`  ${field.padEnd(20)} -> column "${colName}"`)
    })

    // Extract data
    if (detectedType === 'SIM_STATUS') {
      const cells = extractSimulationCells(schema, filePath)
      allCells.push(...cells)
      console.log(`  Extracted: ${cells.length} cells`)
    }

    if (detectedType === 'ROBOT_LIST') {
      const robots = extractRobots(schema, filePath)
      allRobots.push(...robots)
      console.log(`  Extracted: ${robots.length} robots`)
    }

    if (detectedType === 'TOOL_LIST' || detectedType === 'ASSEMBLIES_LIST') {
      const assets = extractAssets(schema, filePath, detectedType, workbook)
      allAssets.push(...assets)
      const activeCount = assets.filter(a => a.isActive !== false).length
      const inactiveCount = assets.filter(a => a.isActive === false).length
      console.log(`  Extracted: ${assets.length} assets (${activeCount} active, ${inactiveCount} inactive/struck)`)
    }

    console.log('')
  }

  // Sample IDs
  console.log('=' .repeat(80))
  console.log('SAMPLE CANONICAL IDS')
  console.log('=' .repeat(80))
  console.log('')

  console.log('[CELLS] First 5 simulation cells:')
  allCells.slice(0, 5).forEach(cell => {
    console.log(`  ${cell.areaName || 'N/A'} | ${cell.stationCode || 'N/A'} -> stationId: ${cell.stationId || 'N/A'}`)
  })
  console.log('')

  console.log('[ROBOTS] First 5 robots:')
  allRobots.slice(0, 5).forEach(robot => {
    console.log(`  ${robot.areaName || 'N/A'} | ${robot.stationCode || 'N/A'} | ${robot.serialNumber || 'N/A'} -> stationId: ${robot.stationId || 'N/A'}`)
  })
  console.log('')

  console.log('[ASSETS] First 5 tools/fixtures:')
  allAssets.slice(0, 5).forEach(asset => {
    console.log(`  ${asset.areaName || 'N/A'} | ${asset.stationCode || 'N/A'} -> stationId: ${asset.stationId || 'N/A'}`)
  })
  console.log('')

  // Linking analysis
  console.log('=' .repeat(80))
  console.log('LINKING ANALYSIS')
  console.log('=' .repeat(80))
  console.log('')

  const allAssetsIncludingRobots = [...allAssets, ...allRobots]

  // Build station indexes
  const cellStationIds = new Set(allCells.map(c => c.stationId).filter(Boolean))
  const assetStationIds = new Set(allAssetsIncludingRobots.map(a => a.stationId).filter(Boolean))

  // Find matches
  const commonStationIds = new Set([...cellStationIds].filter(id => assetStationIds.has(id)))

  const linkedCells = allCells.filter(c => c.stationId && assetStationIds.has(c.stationId))
  const linkRate = allCells.length > 0 ? (linkedCells.length / allCells.length * 100).toFixed(1) : 0

  // Count active vs inactive tooling assets
  const activeTooling = allAssets.filter(a => a.isActive !== false)
  const inactiveTooling = allAssets.filter(a => a.isActive === false)

  // Count unique areas
  const areas = new Set()
  allCells.forEach(c => {
    if (c.areaName) areas.add(c.areaName.toUpperCase())
  })
  allRobots.forEach(r => {
    if (r.areaName) areas.add(r.areaName.toUpperCase())
  })

  console.log(`Files processed: ${FILES.length}`)
  console.log(`Total cells: ${allCells.length}`)
  console.log(`Total robots: ${allRobots.length}`)
  console.log(`Total tooling assets: ${allAssets.length} (${activeTooling.length} active, ${inactiveTooling.length} inactive/struck)`)
  console.log(`Unique areas: ${areas.size}`)
  console.log('')
  console.log(`Unique stationIds:`)
  console.log(`  - In cells only: ${cellStationIds.size}`)
  console.log(`  - In assets only: ${assetStationIds.size}`)
  console.log(`  - In both: ${commonStationIds.size}`)
  console.log('')
  console.log(`[LINKER] Linked ${linkedCells.length} / ${allCells.length} cells to assets (link rate: ${linkRate}%)`)
  console.log('')

  // Show mismatches
  const cellOnlyStations = [...cellStationIds].filter(id => !assetStationIds.has(id))
  const assetOnlyStations = [...assetStationIds].filter(id => !cellStationIds.has(id))

  if (cellOnlyStations.length > 0) {
    console.log(`Stations in cells but not in assets (first 5):`)
    cellOnlyStations.slice(0, 5).forEach(id => {
      console.log(`  - ${id}`)
    })
    console.log('')
  }

  if (assetOnlyStations.length > 0) {
    console.log(`Stations in assets but not in cells (first 5):`)
    assetOnlyStations.slice(0, 5).forEach(id => {
      console.log(`  - ${id}`)
    })
    console.log('')
  }

  // Diagnostics
  console.log('=' .repeat(80))
  console.log('DIAGNOSTICS')
  console.log('=' .repeat(80))
  console.log('')

  const stationsWithBoth = commonStationIds.size
  const stationsWithCellsOnly = cellOnlyStations.length
  const stationsWithAssetsOnly = assetOnlyStations.length

  console.log(`Stations with simulation cells AND assets: ${stationsWithBoth}`)
  console.log(`Stations with simulation cells ONLY: ${stationsWithCellsOnly}`)
  console.log(`Stations with assets ONLY: ${stationsWithAssetsOnly}`)
  console.log('')

  // Check for duplicate robot serials
  const serialCounts = {}
  allRobots.forEach(robot => {
    const serial = robot.serialNumber
    if (!serial) return
    serialCounts[serial] = (serialCounts[serial] || 0) + 1
  })

  const duplicateSerials = Object.entries(serialCounts).filter(([_, count]) => count > 1)

  if (duplicateSerials.length > 0) {
    console.log(`Duplicate robot serials found: ${duplicateSerials.length}`)
    duplicateSerials.slice(0, 3).forEach(([serial, count]) => {
      console.log(`  - ${serial}: appears ${count} times`)
    })
  } else {
    console.log(`No duplicate robot serials detected`)
  }
  console.log('')

  console.log('=' .repeat(80))
  console.log('[STLA-S] Ingestion harness completed.')
  console.log('See docs/STLA_S_DATA_OVERVIEW.md for a human-readable summary.')
  console.log('=' .repeat(80))
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
