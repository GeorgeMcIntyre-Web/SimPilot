// Column Profiler
// Analyzes individual columns to extract statistical profiles for field matching.
// Provides data type distribution, sample values, and header tokenization.

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw column context from a sheet.
 * Contains the header and all cell values for a single column.
 */
export interface RawColumnContext {
  workbookId: string
  sheetName: string
  columnIndex: number
  headerRaw: string
  cellValues: unknown[]
}

/**
 * Data type distribution for a column.
 * Ratios sum to approximately 1.0 (accounting for rounding).
 */
export interface DataTypeDistribution {
  stringRatio: number
  numberRatio: number
  integerRatio: number
  dateRatio: number
  booleanRatio: number
  emptyRatio: number
}

/**
 * Complete profile for a single column.
 * Contains all metadata needed for field matching.
 */
export interface ColumnProfile {
  workbookId: string
  sheetName: string
  columnIndex: number
  headerRaw: string
  headerNormalized: string
  headerTokens: string[]
  nonEmptyCount: number
  totalCount: number
  sampleValues: string[]
  dataTypeDistribution: DataTypeDistribution
  distinctCountEstimate: number
  dominantType: 'string' | 'number' | 'date' | 'boolean' | 'empty' | 'mixed'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a value is empty (null, undefined, or empty string).
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string' && value.trim() === '') {
    return true
  }

  return false
}

/**
 * Check if a value looks like a number.
 */
function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number') {
    return !isNaN(value)
  }

  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()

  if (trimmed === '') {
    return false
  }

  // Handle common numeric formats
  const numericPattern = /^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/
  return numericPattern.test(trimmed)
}

/**
 * Check if a numeric value is an integer.
 */
function isIntegerValue(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isInteger(value)
  }

  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()
  const intPattern = /^[-+]?\d+$/
  return intPattern.test(trimmed)
}

/**
 * Check if a value looks like a date.
 */
function isDateValue(value: unknown): boolean {
  if (value instanceof Date) {
    return true
  }

  // Note: We don't treat plain numbers as Excel serial dates here
  // because small integers (1-100) are commonly used as percentages, quantities, etc.
  // Excel serial dates typically start from 25569 (1970-01-01) for modern dates.
  // If needed, use context from header to determine if a column contains dates.

  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()

  if (trimmed === '') {
    return false
  }

  // Common date patterns
  const datePatterns = [
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,       // YYYY-MM-DD or YYYY/MM/DD
    /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,       // DD-MM-YYYY or DD/MM/YYYY
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/,       // DD-MM-YY or DD/MM/YY
    /^\d{4}\.\d{1,2}\.\d{1,2}$/,           // YYYY.MM.DD
    /^\d{1,2}\.\d{1,2}\.\d{4}$/            // DD.MM.YYYY
  ]

  return datePatterns.some(pattern => pattern.test(trimmed))
}

/**
 * Check if a value looks like a boolean.
 */
function isBooleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return true
  }

  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim().toLowerCase()
  const booleanValues = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0', 'x', '✓', '✗']

  return booleanValues.includes(trimmed)
}

/**
 * Normalize a header string for comparison.
 * Converts to lowercase, trims, and collapses whitespace.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ')
}

/**
 * Tokenize a header string into individual tokens.
 * Handles spaces, underscores, camelCase, and other separators.
 */
export function tokenizeHeader(header: string): string[] {
  if (header === null || header === undefined || header.trim() === '') {
    return []
  }

  // Step 1: Normalize and remove parentheses content
  let normalized = header.trim()
  normalized = normalized.replace(/\([^)]*\)/g, ' ')  // Remove (kN), (N), etc.
  normalized = normalized.replace(/\[[^\]]*\]/g, ' ') // Remove [N], [kN], etc.

  // Step 2: Split on common separators (spaces, underscores, hyphens)
  const separatorSplit = normalized.split(/[\s_\-/\\|]+/)

  // Step 3: Handle camelCase and PascalCase
  const tokens: string[] = []

  for (const segment of separatorSplit) {
    if (segment === '') {
      continue
    }

    // Check if segment is all uppercase (like "ROBOT", "STATION")
    const isAllUppercase = segment === segment.toUpperCase() && /[A-Z]/.test(segment)

    if (isAllUppercase) {
      // Don't split all-uppercase words
      const cleaned = segment.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (cleaned.length > 0) {
        tokens.push(cleaned)
      }
      continue
    }

    // Split camelCase/PascalCase: "gunForce" -> ["gun", "Force"], "GunForce" -> ["Gun", "Force"]
    const camelSplit = segment.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)

    for (const token of camelSplit) {
      const cleaned = token.toLowerCase().replace(/[^a-z0-9]/g, '')

      if (cleaned.length === 0) {
        continue
      }

      tokens.push(cleaned)
    }
  }

  return tokens
}

