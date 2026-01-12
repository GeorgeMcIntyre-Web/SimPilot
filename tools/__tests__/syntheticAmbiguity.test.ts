/**
 * Synthetic Ambiguity Test
 *
 * Tests that the UID-aware ingestion properly detects ambiguous matches
 * when new keys match multiple existing records with similar scores.
 */

import { describe, it, expect } from 'vitest'
import {
  StationRecord,
  ToolRecord,
  generateStationUid,
  generateToolUid,
  PlantKey
} from '../../src/domain/uidTypes'
import {
  resolveStationUid,
  resolveToolUid,
  type UidResolutionContext
} from '../../src/ingestion/uidResolver'
import { collectAmbiguousItems } from '../../src/ingestion/ambiguityCollector'

describe('Synthetic Ambiguity - Stations', () => {
  it('should detect ambiguity when new key matches 2 existing stations with similar scores', () => {
    const plantKey: PlantKey = 'PLANT_TEST'

    // Create 2 existing station records with similar labels
    const existingStations: StationRecord[] = [
      {
        uid: generateStationUid(),
        key: 'AL_010-010',
        plantKey,
        labels: {
          line: 'AL',
          bay: '010',
          stationNo: '010',
          fullLabel: 'AL 010 Station 010'
        },
        attributes: {},
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        sourceFile: 'existing.xlsx'
      },
      {
        uid: generateStationUid(),
        key: 'AL_010-011',
        plantKey,
        labels: {
          line: 'AL',
          bay: '010',
          stationNo: '011',
          fullLabel: 'AL 010 Station 011'
        },
        attributes: {},
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        sourceFile: 'existing.xlsx'
      }
    ]

    const context: UidResolutionContext = {
      stationRecords: existingStations,
      toolRecords: [],
      robotRecords: [],
      aliasRules: [],
      plantKey
    }

    // Import a new key that matches both with close scores
    const newKey = 'AL_010-012'
    const newLabels = {
      line: 'AL',
      bay: '010',
      stationNo: '012',
      fullLabel: 'AL 010 Station 012'
    }

    const resolution = resolveStationUid(
      newKey,
      newLabels,
      {},
      context,
      { sourceFile: 'new.xlsx' }
    )

    // Should detect ambiguity
    expect(resolution.matchedVia).toBe('ambiguous')
    expect(resolution.uid).toBeNull()
    expect(resolution.candidates).toBeDefined()
    expect(resolution.candidates!.length).toBeGreaterThan(0)

    // Collect ambiguous items
    const ambiguousItems = collectAmbiguousItems([
      {
        key: newKey,
        resolution,
        entityType: 'station',
        plantKey,
        attributes: {}
      }
    ])

    expect(ambiguousItems.length).toBe(1)
    expect(ambiguousItems[0].newKey).toBe(newKey)
    expect(ambiguousItems[0].candidates.length).toBeGreaterThan(0)
  })

  it('should not detect ambiguity for exact key match', () => {
    const plantKey: PlantKey = 'PLANT_TEST'

    const existingStations: StationRecord[] = [
      {
        uid: generateStationUid(),
        key: 'AL_010-010',
        plantKey,
        labels: {
          line: 'AL',
          bay: '010',
          stationNo: '010',
          fullLabel: 'AL 010 Station 010'
        },
        attributes: {},
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        sourceFile: 'existing.xlsx'
      }
    ]

    const context: UidResolutionContext = {
      stationRecords: existingStations,
      toolRecords: [],
      robotRecords: [],
      aliasRules: [],
      plantKey
    }

    // Import exact same key
    const resolution = resolveStationUid(
      'AL_010-010',
      {
        line: 'AL',
        bay: '010',
        stationNo: '010',
        fullLabel: 'AL 010 Station 010'
      },
      {},
      context,
      { sourceFile: 'new.xlsx' }
    )

    // Should match exactly, not ambiguous
    expect(resolution.matchedVia).toBe('exact_key')
    expect(resolution.uid).not.toBeNull()
    expect(resolution.candidates).toBeUndefined()
  })
})

