// Sheet Sniffer
// Detects sheet category based on header content, not filename or sheet order.
// Handles messy real-world data (typos, empty columns, "Introduction" sheets, etc.)

import * as XLSX from 'xlsx'
import { sheetToMatrix, CellValue } from './excelUtils'

// ============================================================================
// TYPES
// ============================================================================

export type SheetCategory =
  | 'SIMULATION_STATUS'
  | 'IN_HOUSE_TOOLING'
  | 'ROBOT_SPECS'
  | 'REUSE_WELD_GUNS'
  | 'GUN_FORCE'
  | 'REUSE_RISERS'
  | 'METADATA'
  | 'UNKNOWN'

export interface SheetDetection {
  sheetName: string
  category: SheetCategory
  score: number
  matchedKeywords: string[]
}

export interface SheetScanResult {
  bestOverall: SheetDetection | null
  byCategory: Record<SheetCategory, SheetDetection | null>
  allDetections: SheetDetection[]
}

// ============================================================================
// CATEGORY KEYWORDS
// ============================================================================
// Ground-truth signatures for each category.
// DO NOT "fix" spelling - these match real-world headers exactly.

/**
 * Keywords that uniquely identify each sheet category.
 * Each category has:
 * - strong: High-value keywords that strongly indicate this category (+3 points each)
 * - medium: Domain-specific keywords that help confirm the category (+2 points each)
 * - weak: Common keywords that might appear in multiple categories (+1 point each)
 */
export const CATEGORY_KEYWORDS: Record<Exclude<SheetCategory, 'UNKNOWN'>, {
  strong: string[]
  medium: string[]
  weak: string[]
  minScore: number
}> = {
  // -------------------------------------------------------------------------
  // SIMULATION_STATUS
  // Typical file: STLA-S_...Simulation_Status_DES.xlsx
  // Typical sheet: SIMULATION
  // -------------------------------------------------------------------------
  SIMULATION_STATUS: {
    strong: [
      '1st STAGE SIM COMPLETION',
      'FINAL DELIVERABLES',
      'ROBOT POSITION - STAGE 1',
      'DCS CONFIGURED'
    ],
    medium: [
      'PERSONS RESPONSIBLE',
      'ASSEMBLY LINE',
      '1st STAGE',
      'STAGE 1',
      'ROBOT POSITION'
    ],
    weak: [
      'AREA',
      'STATION',
      'ROBOT',
      'APPLICATION'
    ],
    minScore: 6 // At least 2 strong keywords
  },

  // -------------------------------------------------------------------------
  // IN_HOUSE_TOOLING
  // File: STLA_S_ZAR Tool List.xlsx
  // Sheet: ToolList
  // -------------------------------------------------------------------------
  IN_HOUSE_TOOLING: {
    strong: [
      'Sim. Leader',
      'Sim. Employee',
      'Sim. Due Date (yyyy/MM/dd)'
    ],
    medium: [
      'Team Leader',
      'Due Date',
      'Employee'
    ],
    weak: [
      'Tool',
      'Status',
      'Date'
    ],
    minScore: 5
  },

  // -------------------------------------------------------------------------
  // ROBOT_SPECS
  // File: Robotlist_ZA...xlsx
  // Sheet: STLA-S
  // -------------------------------------------------------------------------
  ROBOT_SPECS: {
    strong: [
      'Robotnumber',
      'Robot caption',
      'Robotnumber (E-Number)',
      'Robot w/ J1-J3 Dress Pack (order code)'
    ],
    medium: [
      'Fanuc Order Code',
      'E-Number',
      'Dress Pack',
      'Robot Type'
    ],
    weak: [
      'Robot',
      'Model',
      'Payload',
      'Reach'
    ],
    minScore: 5
  },

  // -------------------------------------------------------------------------
  // REUSE_WELD_GUNS
  // File: GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx
  // Sheet: Welding guns
  // -------------------------------------------------------------------------
  REUSE_WELD_GUNS: {
    strong: [
      'Device Name',
      'Refresment OK',           // Keep typo
      'Serial Number Complete WG',
      'Asset description'
    ],
    medium: [
      'Serial Number',
      'WG',
      'Welding Gun',
      'Weld Gun'
    ],
    weak: [
      'Device',
      'Asset',
      'Status'
    ],
    minScore: 5
  },

  // -------------------------------------------------------------------------
  // GUN_FORCE
  // File: Zangenpool_TMS...xls
  // Sheet: Zaragoza Allocation
  // -------------------------------------------------------------------------
  GUN_FORCE: {
    strong: [
      'Gun Force [N]',
      'Gun Number',
      'Gun Force'
    ],
    medium: [
      'Quantity',
      'Reserve',
      'Old Line',
      'Robot Number'
    ],
    weak: [
      'Area',
      'Gun',
      'Force'
    ],
    minScore: 5
  },

  // -------------------------------------------------------------------------
  // REUSE_RISERS
  // File: GLOBAL_ZA_REUSE_LIST_RISERS.xlsx
  // Sheet: Raisers
  // -------------------------------------------------------------------------
  REUSE_RISERS: {
    strong: [
      'Proyect',                  // Keep typo
      'New station',
      'Coments'                   // Keep typo
    ],
    medium: [
      'Height',
      'Brand',
      'Standard',
      'New Line',
      'Riser',
      'Raiser'
    ],
    weak: [
      'Area',
      'Location',
      'Type',
      'Project'
    ],
    minScore: 4
  },

  // -------------------------------------------------------------------------
  // METADATA
  // Employee / supplier / support lists
  // -------------------------------------------------------------------------
  METADATA: {
    strong: [
      'EmployeeList',
      'SupplierName',
      'BranchName'
    ],
    medium: [
      'Employee ID',
      'Supplier ID',
      'Contact Info'
    ],
    weak: [
      'Employee',
      'Supplier',
      'Branch',
      'ID',
      'Name'
    ],
    minScore: 3
  }
}

