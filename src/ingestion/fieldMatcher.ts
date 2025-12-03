// Field Matcher
// Enhanced column→field matching with optional embedding support
// Builds on columnRoleDetector with semantic matching capabilities

import {
  ColumnRole,
  MatchConfidence,
  detectColumnRole,
  getRoleDisplayName
} from './columnRoleDetector'
import {
  EmbeddingProvider,
  EmbeddingCache,
  InMemoryEmbeddingCache,
  cosineSimilarity,
  normalizeSimilarity,
  buildColumnDescription
} from './embeddingTypes'
import { getFeatureFlag } from '../config/featureFlags'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Unique identifier for a field in the registry
 */
export type FieldId = string

/**
 * Field descriptor with semantic information for matching
 */
export interface FieldDescriptor {
  id: FieldId
  name: string
  role: ColumnRole
  
  /**
   * A short description of the field's semantic meaning.
   * Used for embedding-based matching.
   */
  semanticDescription: string
  
  /**
   * Alternative names/headers that map to this field
   */
  aliases: string[]
  
  /**
   * Expected data type
   */
  expectedType: 'string' | 'number' | 'date' | 'boolean' | 'any'
  
  /**
   * Is this field required for valid records
   */
  required: boolean
  
  /**
   * Priority when multiple columns could match (higher = preferred)
   */
  priority: number
}

/**
 * Column profile with statistical information
 */
export interface ColumnProfile {
  columnIndex: number
  header: string
  normalizedHeader: string
  
  /**
   * Detected types in the column data
   */
  detectedTypes: string[]
  
  /**
   * Sample values from the column
   */
  sampleValues: string[]
  
  /**
   * Ratio of empty/null values
   */
  emptyRatio: number
  
  /**
   * Ratio of unique values
   */
  uniqueRatio: number
  
  /**
   * Sheet category context
   */
  sheetCategory?: string
}

/**
 * Result of matching a column to a field
 */
export interface FieldMatchResult {
  columnIndex: number
  header: string
  
  /**
   * Best matched field, or null if no match
   */
  matchedField: FieldDescriptor | null
  
  /**
   * Overall confidence score (0-1)
   */
  confidence: number
  
  /**
   * Confidence level
   */
  confidenceLevel: MatchConfidence
  
  /**
   * Score from pattern-based matching (0-1)
   */
  patternScore: number
  
  /**
   * Score from embedding-based matching (0-1), if available
   */
  embeddingScore?: number
  
  /**
   * Whether embedding was used in this match
   */
  usedEmbedding: boolean
  
  /**
   * Explanation of the match
   */
  explanation: string
  
  /**
   * Alternative matches considered
   */
  alternatives: Array<{
    field: FieldDescriptor
    confidence: number
  }>
}

// ============================================================================
// FIELD REGISTRY
// ============================================================================

/**
 * Default field descriptors for SimPilot domain
 */
