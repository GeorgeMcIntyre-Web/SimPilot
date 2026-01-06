// LLM Mapping Helper
// Provides LLM-assisted suggestions for column→field mappings
// Behind feature flag for optional use when many columns have low confidence

import { FieldId, FieldMatchResult, DEFAULT_FIELD_REGISTRY } from './fieldMatcher'
import { SheetCategory } from './sheetSniffer'
import { getFeatureFlag } from '../config/featureFlags'

// ============================================================================
// TYPES
// ============================================================================

/**
 * LLM suggestion for a single column
 */
export interface LLMColumnSuggestion {
  header: string
  suggestedFieldId: FieldId | 'unknown'
  rationale: string
  confidence: number
}

/**
 * LLM suggestions for an entire sheet
 */
export interface LLMSheetSuggestion {
  sheetName: string
  sheetCategory: SheetCategory
  columnSuggestions: LLMColumnSuggestion[]
  overallRationale: string
}

/**
 * Semantic model of a sheet for LLM input
 */
export interface SheetSemanticModel {
  sheetName: string
  sheetCategory: SheetCategory
  headers: string[]
  sampleRows: Array<Record<string, string>>
  existingMatches: Array<{
    header: string
    fieldId: FieldId | null
    confidence: number
  }>
}

/**
 * Interface for LLM mapper implementations
 */
export interface LLMMapper {
  /**
   * Provider name for logging
   */
  readonly name: string

  /**
   * Suggest mappings for sheets with low-confidence columns
   */
  suggestMappings(input: SheetSemanticModel[]): Promise<LLMSheetSuggestion[]>

  /**
   * Check if the mapper is available/configured
   */
  isAvailable(): boolean
}

// ============================================================================
// STUB IMPLEMENTATION
// ============================================================================

/**
 * Stub LLM mapper that echoes current best matches.
 * Used when no real LLM provider is configured.
 * 
 * Future implementation would:
 * 1. Serialize sheet/column info into a structured prompt
 * 2. Call an LLM API (OpenAI, Anthropic, etc.)
 * 3. Parse the LLM response into LLMSheetSuggestion objects
 * 4. Validate field IDs against registry
 */
export class StubLLMMapper implements LLMMapper {
  readonly name = 'StubLLMMapper'

  async suggestMappings(input: SheetSemanticModel[]): Promise<LLMSheetSuggestion[]> {
    const suggestions: LLMSheetSuggestion[] = []

    for (const sheet of input) {
      const columnSuggestions: LLMColumnSuggestion[] = []

      for (const match of sheet.existingMatches) {
        // For stub, just echo the existing match with a note
        columnSuggestions.push({
          header: match.header,
          suggestedFieldId: match.fieldId ?? 'unknown',
          rationale: '[STUB] Using existing pattern-based match. ' +
            'In production, LLM would analyze column semantics.',
          confidence: match.confidence
        })
      }

      suggestions.push({
        sheetName: sheet.sheetName,
        sheetCategory: sheet.sheetCategory,
        columnSuggestions,
        overallRationale: '[STUB] This is a placeholder response. ' +
          'A real LLM implementation would provide semantic analysis ' +
          'of the sheet structure and suggest optimal field mappings.'
      })
    }

    return suggestions
  }

  isAvailable(): boolean {
    // Stub is always available
    return true
  }
}

// ============================================================================
// FUTURE: OPENAI IMPLEMENTATION SKELETON
// ============================================================================

/**
 * OpenAI LLM mapper (skeleton for future implementation)
 * 
 * Implementation would:
 * 1. Format input as structured JSON for the prompt
 * 2. Include field registry as context
 * 3. Call OpenAI API with GPT-4 or similar
 * 4. Parse JSON response
 * 5. Validate against registry
 */