// ============================================================================
// SHEET NAME HINTS
// ============================================================================
// Bonus points for matching expected sheet names

const SHEET_NAME_HINTS: Record<string, SheetCategory> = {
  'simulation': 'SIMULATION_STATUS',
  'toollist': 'IN_HOUSE_TOOLING',
  'tool list': 'IN_HOUSE_TOOLING',
  'stla-s': 'ROBOT_SPECS',
  'welding guns': 'REUSE_WELD_GUNS',
  'weld guns': 'REUSE_WELD_GUNS',
  'zaragoza allocation': 'GUN_FORCE',
  'raisers': 'REUSE_RISERS',
  'risers': 'REUSE_RISERS',
  'employees': 'METADATA',
  'suppliers': 'METADATA'
}

const SHEET_NAME_BONUS = 2

// ============================================================================
// SKIP PATTERNS
// ============================================================================
// Sheets to skip (Introduction, TOC, blank sheets, etc.)

const SKIP_SHEET_PATTERNS = [
  /^introduction$/i,
  /^intro$/i,
  /^toc$/i,
  /^table of contents$/i,
  /^contents$/i,
  /^index$/i,
  /^cover$/i,
  /^sheet\d+$/i,
  /^blank$/i,
  /^template$/i,
  /^instructions$/i
]

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Check if a sheet name should be skipped
 */
function shouldSkipSheet(sheetName: string): boolean {
  const normalized = sheetName.trim()

  for (const pattern of SKIP_SHEET_PATTERNS) {
    if (pattern.test(normalized)) {
      return true
    }
  }

  return false
}

/**
 * Normalize text for keyword matching (lowercase, trim, preserve original spacing)
 */
function normalizeText(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return ''
  }

  return String(text).toLowerCase().trim()
}

/**
 * Check if row text contains a keyword (case-insensitive, partial match)
 */
function containsKeyword(rowText: string[], keyword: string): boolean {
  const keywordLower = keyword.toLowerCase()

  for (const cellText of rowText) {
    if (cellText.includes(keywordLower)) {
      return true
    }
  }

  return false
}