describe('Synthetic Ambiguity - Tools', () => {
  it('should detect ambiguity when new tool matches 2 existing tools', () => {
    const plantKey: PlantKey = 'PLANT_TEST'

    // Create 2 existing tool records with similar names
    const existingTools: ToolRecord[] = [
      {
        uid: generateToolUid(),
        key: 'AL_010-010_GUN01',
        plantKey,
        stationUid: null,
        labels: {
          toolCode: 'GUN01',
          toolName: 'Spot Weld Gun 1',
          gunNumber: '1'
        },
        attributes: {},
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        sourceFile: 'existing.xlsx'
      },
      {
        uid: generateToolUid(),
        key: 'AL_010-011_GUN01',
        plantKey,
        stationUid: null,
        labels: {
          toolCode: 'GUN01',
          toolName: 'Spot Weld Gun 1',
          gunNumber: '1'
        },
        attributes: {},
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        sourceFile: 'existing.xlsx'
      }
    ]

    const context: UidResolutionContext = {
      stationRecords: [],
      toolRecords: existingTools,
      robotRecords: [],
      aliasRules: [],
      plantKey
    }

    // Import a new tool with same code but different station
    const newKey = 'AL_010-012_GUN01'
    const newLabels = {
      toolCode: 'GUN01',
      toolName: 'Spot Weld Gun 1',
      gunNumber: '1'
    }

    const resolution = resolveToolUid(
      newKey,
      newLabels,
      null, // stationUid
      {}, // attributes
      context,
      { sourceFile: 'new.xlsx' }
    )

    // Should detect ambiguity
    expect(resolution.matchedVia).toBe('ambiguous')
    expect(resolution.uid).toBeNull()
    expect(resolution.candidates).toBeDefined()
    expect(resolution.candidates!.length).toBeGreaterThan(0)

    // Collect ambiguous items
    const ambiguousItems = collectAmbiguousItems([
      {
        key: newKey,
        resolution,
        entityType: 'tool',
        plantKey,
        attributes: {}
      }
    ])

    expect(ambiguousItems.length).toBe(1)
    expect(ambiguousItems[0].newKey).toBe(newKey)
    expect(ambiguousItems[0].entityType).toBe('tool')
  })
})

describe('Synthetic Ambiguity - Multiple Files', () => {
  it('should accumulate ambiguities across multiple imports', () => {
    const plantKey: PlantKey = 'PLANT_TEST'

    const existingStations: StationRecord[] = [
      {
        uid: generateStationUid(),
        key: 'AL_010-010',
        plantKey,
        labels: {
          line: 'AL',
          bay: '010',
          stationNo: '010',
          fullLabel: 'AL 010 Station 010'
        },
        attributes: {},
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        sourceFile: 'existing.xlsx'
      },
      {
        uid: generateStationUid(),
        key: 'AL_010-011',
        plantKey,
        labels: {
          line: 'AL',
          bay: '010',
          stationNo: '011',
          fullLabel: 'AL 010 Station 011'
        },
        attributes: {},
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        sourceFile: 'existing.xlsx'
      }
    ]

    const context: UidResolutionContext = {
      stationRecords: existingStations,
      toolRecords: [],
      robotRecords: [],
      aliasRules: [],
      plantKey
    }

    const ambiguousResolutions = []

    // Import 3 new keys that all match ambiguously
    for (let i = 12; i <= 14; i++) {
      const newKey = `AL_010-0${i}`
      const newLabels = {
        line: 'AL',
        bay: '010',
        stationNo: `0${i}`,
        fullLabel: `AL 010 Station 0${i}`
      }

      const resolution = resolveStationUid(
        newKey,
        newLabels,
        {},
        context,
        { sourceFile: `import${i}.xlsx` }
      )

      if (resolution.matchedVia === 'ambiguous') {
        ambiguousResolutions.push({
          key: newKey,
          resolution,
          entityType: 'station' as const,
          plantKey,
          attributes: {}
        })
      }
    }

    const ambiguousItems = collectAmbiguousItems(ambiguousResolutions)

    // Should have 3 ambiguous items
    expect(ambiguousItems.length).toBe(3)
    expect(ambiguousItems.every(item => item.candidates.length > 0)).toBe(true)
  })
})
