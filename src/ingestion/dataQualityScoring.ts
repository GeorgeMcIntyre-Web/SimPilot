// Data Quality Scoring
// Provides interpretable quality scores per sheet and overall ingestion
// Helps Dale understand data health at a glance

import { FieldMatchResult, ColumnProfile } from './fieldMatcher'
import { SheetCategory } from './sheetSniffer'
import { SheetSchemaAnalysis } from './columnRoleDetector'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Quality score for a single sheet
 */
export interface SheetQualityScore {
  workbookId: string
  sheetName: string
  sheetCategory: SheetCategory
  
  /**
   * Overall quality score (0-1)
   * 1.0 = perfect quality
   * 0.0 = very poor quality
   */
  quality: number
  
  /**
   * Quality tier for quick assessment
   */
  tier: QualityTier
  
  /**
   * Human-readable reasons for the score
   */
  reasons: string[]
  
  /**
   * Detailed metrics breakdown
   */
  metrics: QualityMetrics
}

/**
 * Quality tier for quick visual indication
 */
export type QualityTier = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'

/**
 * Detailed quality metrics
 */
export interface QualityMetrics {
  /**
   * Ratio of empty/null cells (0-1)
   * Lower is better
   */
  emptyRatio: number
  
  /**
   * Ratio of columns with unknown/unmatched field type (0-1)
   * Lower is better
   */
  unknownColumnRatio: number
  
  /**
   * Average confidence across matched columns (0-1)
   * Higher is better
   */
  averageConfidence: number
  
  /**
   * Ratio of columns with high confidence matches (0-1)
   * Higher is better
   */
  highConfidenceRatio: number
  
  /**
   * Ratio of required fields that are present (0-1)
   * Higher is better
   */
  requiredFieldsCoverage: number
  
  /**
   * Data consistency score (0-1)
   * Based on type consistency, format uniformity
   */
  consistencyScore: number
  
  /**
   * Number of data rows detected
   */
  rowCount: number
  
  /**
   * Number of columns detected
   */
  columnCount: number
}

/**
 * Overall ingestion quality result
 */
export interface IngestionQualityResult {
  /**
   * Overall quality score (0-1)
   */
  overallQuality: number
  
  /**
   * Overall quality tier
   */
  overallTier: QualityTier
  
  /**
   * Summary message
   */
  summary: string
  
  /**
   * Quality scores per sheet
   */
  sheetScores: SheetQualityScore[]
  
  /**
   * Top issues to address
   */
  topIssues: QualityIssue[]
  
  /**
   * Recommendations for improvement
   */
  recommendations: string[]
}

/**
 * A specific quality issue identified
 */
export interface QualityIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  location: string  // e.g., "Sheet: SIMULATION, Column: Robot ID"
  issue: string
  suggestion: string
}

// ============================================================================
// SCORING CONFIGURATION
// ============================================================================

/**
 * Weights for different quality factors
 */
const QUALITY_WEIGHTS = {
  emptyRatio: 0.15,           // Penalize empty cells
  unknownColumnRatio: 0.25,   // Penalize unmatched columns
  averageConfidence: 0.25,    // Reward high confidence matches
  highConfidenceRatio: 0.15,  // Bonus for many high-confidence matches
  requiredFieldsCoverage: 0.10, // Reward required field presence
  consistencyScore: 0.10      // Reward consistent data
}

/**
 * Thresholds for quality tiers
 */
const TIER_THRESHOLDS = {
  EXCELLENT: 0.85,
  GOOD: 0.70,
  FAIR: 0.50,
  POOR: 0.30
  // Below POOR = CRITICAL
}

/**
 * Required fields for different sheet categories
 */
const REQUIRED_FIELDS_BY_CATEGORY: Record<SheetCategory, string[]> = {
  SIMULATION_STATUS: ['ROBOT_ID', 'STATION', 'AREA'],
  ROBOT_SPECS: ['ROBOT_ID', 'ROBOT_TYPE'],
  IN_HOUSE_TOOLING: ['TOOL_ID', 'STATION'],
  REUSE_WELD_GUNS: ['GUN_NUMBER', 'DEVICE_NAME'],
  REUSE_RISERS: ['HEIGHT', 'STATION'],
  REUSE_TIP_DRESSERS: ['TOOL_ID'],
  REUSE_ROBOTS: ['ROBOT_ID'],
  GUN_FORCE: ['GUN_NUMBER', 'GUN_FORCE'],
  METADATA: [],
  UNKNOWN: []
}