/**
 * Calculate score for a category based on matched keywords
 */
function calculateCategoryScore(
  rowText: string[],
  category: Exclude<SheetCategory, 'UNKNOWN'>
): { score: number; matchedKeywords: string[] } {
  const keywords = CATEGORY_KEYWORDS[category]
  const matchedKeywords: string[] = []
  let score = 0

  // Check strong keywords (+3 each)
  for (const keyword of keywords.strong) {
    if (containsKeyword(rowText, keyword)) {
      score += 3
      matchedKeywords.push(keyword)
    }
  }

  // Check medium keywords (+2 each)
  for (const keyword of keywords.medium) {
    if (containsKeyword(rowText, keyword)) {
      score += 2
      matchedKeywords.push(keyword)
    }
  }

  // Check weak keywords (+1 each)
  for (const keyword of keywords.weak) {
    if (containsKeyword(rowText, keyword)) {
      score += 1
      matchedKeywords.push(keyword)
    }
  }

  return { score, matchedKeywords }
}

/**
 * Get sheet name bonus for matching expected sheet names
 */
function getSheetNameBonus(sheetName: string): { category: SheetCategory | null; bonus: number } {
  const normalized = normalizeText(sheetName)

  for (const [hint, category] of Object.entries(SHEET_NAME_HINTS)) {
    if (normalized === hint || normalized.includes(hint)) {
      return { category, bonus: SHEET_NAME_BONUS }
    }
  }

  return { category: null, bonus: 0 }
}

/**
 * Sniff a single sheet to detect its category.
 * 
 * Scans the first few rows (default: 10) looking for header keywords
 * that identify the sheet type.
 * 
 * @param workbook - The Excel workbook
 * @param sheetName - Name of the sheet to sniff
 * @param maxRowsToScan - Maximum rows to scan for headers (default: 10)
 * @returns SheetDetection with category, score, and matched keywords
 */
export function sniffSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  maxRowsToScan: number = 10
): SheetDetection {
  // Default result for unknown sheets
  const unknownResult: SheetDetection = {
    sheetName,
    category: 'UNKNOWN',
    score: 0,
    matchedKeywords: []
  }

  // Skip sheets that match skip patterns
  if (shouldSkipSheet(sheetName)) {
    return unknownResult
  }

  // Try to read the sheet
  let rows: CellValue[][]
  try {
    rows = sheetToMatrix(workbook, sheetName, maxRowsToScan)
  } catch {
    // Sheet is empty or invalid
    return unknownResult
  }

  if (rows.length === 0) {
    return unknownResult
  }

  // Flatten all rows to a single searchable text array
  const allRowText: string[] = []
  for (const row of rows) {
    if (row === null || row === undefined) {
      continue
    }

    for (const cell of row) {
      const normalized = normalizeText(cell as string)
      if (normalized.length > 0) {
        allRowText.push(normalized)
      }
    }
  }

  if (allRowText.length === 0) {
    return unknownResult
  }

  // Get sheet name bonus
  const sheetNameBonus = getSheetNameBonus(sheetName)

  // Score each category
  let bestCategory: SheetCategory = 'UNKNOWN'
  let bestScore = 0
  let bestMatchedKeywords: string[] = []

  const categories: Array<Exclude<SheetCategory, 'UNKNOWN'>> = [
    'SIMULATION_STATUS',
    'IN_HOUSE_TOOLING',
    'ROBOT_SPECS',
    'REUSE_WELD_GUNS',
    'GUN_FORCE',
    'REUSE_RISERS',
    'METADATA'
  ]

  for (const category of categories) {
    const { score, matchedKeywords } = calculateCategoryScore(allRowText, category)
    const minScore = CATEGORY_KEYWORDS[category].minScore

    // Add sheet name bonus if it matches this category
    let totalScore = score
    if (sheetNameBonus.category === category) {
      totalScore += sheetNameBonus.bonus
    }

    // Check if this category meets minimum threshold and beats the current best
    if (totalScore >= minScore && totalScore > bestScore) {
      bestCategory = category
      bestScore = totalScore
      bestMatchedKeywords = matchedKeywords
    }
  }

  return {
    sheetName,
    category: bestCategory,
    score: bestScore,
    matchedKeywords: bestMatchedKeywords
  }
}