export class OpenAILLMMapper implements LLMMapper {
  readonly name = 'OpenAILLMMapper'
  private apiKey: string | null

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? null
  }

  async suggestMappings(input: SheetSemanticModel[]): Promise<LLMSheetSuggestion[]> {
    if (this.isAvailable() === false) {
      console.warn('[OpenAILLMMapper] API key not configured, falling back to stub')
      const stub = new StubLLMMapper()
      return stub.suggestMappings(input)
    }

    // TODO: Implement actual OpenAI API call
    // 
    // const prompt = this.buildPrompt(input)
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: [
    //     { role: 'system', content: this.getSystemPrompt() },
    //     { role: 'user', content: prompt }
    //   ],
    //   response_format: { type: 'json_object' }
    // })
    // 
    // return this.parseResponse(response)

    // For now, use stub
    const stub = new StubLLMMapper()
    return stub.suggestMappings(input)
  }

  isAvailable(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0
  }

  // NOTE: _getSystemPrompt() and _buildPrompt() methods removed
  // They were placeholders for future OpenAI implementation
  // See git history if needed for restoration
}

// ============================================================================
// MAPPER FACTORY
// ============================================================================

export type LLMMapperType = 'stub' | 'openai'

/**
 * Create an LLM mapper by type
 */
export function createLLMMapper(
  type: LLMMapperType,
  options?: { apiKey?: string }
): LLMMapper {
  switch (type) {
    case 'openai':
      return new OpenAILLMMapper(options?.apiKey)
    case 'stub':
    default:
      return new StubLLMMapper()
  }
}

// Default mapper instance
let defaultMapper: LLMMapper = new StubLLMMapper()

/**
 * Set the default LLM mapper
 */
export function setDefaultLLMMapper(mapper: LLMMapper): void {
  defaultMapper = mapper
}

/**
 * Get the default LLM mapper
 */
export function getDefaultLLMMapper(): LLMMapper {
  return defaultMapper
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if LLM assistance should be triggered based on match results
 */
export function shouldTriggerLLMAssistance(
  results: FieldMatchResult[],
  threshold?: number
): boolean {
  // Check feature flag first
  if (getFeatureFlag('useLLMMappingHelper') === false) {
    return false
  }

  const lowConfidenceThreshold = threshold ?? getFeatureFlag('llmLowConfidenceThreshold')
  
  // Count low-confidence matches
  const lowConfidenceCount = results.filter(r => r.confidence < lowConfidenceThreshold).length
  
  // Trigger if more than 30% of columns have low confidence
  const lowConfidenceRatio = lowConfidenceCount / results.length
  
  return lowConfidenceRatio > 0.3
}

/**
 * Build semantic model from match results and sample data
 */
export function buildSemanticModel(
  sheetName: string,
  sheetCategory: SheetCategory,
  headers: string[],
  sampleRows: Array<Array<unknown>>,
  matchResults: FieldMatchResult[]
): SheetSemanticModel {
  // Convert sample rows to record format
  const sampleRecords: Array<Record<string, string>> = []
  
  for (const row of sampleRows.slice(0, 5)) {
    const record: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const value = row[i]
      if (header !== undefined && header !== '') {
        record[header] = value !== null && value !== undefined ? String(value) : ''
      }
    }
    sampleRecords.push(record)
  }

  // Build existing matches
  const existingMatches = matchResults.map(r => ({
    header: r.header,
    fieldId: r.matchedField?.id ?? null,
    confidence: r.confidence
  }))

  return {
    sheetName,
    sheetCategory,
    headers: headers.filter(h => h !== undefined && h !== ''),
    sampleRows: sampleRecords,
    existingMatches
  }
}

/**
 * Apply LLM suggestions to existing match results
 */
export function applyLLMSuggestions(
  results: FieldMatchResult[],
  suggestions: LLMColumnSuggestion[]
): FieldMatchResult[] {
  const suggestionMap = new Map(suggestions.map(s => [s.header, s]))

  return results.map(result => {
    const suggestion = suggestionMap.get(result.header)

    if (suggestion === undefined) {
      return result
    }

    // Only apply if suggestion has higher confidence
    if (suggestion.confidence <= result.confidence) {
      return result
    }

    // Find the suggested field
    const suggestedField = suggestion.suggestedFieldId === 'unknown'
      ? null
      : DEFAULT_FIELD_REGISTRY.find(f => f.id === suggestion.suggestedFieldId) ?? null

    return {
      ...result,
      matchedField: suggestedField,
      confidence: suggestion.confidence,
      explanation: `${result.explanation} | LLM: ${suggestion.rationale}`
    }
  })
}
