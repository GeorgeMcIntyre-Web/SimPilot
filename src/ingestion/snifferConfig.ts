// Sniffer Configuration
// Per-file overrides and global settings for sheet detection
// Enables manual corrections without code changes

import { SheetCategory } from './sheetSniffer'
import { log } from '../lib/log'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Override for a specific sheet in a file
 */
export interface SheetOverride {
  category: SheetCategory
  sheetName: string
  reason?: string
}

/**
 * Configuration for a specific file
 */
export interface FileConfig {
  fileName: string
  sheetOverrides?: Partial<Record<SheetCategory, string>>
  skipSheets?: string[]
  notes?: string
}

/**
 * Global sniffer configuration
 */
export interface SnifferConfig {
  /**
   * Minimum score required for a category match.
   * If no sheet meets this threshold, the file is marked as UNKNOWN.
   * Default: 4 (requires at least one strong + one weak match)
   */
  minimumScoreThreshold: number

  /**
   * If true, emit a warning when score is below threshold
   */
  warnOnLowScore: boolean

  /**
   * Low score warning threshold.
   * If score is between this and minimumScoreThreshold, emit a warning.
   */
  lowScoreWarningThreshold: number

  /**
   * Per-file configuration overrides
   */
  fileConfigs: Map<string, FileConfig>

  /**
   * Global sheet name patterns to skip
   */
  globalSkipPatterns: RegExp[]
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default sniffer configuration
 */
export const DEFAULT_SNIFFER_CONFIG: SnifferConfig = {
  minimumScoreThreshold: 4,
  warnOnLowScore: true,
  lowScoreWarningThreshold: 6,
  fileConfigs: new Map(),
  globalSkipPatterns: [
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
    /^instructions$/i,
    /^change\s*index$/i,
    /^change\s*log$/i,
    /^revision$/i,
    /^history$/i
  ]
}

// ============================================================================
// CONFIG BUILDER
// ============================================================================

/**
 * Builder for creating sniffer configurations
 */
export class SnifferConfigBuilder {
  private config: SnifferConfig

  constructor() {
    this.config = {
      ...DEFAULT_SNIFFER_CONFIG,
      fileConfigs: new Map()
    }
  }

  /**
   * Set minimum score threshold
   */
  withMinimumScore(threshold: number): SnifferConfigBuilder {
    this.config.minimumScoreThreshold = threshold
    return this
  }

  /**
   * Add a file-specific override
   */
  withFileOverride(
    fileName: string,
    category: Exclude<SheetCategory, 'UNKNOWN'>,
    sheetName: string,
    notes?: string
  ): SnifferConfigBuilder {
    const existing: FileConfig = this.config.fileConfigs.get(fileName) ?? {
      fileName,
      sheetOverrides: {}
    }

    if (existing.sheetOverrides === undefined) {
      existing.sheetOverrides = {}
    }

    existing.sheetOverrides[category] = sheetName

    if (notes) {
      existing.notes = notes
    }

    this.config.fileConfigs.set(fileName, existing)
    return this
  }

  /**
   * Skip specific sheets in a file
   */
  withSkippedSheets(fileName: string, sheets: string[]): SnifferConfigBuilder {
    const existing = this.config.fileConfigs.get(fileName) ?? { fileName }
    existing.skipSheets = sheets
    this.config.fileConfigs.set(fileName, existing)
    return this
  }

  /**
   * Add a global skip pattern
   */
  withGlobalSkipPattern(pattern: RegExp): SnifferConfigBuilder {
    this.config.globalSkipPatterns.push(pattern)
    return this
  }