// ============================================================================
// MAIN SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate quality score for a sheet
 */
export function calculateSheetQuality(input: {
  workbookId: string
  sheetName: string
  sheetCategory: SheetCategory
  matches: FieldMatchResult[]
  schema?: SheetSchemaAnalysis
  columnProfiles?: ColumnProfile[]
  rowCount: number
}): SheetQualityScore {
  const { workbookId, sheetName, sheetCategory, matches, schema, columnProfiles, rowCount } = input
  
  const reasons: string[] = []
  
  // Calculate metrics
  const metrics = calculateMetrics({
    matches,
    schema,
    columnProfiles,
    sheetCategory,
    rowCount
  })
  
  // Calculate weighted quality score
  let quality = 0
  
  // Empty ratio (lower is better, so invert)
  const emptyScore = 1 - metrics.emptyRatio
  quality += emptyScore * QUALITY_WEIGHTS.emptyRatio
  
  if (metrics.emptyRatio > 0.3) {
    reasons.push(`High empty cell ratio: ${(metrics.emptyRatio * 100).toFixed(1)}%`)
  }
  
  // Unknown column ratio (lower is better, so invert)
  const unknownScore = 1 - metrics.unknownColumnRatio
  quality += unknownScore * QUALITY_WEIGHTS.unknownColumnRatio
  
  if (metrics.unknownColumnRatio > 0.3) {
    reasons.push(`Many unrecognized columns: ${(metrics.unknownColumnRatio * 100).toFixed(1)}%`)
  }
  
  // Average confidence (higher is better)
  quality += metrics.averageConfidence * QUALITY_WEIGHTS.averageConfidence
  
  if (metrics.averageConfidence < 0.5) {
    reasons.push(`Low average match confidence: ${(metrics.averageConfidence * 100).toFixed(1)}%`)
  }
  
  // High confidence ratio (higher is better)
  quality += metrics.highConfidenceRatio * QUALITY_WEIGHTS.highConfidenceRatio
  
  // Required fields coverage (higher is better)
  quality += metrics.requiredFieldsCoverage * QUALITY_WEIGHTS.requiredFieldsCoverage
  
  if (metrics.requiredFieldsCoverage < 1.0) {
    const missingCount = Math.round((1 - metrics.requiredFieldsCoverage) * REQUIRED_FIELDS_BY_CATEGORY[sheetCategory].length)
    reasons.push(`Missing ${missingCount} required field(s)`)
  }
  
  // Consistency score (higher is better)
  quality += metrics.consistencyScore * QUALITY_WEIGHTS.consistencyScore
  
  if (metrics.consistencyScore < 0.7) {
    reasons.push('Inconsistent data formats detected')
  }
  
  // Clamp to [0, 1]
  quality = Math.max(0, Math.min(1, quality))
  
  // Determine tier
  const tier = qualityToTier(quality)
  
  // Add positive reasons if quality is good
  if (reasons.length === 0) {
    if (quality >= 0.85) {
      reasons.push('Excellent data quality - all checks passed')
    } else if (quality >= 0.70) {
      reasons.push('Good data quality with minor issues')
    }
  }
  
  return {
    workbookId,
    sheetName,
    sheetCategory,
    quality,
    tier,
    reasons,
    metrics
  }
}

/**
 * Calculate detailed metrics for a sheet
 */