/**
 * Scan an entire workbook to detect the best sheet for each category.
 * 
 * Returns:
 * - bestOverall: The single best detection across all sheets
 * - byCategory: Best detection for each category (useful for multi-file ingestion)
 * - allDetections: All non-UNKNOWN detections (for debugging/inspection)
 * 
 * @param workbook - The Excel workbook to scan
 * @param maxRowsToScan - Maximum rows to scan per sheet (default: 10)
 * @returns SheetScanResult with best detections
 */
export function scanWorkbook(
  workbook: XLSX.WorkBook,
  maxRowsToScan: number = 10
): SheetScanResult {
  const allDetections: SheetDetection[] = []

  // Initialize byCategory with nulls
  const byCategory: Record<SheetCategory, SheetDetection | null> = {
    SIMULATION_STATUS: null,
    IN_HOUSE_TOOLING: null,
    ROBOT_SPECS: null,
    REUSE_WELD_GUNS: null,
    GUN_FORCE: null,
    REUSE_RISERS: null,
    METADATA: null,
    UNKNOWN: null
  }

  let bestOverall: SheetDetection | null = null

  // Scan each sheet
  for (const sheetName of workbook.SheetNames) {
    const detection = sniffSheet(workbook, sheetName, maxRowsToScan)

    // Skip UNKNOWN detections for best tracking
    if (detection.category === 'UNKNOWN') {
      continue
    }

    allDetections.push(detection)

    // Update best for this category
    const currentBest = byCategory[detection.category]
    if (currentBest === null || detection.score > currentBest.score) {
      byCategory[detection.category] = detection
    }

    // Update best overall
    if (bestOverall === null || detection.score > bestOverall.score) {
      bestOverall = detection
    }
  }

  return {
    bestOverall,
    byCategory,
    allDetections
  }
}

/**
 * Get the best sheet name for a specific category in a workbook.
 * 
 * Convenience function that returns just the sheet name (or null).
 * 
 * @param workbook - The Excel workbook
 * @param category - The category to find
 * @returns Sheet name if found, null otherwise
 */
export function findSheetForCategory(
  workbook: XLSX.WorkBook,
  category: Exclude<SheetCategory, 'UNKNOWN'>
): string | null {
  const result = scanWorkbook(workbook)
  const detection = result.byCategory[category]

  if (detection === null) {
    return null
  }

  return detection.sheetName
}

/**
 * Detect the primary category of a workbook based on its best sheet.
 * 
 * Useful for routing workbooks to appropriate parsers.
 * 
 * @param workbook - The Excel workbook
 * @returns The primary category or 'UNKNOWN'
 */
export function detectWorkbookCategory(workbook: XLSX.WorkBook): SheetCategory {
  const result = scanWorkbook(workbook)

  if (result.bestOverall === null) {
    return 'UNKNOWN'
  }

  return result.bestOverall.category
}

/**
 * Map SheetCategory to the internal FileKind used by ingestionCoordinator.
 * 
 * This bridges the new sniffer with the existing parser routing.
 */
export type FileKind = 'SimulationStatus' | 'RobotList' | 'ToolList' | 'Metadata' | 'Unknown'

export function categoryToFileKind(category: SheetCategory): FileKind {
  switch (category) {
    case 'SIMULATION_STATUS':
      return 'SimulationStatus'
    case 'IN_HOUSE_TOOLING':
      return 'ToolList'
    case 'ROBOT_SPECS':
      return 'RobotList'
    case 'REUSE_WELD_GUNS':
      return 'ToolList'
    case 'GUN_FORCE':
      return 'ToolList'
    case 'REUSE_RISERS':
      return 'ToolList'
    case 'METADATA':
      return 'Metadata'
    case 'UNKNOWN':
      return 'Unknown'
  }
}