  /**
   * Build the configuration
   */
  build(): SnifferConfig {
    return this.config
  }
}

// ============================================================================
// CONFIG HELPERS
// ============================================================================

/**
 * Get file-specific override for a category
 */
export function getFileOverride(
  config: SnifferConfig,
  fileName: string,
  category: SheetCategory
): string | null {
  const fileConfig = config.fileConfigs.get(fileName)

  if (fileConfig === undefined) {
    return null
  }

  if (fileConfig.sheetOverrides === undefined) {
    return null
  }

  return fileConfig.sheetOverrides[category] ?? null
}

/**
 * Check if a sheet should be skipped for a file
 */
export function shouldSkipSheet(
  config: SnifferConfig,
  fileName: string,
  sheetName: string
): boolean {
  // Check file-specific skips
  const fileConfig = config.fileConfigs.get(fileName)
  if (fileConfig?.skipSheets?.includes(sheetName)) {
    return true
  }

  // Check global patterns
  for (const pattern of config.globalSkipPatterns) {
    if (pattern.test(sheetName)) {
      return true
    }
  }

  return false
}

/**
 * Check if score meets threshold
 */
export function meetsScoreThreshold(config: SnifferConfig, score: number): boolean {
  return score >= config.minimumScoreThreshold
}

/**
 * Check if score is in warning zone
 */
export function isLowScore(config: SnifferConfig, score: number): boolean {
  return score >= config.minimumScoreThreshold && score < config.lowScoreWarningThreshold
}

// ============================================================================
// KNOWN FILE OVERRIDES
// ============================================================================

/**
 * Pre-configured overrides for known problematic files.
 * Add entries here when the sniffer fails on specific files.
 */
export const KNOWN_FILE_OVERRIDES: FileConfig[] = [
  // STLA_S_ZAR Tool List always uses "ToolList" sheet
  {
    fileName: 'STLA_S_ZAR Tool List.xlsx',
    sheetOverrides: {
      IN_HOUSE_TOOLING: 'ToolList'
    },
    notes: 'Sheet name is always ToolList for this template'
  }
]

/**
 * Create a config with known overrides pre-loaded
 */
export function createDefaultConfigWithOverrides(): SnifferConfig {
  const builder = new SnifferConfigBuilder()

  for (const fileConfig of KNOWN_FILE_OVERRIDES) {
    if (fileConfig.sheetOverrides) {
      for (const [category, sheetName] of Object.entries(fileConfig.sheetOverrides)) {
        if (category === 'UNKNOWN') continue
        builder.withFileOverride(
          fileConfig.fileName,
          category as Exclude<SheetCategory, 'UNKNOWN'>,
          sheetName,
          fileConfig.notes
        )
      }
    }

    if (fileConfig.skipSheets) {
      builder.withSkippedSheets(fileConfig.fileName, fileConfig.skipSheets)
    }
  }

  return builder.build()
}

// ============================================================================
// CONFIG STORAGE
// ============================================================================

const CONFIG_STORAGE_KEY = 'simpilot.sniffer.config'

/**
 * Save config to localStorage
 */
export function saveConfigToStorage(config: SnifferConfig): void {
  try {
    const serializable = {
      minimumScoreThreshold: config.minimumScoreThreshold,
      warnOnLowScore: config.warnOnLowScore,
      lowScoreWarningThreshold: config.lowScoreWarningThreshold,
      fileConfigs: Array.from(config.fileConfigs.entries()),
      globalSkipPatterns: config.globalSkipPatterns.map(p => p.source)
    }
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(serializable))
  } catch {
    log.warn('[SnifferConfig] Failed to save config to localStorage')
  }
}

/**
 * Load config from localStorage
 */
export function loadConfigFromStorage(): SnifferConfig | null {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (stored === null) {
      return null
    }

    const parsed = JSON.parse(stored)
    return {
      minimumScoreThreshold: parsed.minimumScoreThreshold ?? DEFAULT_SNIFFER_CONFIG.minimumScoreThreshold,
      warnOnLowScore: parsed.warnOnLowScore ?? DEFAULT_SNIFFER_CONFIG.warnOnLowScore,
      lowScoreWarningThreshold: parsed.lowScoreWarningThreshold ?? DEFAULT_SNIFFER_CONFIG.lowScoreWarningThreshold,
      fileConfigs: new Map(parsed.fileConfigs ?? []),
      globalSkipPatterns: (parsed.globalSkipPatterns ?? []).map((s: string) => new RegExp(s, 'i'))
    }
  } catch {
    log.warn('[SnifferConfig] Failed to load config from localStorage')
    return null
  }
}

/**
 * Get active config (from storage or default)
 */
export function getActiveConfig(): SnifferConfig {
  return loadConfigFromStorage() ?? createDefaultConfigWithOverrides()
}