export const DEFAULT_FIELD_REGISTRY: FieldDescriptor[] = [
  // Identity fields
  {
    id: 'robot_id',
    name: 'Robot ID',
    role: 'ROBOT_ID',
    semanticDescription: 'Unique identifier for a robot, typically a number or code like R1, Robot-001',
    aliases: ['robotnumber', 'robot number', 'robot id', 'robot name', 'robot #'],
    expectedType: 'string',
    required: true,
    priority: 10
  },
  {
    id: 'tool_id',
    name: 'Tool ID',
    role: 'TOOL_ID',
    semanticDescription: 'Unique identifier for a tool or piece of equipment',
    aliases: ['tool id', 'tool name', 'tool number', 'tool #', 'equipment id'],
    expectedType: 'string',
    required: true,
    priority: 10
  },
  {
    id: 'gun_number',
    name: 'Gun Number',
    role: 'GUN_NUMBER',
    semanticDescription: 'Identifier for a welding gun or weld gun device',
    aliases: ['gun number', 'gun no', 'gun id', 'gun #', 'wg number', 'welding gun'],
    expectedType: 'string',
    required: false,
    priority: 9
  },
  {
    id: 'device_name',
    name: 'Device Name',
    role: 'DEVICE_NAME',
    semanticDescription: 'Name or identifier for a device or asset',
    aliases: ['device name', 'device id', 'asset description', 'equipment name'],
    expectedType: 'string',
    required: false,
    priority: 8
  },
  {
    id: 'serial_number',
    name: 'Serial Number',
    role: 'SERIAL_NUMBER',
    semanticDescription: 'Manufacturer serial number for tracking physical equipment',
    aliases: ['serial number', 'serial no', 'serial #', 's/n'],
    expectedType: 'string',
    required: false,
    priority: 7
  },

  // Location fields
  {
    id: 'area',
    name: 'Area',
    role: 'AREA',
    semanticDescription: 'Manufacturing area or zone name in the factory',
    aliases: ['area', 'area name', 'area code'],
    expectedType: 'string',
    required: false,
    priority: 8
  },
  {
    id: 'station',
    name: 'Station',
    role: 'STATION',
    semanticDescription: 'Work station or position on the assembly line',
    aliases: ['station', 'station number', 'station code', 'station no', 'station #'],
    expectedType: 'string',
    required: false,
    priority: 8
  },
  {
    id: 'line_code',
    name: 'Assembly Line',
    role: 'LINE_CODE',
    semanticDescription: 'Assembly line identifier or code',
    aliases: ['assembly line', 'line code', 'line', 'production line'],
    expectedType: 'string',
    required: false,
    priority: 7
  },
  {
    id: 'zone',
    name: 'Zone',
    role: 'ZONE',
    semanticDescription: 'Zone or location within an area',
    aliases: ['zone', 'location', 'position'],
    expectedType: 'string',
    required: false,
    priority: 5
  },
  {
    id: 'cell',
    name: 'Cell',
    role: 'CELL',
    semanticDescription: 'Manufacturing cell identifier',
    aliases: ['cell', 'cell code', 'cell name'],
    expectedType: 'string',
    required: false,
    priority: 6
  },

  // Status fields
  {
    id: 'reuse_status',
    name: 'Reuse Status',
    role: 'REUSE_STATUS',
    semanticDescription: 'Status indicating if equipment is reused, refurbished, or new',
    aliases: ['reuse status', 'reuse', 'refresment ok', 'refreshment ok', 'carry over'],
    expectedType: 'string',
    required: false,
    priority: 7
  },
  {
    id: 'sourcing',
    name: 'Sourcing',
    role: 'SOURCING',
    semanticDescription: 'How the equipment is being sourced or procured',
    aliases: ['sourcing', 'supply', 'source', 'procurement'],
    expectedType: 'string',
    required: false,
    priority: 6
  },
  {
    id: 'project',
    name: 'Project',
    role: 'PROJECT',
    semanticDescription: 'Project name or identifier',
    aliases: ['project', 'project name', 'proyect', 'program'],
    expectedType: 'string',
    required: false,
    priority: 7
  },

  // Technical fields
  {
    id: 'gun_force',
    name: 'Gun Force',
    role: 'GUN_FORCE',
    semanticDescription: 'Force rating of a welding gun in Newtons or kN',
    aliases: ['gun force', 'force', 'max force', 'required force'],
    expectedType: 'number',
    required: false,
    priority: 8
  },
  {
    id: 'oem_model',
    name: 'OEM Model',
    role: 'OEM_MODEL',
    semanticDescription: 'Original equipment manufacturer model or order code',
    aliases: ['oem model', 'model', 'fanuc order code', 'manufacturer'],
    expectedType: 'string',
    required: false,
    priority: 6
  },
  {
    id: 'robot_type',
    name: 'Robot Type',
    role: 'ROBOT_TYPE',
    semanticDescription: 'Type or category of robot',
    aliases: ['robot type', 'type', 'category'],
    expectedType: 'string',
    required: false,
    priority: 5
  },
  {
    id: 'payload',
    name: 'Payload',
    role: 'PAYLOAD',
    semanticDescription: 'Maximum payload capacity of the robot in kg',
    aliases: ['payload', 'capacity', 'load', 'payload kg'],
    expectedType: 'number',
    required: false,
    priority: 6
  },
  {
    id: 'reach',
    name: 'Reach',
    role: 'REACH',
    semanticDescription: 'Maximum reach distance of the robot arm in mm',
    aliases: ['reach', 'reach mm', 'arm length'],
    expectedType: 'number',
    required: false,
    priority: 6
  },
  {
    id: 'height',
    name: 'Height',
    role: 'HEIGHT',
    semanticDescription: 'Height of a riser or stand in mm',
    aliases: ['height', 'riser height', 'stand height'],
    expectedType: 'number',
    required: false,
    priority: 6
  },
  {
    id: 'brand',
    name: 'Brand',
    role: 'BRAND',
    semanticDescription: 'Brand or manufacturer name',
    aliases: ['brand', 'make', 'vendor'],
    expectedType: 'string',
    required: false,
    priority: 5
  },

  // Personnel fields
  {
    id: 'engineer',
    name: 'Engineer',
    role: 'ENGINEER',
    semanticDescription: 'Person responsible for the work or simulation',
    aliases: ['engineer', 'persons responsible', 'responsible', 'assigned to', 'owner'],
    expectedType: 'string',
    required: false,
    priority: 6
  },
  {
    id: 'sim_leader',
    name: 'Sim Leader',
    role: 'SIM_LEADER',
    semanticDescription: 'Simulation team leader',
    aliases: ['sim. leader', 'sim leader', 'simulation leader'],
    expectedType: 'string',
    required: false,
    priority: 6
  },
  {
    id: 'team_leader',
    name: 'Team Leader',
    role: 'TEAM_LEADER',
    semanticDescription: 'Team leader or manager',
    aliases: ['team leader', 'lead', 'manager'],
    expectedType: 'string',
    required: false,
    priority: 5
  },

  // Date fields
  {
    id: 'due_date',
    name: 'Due Date',
    role: 'DUE_DATE',
    semanticDescription: 'Target completion date for a task or simulation',
    aliases: ['due date', 'sim. due date', 'deadline', 'target date'],
    expectedType: 'date',
    required: false,
    priority: 6
  },
  {
    id: 'start_date',
    name: 'Start Date',
    role: 'START_DATE',
    semanticDescription: 'Start date of a task or project phase',
    aliases: ['start date', 'begin date'],
    expectedType: 'date',
    required: false,
    priority: 5
  },
  {
    id: 'end_date',
    name: 'End Date',
    role: 'END_DATE',
    semanticDescription: 'End or completion date',
    aliases: ['end date', 'finish date', 'completion date'],
    expectedType: 'date',
    required: false,
    priority: 5
  },

  // Other fields
  {
    id: 'comments',
    name: 'Comments',
    role: 'COMMENTS',
    semanticDescription: 'Notes, comments, or additional information',
    aliases: ['comments', 'comment', 'notes', 'remarks', 'description', 'coments'],
    expectedType: 'string',
    required: false,
    priority: 3
  },
  {
    id: 'quantity',
    name: 'Quantity',
    role: 'QUANTITY',
    semanticDescription: 'Count or quantity of items',
    aliases: ['quantity', 'qty', 'count', 'amount'],
    expectedType: 'number',
    required: false,
    priority: 5
  },
  {
    id: 'reserve',
    name: 'Reserve',
    role: 'RESERVE',
    semanticDescription: 'Reserve or spare quantity',
    aliases: ['reserve', 'spare', 'backup'],
    expectedType: 'number',
    required: false,
    priority: 4
  }
]

