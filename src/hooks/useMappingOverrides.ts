// useMappingOverrides Hook
// Manages mapping override state for user corrections
// Allows Dale to manually fix column→field mappings

import { useState, useCallback, useMemo } from 'react'
import { FieldId, FieldMatchResult, DEFAULT_FIELD_REGISTRY } from '../ingestion/fieldMatcher'

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single mapping override
 */
export interface MappingOverride {
  workbookId: string
  sheetName: string
  columnIndex: number
  originalHeader: string
  fieldId: FieldId
  createdAt: number
}

/**
 * Override state and actions
 */
export interface MappingOverridesState {
  /**
   * All current overrides
   */
  overrides: MappingOverride[]
  
  /**
   * Add or update an override
   */
  setOverride: (override: Omit<MappingOverride, 'createdAt'>) => void
  
  /**
   * Remove an override
   */
  removeOverride: (workbookId: string, sheetName: string, columnIndex: number) => void
  
  /**
   * Clear all overrides for a sheet
   */
  clearSheetOverrides: (workbookId: string, sheetName: string) => void
  
  /**
   * Clear all overrides
   */
  clearAllOverrides: () => void
  
  /**
   * Get override for a specific column
   */
  getOverride: (workbookId: string, sheetName: string, columnIndex: number) => MappingOverride | undefined
  
  /**
   * Apply overrides to match results
   */
  applyOverrides: (
    workbookId: string,
    sheetName: string,
    matches: FieldMatchResult[]
  ) => FieldMatchResult[]
  
  /**
   * Count of overrides
   */
  overrideCount: number
  
  /**
   * Check if a column has an override
   */
  hasOverride: (workbookId: string, sheetName: string, columnIndex: number) => boolean
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'simpilot.mappingOverrides'

/**
 * Load overrides from localStorage
 */
function loadOverrides(): MappingOverride[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) {
      return []
    }
    return JSON.parse(stored) as MappingOverride[]
  } catch {
    console.warn('[MappingOverrides] Failed to load from localStorage')
    return []
  }
}

/**
 * Save overrides to localStorage
 */
function saveOverrides(overrides: MappingOverride[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    console.warn('[MappingOverrides] Failed to save to localStorage')
  }
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing mapping overrides
 */
export function useMappingOverrides(): MappingOverridesState {
  // Initialize from storage
  const [overrides, setOverrides] = useState<MappingOverride[]>(() => {
    if (typeof window === 'undefined') {
      return []
    }
    return loadOverrides()
  })
  
  // Set or update an override
  const setOverride = useCallback((override: Omit<MappingOverride, 'createdAt'>) => {
    setOverrides(prev => {
      const existing = prev.findIndex(o =>
        o.workbookId === override.workbookId &&
        o.sheetName === override.sheetName &&
        o.columnIndex === override.columnIndex
      )
      
      const newOverride: MappingOverride = {
        ...override,
        createdAt: Date.now()
      }
      
      let updated: MappingOverride[]
      
      if (existing >= 0) {
        // Update existing
        updated = [...prev]
        updated[existing] = newOverride
      } else {
        // Add new
        updated = [...prev, newOverride]
      }
      
      saveOverrides(updated)
      return updated
    })
  }, [])
  
  // Remove an override
  const removeOverride = useCallback((
    workbookId: string,
    sheetName: string,
    columnIndex: number
  ) => {
    setOverrides(prev => {
      const updated = prev.filter(o =>
        !(o.workbookId === workbookId &&
          o.sheetName === sheetName &&
          o.columnIndex === columnIndex)
      )
      saveOverrides(updated)
      return updated
    })
  }, [])
  
  // Clear sheet overrides
  const clearSheetOverrides = useCallback((workbookId: string, sheetName: string) => {
    setOverrides(prev => {
      const updated = prev.filter(o =>
        !(o.workbookId === workbookId && o.sheetName === sheetName)
      )
      saveOverrides(updated)
      return updated
    })
  }, [])
  
  // Clear all overrides
  const clearAllOverrides = useCallback(() => {
    setOverrides([])
    saveOverrides([])
  }, [])
  
  // Get override for a column
  const getOverride = useCallback((
    workbookId: string,
    sheetName: string,
    columnIndex: number
  ): MappingOverride | undefined => {
    return overrides.find(o =>
      o.workbookId === workbookId &&
      o.sheetName === sheetName &&
      o.columnIndex === columnIndex
    )
  }, [overrides])
  
  // Check if column has override
  const hasOverride = useCallback((
    workbookId: string,
    sheetName: string,
    columnIndex: number
  ): boolean => {
    return overrides.some(o =>
      o.workbookId === workbookId &&
      o.sheetName === sheetName &&
      o.columnIndex === columnIndex
    )
  }, [overrides])
  
  // Apply overrides to match results
  const applyOverrides = useCallback((
    workbookId: string,
    sheetName: string,
    matches: FieldMatchResult[]
  ): FieldMatchResult[] => {
    return matches.map(match => {
      const override = overrides.find(o =>
        o.workbookId === workbookId &&
        o.sheetName === sheetName &&
        o.columnIndex === match.columnIndex
      )
      
      if (override === undefined) {
        return match
      }
      
      // Find the field from registry
      const field = DEFAULT_FIELD_REGISTRY.find(f => f.id === override.fieldId)
      
      if (field === undefined) {
        return match
      }
      
      return {
        ...match,
        matchedField: field,
        confidence: 1.0,  // User override = 100% confidence
        confidenceLevel: 'HIGH',
        explanation: `User override: ${field.name}`,
        usedEmbedding: false
      }
    })
  }, [overrides])
  
  // Memoized count
  const overrideCount = useMemo(() => overrides.length, [overrides])
  
  return {
    overrides,
    setOverride,
    removeOverride,
    clearSheetOverrides,
    clearAllOverrides,
    getOverride,
    applyOverrides,
    overrideCount,
    hasOverride
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Export overrides as JSON for backup/sharing
 */
export function exportOverrides(overrides: MappingOverride[]): string {
  return JSON.stringify(overrides, null, 2)
}

/**
 * Import overrides from JSON
 */
export function importOverrides(json: string): MappingOverride[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) === false) {
      throw new Error('Invalid format: expected array')
    }
    return parsed as MappingOverride[]
  } catch (e) {
    throw new Error(`Failed to import overrides: ${e}`)
  }
}

/**
 * TODO: Future persistence options
 * 
 * 1. LocalStorage (current implementation)
 *    - Pros: Simple, works offline
 *    - Cons: Per-browser, no sync
 * 
 * 2. Backend API
 *    - Save overrides to backend per user/project
 *    - Enable sharing across team
 *    - Persist across browsers/devices
 * 
 * 3. Export/Import files
 *    - Allow downloading as JSON
 *    - Import from file
 *    - Good for backup/sharing
 * 
 * 4. Learn patterns
 *    - Track overrides over time
 *    - Suggest common fixes
 *    - Auto-apply learned patterns
 */