/**
 * Convert a cell value to a string for sampling.
 */
function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }

  return String(value)
}

/**
 * Determine the dominant data type based on distribution.
 */
function determineDominantType(
  distribution: DataTypeDistribution
): 'string' | 'number' | 'date' | 'boolean' | 'empty' | 'mixed' {
  const { stringRatio, numberRatio, dateRatio, booleanRatio, emptyRatio } = distribution

  // If mostly empty, return empty
  if (emptyRatio > 0.8) {
    return 'empty'
  }

  // Calculate non-empty ratios
  const nonEmptyFactor = 1 - emptyRatio

  if (nonEmptyFactor === 0) {
    return 'empty'
  }

  const adjustedString = stringRatio / nonEmptyFactor
  const adjustedNumber = numberRatio / nonEmptyFactor
  const adjustedDate = dateRatio / nonEmptyFactor
  const adjustedBoolean = booleanRatio / nonEmptyFactor

  // Check for dominant type (>60% of non-empty values)
  const threshold = 0.6

  if (adjustedNumber > threshold) {
    return 'number'
  }

  if (adjustedDate > threshold) {
    return 'date'
  }

  if (adjustedBoolean > threshold) {
    return 'boolean'
  }

  if (adjustedString > threshold) {
    return 'string'
  }

  return 'mixed'
}

// ============================================================================
// MAIN PROFILING FUNCTION
// ============================================================================

/**
 * Profile a single column from raw data.
 * Extracts header tokens, data type distribution, sample values, and distinct count.
 *
 * @param rawColumn - The raw column context to profile
 * @param maxSamples - Maximum number of sample values to collect (default: 5)
 * @returns Complete column profile
 */
export function profileColumn(rawColumn: RawColumnContext, maxSamples: number = 5): ColumnProfile {
  const { workbookId, sheetName, columnIndex, headerRaw, cellValues } = rawColumn

  // Normalize and tokenize header
  const headerNormalized = normalizeHeader(headerRaw)
  const headerTokens = tokenizeHeader(headerRaw)

  // Initialize counters
  let emptyCount = 0
  let stringCount = 0
  let numberCount = 0
  let integerCount = 0
  let dateCount = 0
  let booleanCount = 0

  const distinctValues = new Set<string>()
  const sampleValues: string[] = []
  const totalCount = cellValues.length

  // Process each cell value
  for (const value of cellValues) {
    // Check for empty
    if (isEmpty(value)) {
      emptyCount++
      continue
    }

    // Track distinct values
    const stringVal = valueToString(value)
    distinctValues.add(stringVal)

    // Collect samples
    if (sampleValues.length < maxSamples && stringVal.length > 0) {
      // Avoid duplicates in samples
      if (sampleValues.includes(stringVal) === false) {
        sampleValues.push(stringVal)
      }
    }

    // Determine data type (order matters - more specific first)
    if (isBooleanValue(value)) {
      booleanCount++
      continue
    }

    if (isDateValue(value)) {
      dateCount++
      continue
    }

    if (isIntegerValue(value)) {
      integerCount++
      numberCount++
      continue
    }

    if (isNumericValue(value)) {
      numberCount++
      continue
    }

    // Default to string
    stringCount++
  }

  // Calculate ratios
  const nonEmptyCount = totalCount - emptyCount
  const divisor = totalCount > 0 ? totalCount : 1

  const dataTypeDistribution: DataTypeDistribution = {
    stringRatio: stringCount / divisor,
    numberRatio: numberCount / divisor,
    integerRatio: integerCount / divisor,
    dateRatio: dateCount / divisor,
    booleanRatio: booleanCount / divisor,
    emptyRatio: emptyCount / divisor
  }

  // Determine dominant type
  const dominantType = determineDominantType(dataTypeDistribution)

  return {
    workbookId,
    sheetName,
    columnIndex,
    headerRaw,
    headerNormalized,
    headerTokens,
    nonEmptyCount,
    totalCount,
    sampleValues,
    dataTypeDistribution,
    distinctCountEstimate: distinctValues.size,
    dominantType
  }
}