// ============================================================================
// PATTERN-BASED MATCHING
// ============================================================================

/**
 * Match a column to a field using pattern-based matching.
 * This is the baseline matching without embeddings.
 */
export function matchFieldByPattern(
  column: ColumnProfile,
  registry: FieldDescriptor[]
): FieldMatchResult {
  // First, use the existing column role detector
  const roleDetection = detectColumnRole(column.header)
  
  // Find matching field by role
  const matchedByRole = registry.find(f => f.role === roleDetection.role)
  
  // Calculate pattern score based on confidence
  const patternScore = confidenceToScore(roleDetection.confidence)
  
  // Find alternatives
  const alternatives = findAlternativeMatches(column, registry, matchedByRole?.id)
  
  return {
    columnIndex: column.columnIndex,
    header: column.header,
    matchedField: matchedByRole ?? null,
    confidence: patternScore,
    confidenceLevel: roleDetection.confidence,
    patternScore,
    usedEmbedding: false,
    explanation: roleDetection.explanation,
    alternatives
  }
}

/**
 * Convert confidence level to numeric score
 */
function confidenceToScore(confidence: MatchConfidence): number {
  switch (confidence) {
    case 'HIGH':
      return 0.9
    case 'MEDIUM':
      return 0.6
    case 'LOW':
      return 0.3
    default:
      return 0
  }
}