function calculateMetrics(input: {
  matches: FieldMatchResult[]
  schema?: SheetSchemaAnalysis
  columnProfiles?: ColumnProfile[]
  sheetCategory: SheetCategory
  rowCount: number
}): QualityMetrics {
  const { matches, schema, columnProfiles, sheetCategory, rowCount } = input
  
  // Empty ratio
  let emptyRatio = 0
  if (columnProfiles !== undefined && columnProfiles.length > 0) {
    const totalEmptyRatio = columnProfiles.reduce((sum, p) => sum + p.emptyRatio, 0)
    emptyRatio = totalEmptyRatio / columnProfiles.length
  }
  
  // Unknown column ratio
  const unknownCount = matches.filter(m => m.matchedField === null).length
  const unknownColumnRatio = matches.length > 0 ? unknownCount / matches.length : 0
  
  // Average confidence
  const totalConfidence = matches.reduce((sum, m) => sum + m.confidence, 0)
  const averageConfidence = matches.length > 0 ? totalConfidence / matches.length : 0
  
  // High confidence ratio (confidence >= 0.7)
  const highConfidenceCount = matches.filter(m => m.confidence >= 0.7).length
  const highConfidenceRatio = matches.length > 0 ? highConfidenceCount / matches.length : 0
  
  // Required fields coverage
  const requiredFields = REQUIRED_FIELDS_BY_CATEGORY[sheetCategory]
  let requiredFieldsCoverage = 1.0
  
  if (requiredFields.length > 0) {
    const matchedRoles = new Set(matches.map(m => m.matchedField?.role).filter(Boolean))
    const foundRequired = requiredFields.filter(role => matchedRoles.has(role as never)).length
    requiredFieldsCoverage = foundRequired / requiredFields.length
  }
  
  // Consistency score based on schema
  let consistencyScore = 0.8  // Default
  if (schema !== undefined) {
    // Higher coverage = more consistent
    consistencyScore = schema.coverage.percentage / 100
  }
  
  // Column count
  const columnCount = schema?.coverage.total ?? matches.length
  
  return {
    emptyRatio,
    unknownColumnRatio,
    averageConfidence,
    highConfidenceRatio,
    requiredFieldsCoverage,
    consistencyScore,
    rowCount,
    columnCount
  }
}

/**
 * Convert quality score to tier
 */
