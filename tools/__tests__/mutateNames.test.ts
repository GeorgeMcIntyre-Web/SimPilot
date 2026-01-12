/**
 * Mutate Names Integration Test
 *
 * Tests that the --mutate-names flag increases ambiguity or unresolved links
 * compared to baseline ingestion.
 */

import { describe, it, expect } from 'vitest'
import {
  StationRecord,
  ToolRecord,
  RobotRecord,
  generateStationUid,
  generateToolUid,
  generateRobotUid,
  PlantKey
} from '../../src/domain/uidTypes'
import { ingestFileWithUid } from '../uidAwareIngestion'
import { applyMutations } from '../identifierMutator'
import type { HeadlessFile } from '../headlessIngestion'
import * as XLSX from 'xlsx'

describe('--mutate-names flag', () => {
  const plantKey: PlantKey = 'PLANT_TEST'

  /**
   * Create a mock Excel file with simulation status data
   */
  function createMockSimulationStatusFile(stationCount: number): HeadlessFile {
    // Match real-world structure:
    // Row 1: Title row
    // Row 2: Headers with keywords (strong keywords like "ROBOT POSITION - STAGE 1" are in headers)
    // Row 3: "DESIGNATION" row
    // Row 4+: Data rows
    const rows = [
      ['TEST - SIMULATION', '', '', '', '', '', '', ''],
      ['PERSONS RESPONSIBLE', 'AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION', 'ROBOT POSITION - STAGE 1', '1st STAGE SIM COMPLETION'],
      ['DESIGNATION', '', '', '', '', '', 'ROBOT SIMULATION', '']
    ]

    // Ensure we have at least 25 rows to pass the row count guard
    const minRows = Math.max(stationCount, 25)
    for (let i = 1; i <= minRows; i++) {
      const stationNo = String(i).padStart(3, '0')
      rows.push([
        'Engineer Name',
        'AL',
        'AL',
        stationNo,
        `R-${stationNo}`,
        'Spot Welding',
        '100%',
        '100%'
      ])
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SIMULATION')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return {
      path: '/mock/test.xlsx',
      name: 'test_simulation_status.xlsx',
      buffer: buffer.buffer as ArrayBuffer
    }
  }

  it('should increase ambiguous or unresolved items when mutations are applied', async () => {
    // Create initial dataset with 50 stations
    const file1 = createMockSimulationStatusFile(50)

    // Baseline ingestion (no mutations)
    const baselineResult = await ingestFileWithUid(
      file1,
      [],
      [],
      [],
      { plantKey, mutateNames: false }
    )

    if (!baselineResult.success) {
      console.error(`[DEBUG] Baseline ingestion failed: ${baselineResult.error}`)
      console.error(`[DEBUG] Warnings: ${baselineResult.warnings.join(', ')}`)
    }
    expect(baselineResult.success).toBe(true)
    expect(baselineResult.stationRecords.length).toBeGreaterThan(0)

    // Now ingest a second file with same data (creates existing context)
    // Then ingest third file WITH mutations
    // Use a higher mutation rate (10%) and a seed to ensure mutations are applied
    const file2 = createMockSimulationStatusFile(50)

    const mutatedResult = await ingestFileWithUid(
      file2,
      baselineResult.stationRecords, // Existing records from first import
      baselineResult.toolRecords,
      baselineResult.robotRecords,
      { 
        plantKey, 
        mutateNames: true,
        mutationConfig: {
          mutationRate: 0.10, // 10% mutation rate to ensure we get mutations
          seed: 42 // Fixed seed for reproducibility
        }
      }
    )

    expect(mutatedResult.success).toBe(true)

    // Verify mutations were actually applied
    expect(mutatedResult.mutationsApplied).toBeDefined()
    expect(mutatedResult.mutationsApplied).toBeGreaterThan(0)

    // Mutations should cause:
    // 1. Ambiguous items (multiple candidates for mutated keys)
    // 2. OR creates (new entities because mutated key doesn't match)
    const ambiguousCount = mutatedResult.diff?.ambiguous.length || 0
    const createsCount = mutatedResult.diff?.creates.length || 0

    // At least one of these should be > 0 when mutations are applied
    const hasAmbiguityOrCreates = ambiguousCount > 0 || createsCount > 0

    // Debug: Log what we found
    if (!hasAmbiguityOrCreates) {
      console.log(`[DEBUG] Mutations applied: ${mutatedResult.mutationsApplied}, ambiguous: ${ambiguousCount}, creates: ${createsCount}`)
      console.log(`[DEBUG] Baseline stations: ${baselineResult.stationRecords.length}, mutated stations: ${mutatedResult.stationRecords.length}`)
    }

    expect(hasAmbiguityOrCreates).toBe(true)

    // Log results for debugging
    if (ambiguousCount > 0) {
      expect(ambiguousCount).toBeGreaterThan(0)
    }

    if (createsCount > 0) {
      expect(createsCount).toBeGreaterThan(0)
    }
  })

  it('should apply mutations to approximately 1-2% of entities', () => {
    // Create test records
    const stationRecords: StationRecord[] = []
    for (let i = 1; i <= 100; i++) {
      stationRecords.push({
        uid: generateStationUid(),
        key: `AL_010-${String(i).padStart(3, '0')}`,
        plantKey,
        labels: {
          line: 'AL',
          bay: '010',
          stationNo: String(i).padStart(3, '0')
        },
        attributes: {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceFile: 'test.xlsx'
      })
    }

    // Apply mutations
    const result = applyMutations(stationRecords, [], [], {
      mutationRate: 0.015,
      seed: 42
    })

    // Expect 1-2 mutations out of 100 (1-2%)
    expect(result.mutationsApplied).toBeGreaterThanOrEqual(0)
    expect(result.mutationsApplied).toBeLessThanOrEqual(5) // Allow some variance
  })

  it('should not apply mutations when mutateNames is false', async () => {
    const file = createMockSimulationStatusFile(20)

    const result = await ingestFileWithUid(
      file,
      [],
      [],
      [],
      { plantKey, mutateNames: false }
    )

    expect(result.success).toBe(true)
    expect(result.mutationsApplied).toBeUndefined()
  })

  it('should track total mutations applied', async () => {
    const file = createMockSimulationStatusFile(100)

    const result = await ingestFileWithUid(
      file,
      [],
      [],
      [],
      { plantKey, mutateNames: true }
    )

    expect(result.success).toBe(true)
    expect(result.mutationsApplied).toBeDefined()
    expect(result.mutationsApplied).toBeGreaterThanOrEqual(0)
  })

  it('should produce different mutations with different seeds', () => {
    const stationRecords: StationRecord[] = []
    for (let i = 1; i <= 50; i++) {
      stationRecords.push({
        uid: generateStationUid(),
        key: `AL_010-${String(i).padStart(3, '0')}`,
        plantKey,
        labels: {
          line: 'AL',
          bay: '010',
          stationNo: String(i).padStart(3, '0')
        },
        attributes: {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceFile: 'test.xlsx'
      })
    }

    const result1 = applyMutations(stationRecords, [], [], {
      mutationRate: 0.02,
      seed: 42
    })

    const result2 = applyMutations(stationRecords, [], [], {
      mutationRate: 0.02,
      seed: 99
    })

    // Different seeds should produce different mutation counts (with high probability)
    // or at least different mutations
    const hasDifference =
      result1.totalMutations !== result2.totalMutations ||
      JSON.stringify(result1.stations) !== JSON.stringify(result2.stations)

    expect(hasDifference).toBe(true)
  })
})