/**
 * Convert numeric score to confidence level
 */
function scoreToConfidence(score: number): MatchConfidence {
  if (score >= 0.7) {
    return 'HIGH'
  }
  
  if (score >= 0.4) {
    return 'MEDIUM'
  }
  
  return 'LOW'
}

/**
 * Find alternative field matches for a column
 */
function findAlternativeMatches(
  column: ColumnProfile,
  registry: FieldDescriptor[],
  excludeId?: FieldId
): Array<{ field: FieldDescriptor; confidence: number }> {
  const alternatives: Array<{ field: FieldDescriptor; confidence: number }> = []
  const normalizedHeader = column.normalizedHeader.toLowerCase()
  
  for (const field of registry) {
    if (field.id === excludeId) {
      continue
    }
    
    // Check aliases for partial matches
    for (const alias of field.aliases) {
      if (normalizedHeader.includes(alias) || alias.includes(normalizedHeader)) {
        const confidence = normalizedHeader === alias ? 0.6 : 0.3
        alternatives.push({ field, confidence })
        break
      }
    }
  }
  
  // Sort by confidence descending
  alternatives.sort((a, b) => b.confidence - a.confidence)
  
  // Return top 3
  return alternatives.slice(0, 3)
}

// ============================================================================
// EMBEDDING-BASED MATCHING
// ============================================================================

// Cache for field embeddings
const fieldEmbeddingCache: EmbeddingCache = new InMemoryEmbeddingCache(500)

/**
 * Match a column to a field using both pattern and embedding-based matching.
 * Blends the scores for more robust matching.
 */
export async function matchFieldWithEmbeddings(
  column: ColumnProfile,
  registry: FieldDescriptor[],
  embeddings: EmbeddingProvider
): Promise<FieldMatchResult> {
  // First get pattern-based result
  const patternResult = matchFieldByPattern(column, registry)
  
  // Build column description for embedding
  const columnDescription = buildColumnDescription({
    header: column.header,
    types: column.detectedTypes,
    samples: column.sampleValues,
    sheetCategory: column.sheetCategory
  })
  
  // Get column embedding
  const columnEmbedding = await embeddings.embedText(columnDescription)
  
  // Find best embedding match
  let bestEmbeddingMatch: FieldDescriptor | null = null
  let bestEmbeddingScore = 0
  const embeddingScores: Map<FieldId, number> = new Map()
  
  for (const field of registry) {
    // Get or compute field embedding
    let fieldEmbedding = fieldEmbeddingCache.get(field.semanticDescription)
    
    if (fieldEmbedding === undefined) {
      fieldEmbedding = await embeddings.embedText(field.semanticDescription)
      fieldEmbeddingCache.set(field.semanticDescription, fieldEmbedding)
    }
    
    // Calculate similarity
    const similarity = cosineSimilarity(columnEmbedding, fieldEmbedding)
    const normalizedScore = normalizeSimilarity(similarity)
    
    embeddingScores.set(field.id, normalizedScore)
    
    if (normalizedScore > bestEmbeddingScore) {
      bestEmbeddingScore = normalizedScore
      bestEmbeddingMatch = field
    }
  }
  
  // Blend scores: 60% pattern, 40% embedding
  const patternWeight = 0.6
  const embeddingWeight = 0.4
  
  // Calculate blended score for the matched field
  const matchedField = patternResult.matchedField ?? bestEmbeddingMatch
  let blendedScore = patternResult.patternScore * patternWeight
  
  if (matchedField !== null) {
    const embScore = embeddingScores.get(matchedField.id) ?? 0
    blendedScore += embScore * embeddingWeight
  }
  
  // If embedding match is significantly better, prefer it
  if (bestEmbeddingMatch !== null && bestEmbeddingScore > 0.8) {
    const patternMatchScore = patternResult.matchedField
      ? embeddingScores.get(patternResult.matchedField.id) ?? 0
      : 0
    
    if (bestEmbeddingScore - patternMatchScore > 0.2) {
      // Embedding found a better match
      blendedScore = patternResult.patternScore * patternWeight + bestEmbeddingScore * embeddingWeight
      
      return {
        columnIndex: column.columnIndex,
        header: column.header,
        matchedField: bestEmbeddingMatch,
        confidence: blendedScore,
        confidenceLevel: scoreToConfidence(blendedScore),
        patternScore: patternResult.patternScore,
        embeddingScore: bestEmbeddingScore,
        usedEmbedding: true,
        explanation: `Embedding match: ${bestEmbeddingMatch.name} (similarity: ${(bestEmbeddingScore * 100).toFixed(1)}%)`,
        alternatives: patternResult.alternatives
      }
    }
  }
  
  return {
    ...patternResult,
    confidence: blendedScore,
    confidenceLevel: scoreToConfidence(blendedScore),
    embeddingScore: matchedField ? embeddingScores.get(matchedField.id) : undefined,
    usedEmbedding: true,
    explanation: patternResult.explanation + (matchedField
      ? ` + Embedding: ${((embeddingScores.get(matchedField.id) ?? 0) * 100).toFixed(1)}%`
      : '')
  }
}

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