/**
 * Profile multiple columns from a sheet.
 *
 * @param rawColumns - Array of raw column contexts
 * @param maxSamples - Maximum number of sample values per column
 * @returns Array of column profiles
 */
export function profileColumns(
  rawColumns: RawColumnContext[],
  maxSamples: number = 5
): ColumnProfile[] {
  return rawColumns.map(rawColumn => profileColumn(rawColumn, maxSamples))
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a column profile suggests numeric data.
 */
export function isNumericColumn(profile: ColumnProfile): boolean {
  const { dataTypeDistribution } = profile
  const numericRatio = dataTypeDistribution.numberRatio + dataTypeDistribution.integerRatio

  // Consider numeric if >50% of non-empty values are numeric
  const nonEmptyRatio = 1 - dataTypeDistribution.emptyRatio

  if (nonEmptyRatio === 0) {
    return false
  }

  return numericRatio / nonEmptyRatio > 0.5
}

/**
 * Check if a column profile suggests mostly integer values.
 */
export function isIntegerColumn(profile: ColumnProfile): boolean {
  const { dataTypeDistribution } = profile
  const nonEmptyRatio = 1 - dataTypeDistribution.emptyRatio

  if (nonEmptyRatio === 0) {
    return false
  }

  return dataTypeDistribution.integerRatio / nonEmptyRatio > 0.5
}

/**
 * Check if a column profile suggests date data.
 */
export function isDateColumn(profile: ColumnProfile): boolean {
  const { dataTypeDistribution } = profile
  const nonEmptyRatio = 1 - dataTypeDistribution.emptyRatio

  if (nonEmptyRatio === 0) {
    return false
  }

  return dataTypeDistribution.dateRatio / nonEmptyRatio > 0.5
}

/**
 * Check if a column profile suggests mostly empty data.
 */
export function isMostlyEmptyColumn(profile: ColumnProfile, threshold: number = 0.8): boolean {
  return profile.dataTypeDistribution.emptyRatio > threshold
}

/**
 * Get the fill rate (non-empty ratio) for a column.
 */
export function getColumnFillRate(profile: ColumnProfile): number {
  return 1 - profile.dataTypeDistribution.emptyRatio
}

/**
 * Get the cardinality estimate (distinct value ratio) for a column.
 */
export function getColumnCardinality(profile: ColumnProfile): number {
  if (profile.nonEmptyCount === 0) {
    return 0
  }

  return profile.distinctCountEstimate / profile.nonEmptyCount
}

/**
 * Check if a column likely contains identifier values (high cardinality).
 */
export function isLikelyIdentifierColumn(profile: ColumnProfile): boolean {
  // High cardinality + mostly strings + good fill rate
  const cardinality = getColumnCardinality(profile)
  const fillRate = getColumnFillRate(profile)
  const isString = profile.dominantType === 'string' || profile.dominantType === 'mixed'

  return cardinality > 0.7 && fillRate > 0.5 && isString
}

/**
 * Check if a column likely contains status/category values (low cardinality).
 */
export function isLikelyCategoryColumn(profile: ColumnProfile): boolean {
  // Low cardinality + decent fill rate
  const cardinality = getColumnCardinality(profile)
  const fillRate = getColumnFillRate(profile)

  return cardinality < 0.3 && fillRate > 0.3 && profile.distinctCountEstimate > 1
}