export function qualityToTier(quality: number): QualityTier {
  if (quality >= TIER_THRESHOLDS.EXCELLENT) {
    return 'EXCELLENT'
  }
  
  if (quality >= TIER_THRESHOLDS.GOOD) {
    return 'GOOD'
  }
  
  if (quality >= TIER_THRESHOLDS.FAIR) {
    return 'FAIR'
  }
  
  if (quality >= TIER_THRESHOLDS.POOR) {
    return 'POOR'
  }
  
  return 'CRITICAL'
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Calculate overall ingestion quality from sheet scores
 */
export function calculateIngestionQuality(
  sheetScores: SheetQualityScore[]
): IngestionQualityResult {
  if (sheetScores.length === 0) {
    return {
      overallQuality: 0,
      overallTier: 'CRITICAL',
      summary: 'No sheets analyzed',
      sheetScores: [],
      topIssues: [],
      recommendations: ['Load data to begin quality assessment']
    }
  }
  
  // Calculate weighted average (weight by row count)
  let totalWeight = 0
  let weightedSum = 0
  
  for (const score of sheetScores) {
    const weight = Math.max(1, score.metrics.rowCount)
    weightedSum += score.quality * weight
    totalWeight += weight
  }
  
  const overallQuality = weightedSum / totalWeight
  const overallTier = qualityToTier(overallQuality)
  
  // Collect issues
  const topIssues: QualityIssue[] = []
  
  for (const score of sheetScores) {
    if (score.tier === 'CRITICAL' || score.tier === 'POOR') {
      topIssues.push({
        severity: 'HIGH',
        location: `Sheet: ${score.sheetName}`,
        issue: `Quality score: ${(score.quality * 100).toFixed(0)}% (${score.tier})`,
        suggestion: score.reasons[0] ?? 'Review sheet data'
      })
    }
    
    // Add specific issues from metrics
    if (score.metrics.unknownColumnRatio > 0.5) {
      topIssues.push({
        severity: 'HIGH',
        location: `Sheet: ${score.sheetName}`,
        issue: `${(score.metrics.unknownColumnRatio * 100).toFixed(0)}% of columns unrecognized`,
        suggestion: 'Add column mappings or check header format'
      })
    }
    
    if (score.metrics.emptyRatio > 0.5) {
      topIssues.push({
        severity: 'MEDIUM',
        location: `Sheet: ${score.sheetName}`,
        issue: `${(score.metrics.emptyRatio * 100).toFixed(0)}% empty cells`,
        suggestion: 'Check for data loading issues or incomplete data'
      })
    }
    
    if (score.metrics.requiredFieldsCoverage < 1.0) {
      topIssues.push({
        severity: 'MEDIUM',
        location: `Sheet: ${score.sheetName}`,
        issue: 'Missing required fields',
        suggestion: 'Verify column headers match expected format'
      })
    }
  }
  
  // Sort by severity
  topIssues.sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
  
  // Generate recommendations
  const recommendations = generateRecommendations(sheetScores, topIssues)
  
  // Generate summary
  const summary = generateSummary(overallQuality, overallTier, sheetScores.length)
  
  return {
    overallQuality,
    overallTier,
    summary,
    sheetScores,
    topIssues: topIssues.slice(0, 5),  // Top 5 issues
    recommendations
  }
}

/**
 * Generate recommendations based on quality analysis
 */
function generateRecommendations(
  scores: SheetQualityScore[],
  _issues: QualityIssue[]
): string[] {
  const recommendations: string[] = []
  
  // Check for low-quality sheets
  const poorSheets = scores.filter(s => s.tier === 'POOR' || s.tier === 'CRITICAL')
  if (poorSheets.length > 0) {
    recommendations.push(
      `Review ${poorSheets.length} sheet(s) with poor quality: ${poorSheets.map(s => s.sheetName).join(', ')}`
    )
  }
  
  // Check for high unknown column ratio
  const highUnknown = scores.filter(s => s.metrics.unknownColumnRatio > 0.3)
  if (highUnknown.length > 0) {
    recommendations.push(
      'Consider adding custom column mappings for frequently unrecognized headers'
    )
  }
  
  // Check for empty data
  const highEmpty = scores.filter(s => s.metrics.emptyRatio > 0.3)
  if (highEmpty.length > 0) {
    recommendations.push(
      'Check source files for missing or incomplete data in highlighted sheets'
    )
  }
  
  // Check for low confidence
  const lowConfidence = scores.filter(s => s.metrics.averageConfidence < 0.5)
  if (lowConfidence.length > 0) {
    recommendations.push(
      'Enable semantic embeddings or LLM assistance for improved column matching'
    )
  }
  
  // Default recommendation if quality is good
  if (recommendations.length === 0) {
    recommendations.push('Data quality is acceptable - proceed with ingestion')
  }
  
  return recommendations
}

/**
 * Generate a summary message
 */
function generateSummary(quality: number, tier: QualityTier, sheetCount: number): string {
  const qualityPercent = (quality * 100).toFixed(0)
  
  switch (tier) {
    case 'EXCELLENT':
      return `Excellent data quality (${qualityPercent}%) across ${sheetCount} sheet(s)`
    case 'GOOD':
      return `Good data quality (${qualityPercent}%) with minor issues in ${sheetCount} sheet(s)`
    case 'FAIR':
      return `Fair data quality (${qualityPercent}%) - some sheets need attention`
    case 'POOR':
      return `Poor data quality (${qualityPercent}%) - review recommended before proceeding`
    case 'CRITICAL':
      return `Critical quality issues (${qualityPercent}%) - immediate attention required`
    default:
      return `Data quality: ${qualityPercent}% across ${sheetCount} sheet(s)`
  }
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get color class for quality tier
 */
export function getTierColorClass(tier: QualityTier): string {
  switch (tier) {
    case 'EXCELLENT':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'GOOD':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'FAIR':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'POOR':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

/**
 * Get icon name for quality tier
 */
export function getTierIcon(tier: QualityTier): 'check-circle' | 'info' | 'alert-triangle' | 'x-circle' {
  switch (tier) {
    case 'EXCELLENT':
    case 'GOOD':
      return 'check-circle'
    case 'FAIR':
      return 'info'
    case 'POOR':
      return 'alert-triangle'
    case 'CRITICAL':
      return 'x-circle'
    default:
      return 'info'
  }
}

/**
 * Get severity color class
 */
export function getSeverityColorClass(severity: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  switch (severity) {
    case 'HIGH':
      return 'text-red-600 dark:text-red-400'
    case 'MEDIUM':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'LOW':
      return 'text-blue-600 dark:text-blue-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}