/**
 * Match columns to fields, using embeddings if available and enabled.
 */
export async function matchColumnsToFields(
  columns: ColumnProfile[],
  registry: FieldDescriptor[] = DEFAULT_FIELD_REGISTRY,
  embeddingProvider?: EmbeddingProvider
): Promise<FieldMatchResult[]> {
  const useEmbeddings = getFeatureFlag('useSemanticEmbeddings') && embeddingProvider !== undefined
  
  const results: FieldMatchResult[] = []
  
  for (const column of columns) {
    let result: FieldMatchResult
    
    if (useEmbeddings && embeddingProvider !== undefined) {
      result = await matchFieldWithEmbeddings(column, registry, embeddingProvider)
    } else {
      result = matchFieldByPattern(column, registry)
    }
    
    results.push(result)
  }
  
  return results
}

/**
 * Build column profiles from a header row and sample data
 */
export function buildColumnProfiles(
  headers: Array<string | null | undefined>,
  sampleRows: Array<Array<unknown>>,
  sheetCategory?: string
): ColumnProfile[] {
  const profiles: ColumnProfile[] = []
  
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] ?? '').trim()
    
    if (header === '') {
      continue
    }
    
    // Collect values from this column
    const values: unknown[] = []
    for (const row of sampleRows) {
      if (row[i] !== null && row[i] !== undefined) {
        values.push(row[i])
      }
    }
    
    // Detect types
    const types = new Set<string>()
    for (const val of values) {
      types.add(typeof val)
    }
    
    // Get sample strings
    const samples = values
      .slice(0, 10)
      .map(v => String(v).trim())
      .filter(s => s.length > 0 && s.length < 100)
    
    // Calculate empty ratio
    const emptyCount = sampleRows.length - values.length
    const emptyRatio = sampleRows.length > 0 ? emptyCount / sampleRows.length : 0
    
    // Calculate unique ratio
    const uniqueValues = new Set(samples)
    const uniqueRatio = samples.length > 0 ? uniqueValues.size / samples.length : 0
    
    profiles.push({
      columnIndex: i,
      header,
      normalizedHeader: header.toLowerCase().trim(),
      detectedTypes: Array.from(types),
      sampleValues: samples,
      emptyRatio,
      uniqueRatio,
      sheetCategory
    })
  }
  
  return profiles
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the display name for a field
 */
export function getFieldDisplayName(fieldId: FieldId): string {
  const field = DEFAULT_FIELD_REGISTRY.find(f => f.id === fieldId)
  return field?.name ?? getRoleDisplayName(fieldId as ColumnRole)
}

/**
 * Check if a match result indicates low confidence
 */
export function isLowConfidenceMatch(result: FieldMatchResult, threshold: number = 0.5): boolean {
  return result.confidence < threshold
}

/**
 * Count low confidence matches in a result set
 */
export function countLowConfidenceMatches(
  results: FieldMatchResult[],
  threshold: number = 0.5
): number {
  return results.filter(r => isLowConfidenceMatch(r, threshold)).length
}
