// Feature Flags Configuration
// Controls optional features that can be toggled on/off
// Used for gradual rollouts and experimental features

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureFlags {
  /**
   * Enable embedding-based semantic matching for column→field mappings.
   * When enabled, uses text embeddings for more robust matching.
   */
  useSemanticEmbeddings: boolean

  /**
   * Enable LLM-assisted mapping suggestions.
   * When enabled, calls LLM API when many columns have low confidence.
   */
  useLLMMappingHelper: boolean

  /**
   * Low confidence threshold (0-1) that triggers LLM assistance.
   * Only relevant when useLLMMappingHelper is true.
   */
  llmLowConfidenceThreshold: number

  /**
   * Enable data quality scoring and display.
   */
  useDataQualityScoring: boolean

  /**
   * Enable mapping override UI for manual corrections.
   */
  useMappingOverrides: boolean

  /**
   * Show detailed match explanations in the UI.
   */
  showMatchExplanations: boolean

  /**
   * Debug mode: show extra diagnostic info in the UI.
   */
  debugMode: boolean
}

// ============================================================================
// DEFAULT FLAGS
// ============================================================================

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  useSemanticEmbeddings: false,
  useLLMMappingHelper: false,
  llmLowConfidenceThreshold: 0.5,
  useDataQualityScoring: true,
  useMappingOverrides: true,
  showMatchExplanations: true,
  debugMode: false
}

// ============================================================================
// FLAG STORAGE
// ============================================================================

const STORAGE_KEY = 'simpilot.featureFlags'

let currentFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS }

/**
 * Get current feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  return { ...currentFlags }
}

/**
 * Get a specific feature flag value
 */
export function getFeatureFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  return currentFlags[key]
}

/**
 * Update feature flags
 */
export function setFeatureFlags(flags: Partial<FeatureFlags>): FeatureFlags {
  currentFlags = {
    ...currentFlags,
    ...flags
  }
  
  saveToStorage()
  
  return { ...currentFlags }
}

/**
 * Reset to default flags
 */
export function resetFeatureFlags(): FeatureFlags {
  currentFlags = { ...DEFAULT_FEATURE_FLAGS }
  saveToStorage()
  return { ...currentFlags }
}

/**
 * Save flags to localStorage
 */
function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentFlags))
  } catch {
    console.warn('[FeatureFlags] Failed to save to localStorage')
  }
}

/**
 * Load flags from localStorage
 */
export function loadFromStorage(): FeatureFlags {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    
    if (stored === null) {
      return { ...DEFAULT_FEATURE_FLAGS }
    }
    
    const parsed = JSON.parse(stored) as Partial<FeatureFlags>
    currentFlags = {
      ...DEFAULT_FEATURE_FLAGS,
      ...parsed
    }
    
    return { ...currentFlags }
  } catch {
    console.warn('[FeatureFlags] Failed to load from localStorage')
    return { ...DEFAULT_FEATURE_FLAGS }
  }
}

// Initialize from storage on module load (client-side only)
if (typeof window !== 'undefined') {
  loadFromStorage()
}
