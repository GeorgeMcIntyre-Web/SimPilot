import { describe, it, expect } from 'vitest'
import { createSnapshotFromState, applySnapshotToState, StoreSnapshot } from '../storeSnapshot'
import { ImportRun } from '../uidTypes'

describe('storeSnapshot - ImportRun persistence', () => {
  it('should persist ImportRun with modelKey', () => {
    const mockImportRun: ImportRun = {
      id: 'run_001',
      sourceFileName: 'STLA-S_ToolList_2026-01.xlsx',
      sourceType: 'toolList',
      plantKey: 'PLANT_KOKOMO',
      plantKeySource: 'filename',
      modelKey: 'STLA-S',
      importedAt: '2026-01-07T10:00:00Z',
      counts: {
        created: 5,
        updated: 3,
        deleted: 0,
        renamed: 2,
        ambiguous: 0
      }
    }

    const state = {
      projects: [],
      areas: [],
      cells: [],
      assets: [],
      warnings: [],
      changeLog: [],
      lastUpdated: '2026-01-07T10:00:00Z',
      dataSource: null,
      referenceData: { employees: [], suppliers: [] },
      stationRecords: [],
      toolRecords: [],
      robotRecords: [],
      aliasRules: [],
      importRuns: [mockImportRun],
      diffResults: [],
      auditLog: []
    }

    const snapshot = createSnapshotFromState(state, { sourceKind: 'local' })

    expect(snapshot.importRuns).toBeDefined()
    expect(snapshot.importRuns).toHaveLength(1)
    expect(snapshot.importRuns![0].modelKey).toBe('STLA-S')
    expect(snapshot.importRuns![0].sourceFileName).toBe('STLA-S_ToolList_2026-01.xlsx')
  })

  it('should persist ImportRun without modelKey (backward compatible)', () => {
    const mockImportRun: ImportRun = {
      id: 'run_002',
      sourceFileName: 'ToolList.xlsx',
      sourceType: 'toolList',
      plantKey: 'PLANT_UNKNOWN',
      plantKeySource: 'unknown',
      // modelKey omitted (optional field)
      importedAt: '2026-01-07T11:00:00Z',
      counts: {
        created: 10,
        updated: 0,
        deleted: 0,
        renamed: 0,
        ambiguous: 1
      }
    }

    const state = {
      projects: [],
      areas: [],
      cells: [],
      assets: [],
      warnings: [],
      changeLog: [],
      lastUpdated: '2026-01-07T11:00:00Z',
      dataSource: null,
      referenceData: { employees: [], suppliers: [] },
      stationRecords: [],
      toolRecords: [],
      robotRecords: [],
      aliasRules: [],
      importRuns: [mockImportRun],
      diffResults: [],
      auditLog: []
    }

    const snapshot = createSnapshotFromState(state, { sourceKind: 'local' })

    expect(snapshot.importRuns).toBeDefined()
    expect(snapshot.importRuns).toHaveLength(1)
    expect(snapshot.importRuns![0].modelKey).toBeUndefined()
    expect(snapshot.importRuns![0].sourceFileName).toBe('ToolList.xlsx')
  })

  it('should restore ImportRun with modelKey from snapshot', () => {
    const mockSnapshot: StoreSnapshot = {
      meta: {
        lastSavedAt: '2026-01-07T12:00:00Z',
        sourceKind: 'local',
        schemaVersion: 3
      },
      projects: [],
      areas: [],
      cells: [],
      assets: [],
      warnings: [],
      changeLog: [],
      importRuns: [
        {
          id: 'run_003',
          sourceFileName: 'GLC_X254_SimulationStatus.xlsx',
          sourceType: 'simulationStatus',
          plantKey: 'PLANT_DETROIT',
          plantKeySource: 'filename',
          modelKey: 'GLC_X254',
          importedAt: '2026-01-07T12:00:00Z',
          counts: {
            created: 15,
            updated: 5,
            deleted: 2,
            renamed: 3,
            ambiguous: 0
          }
        }
      ]
    }

    const restoredState = applySnapshotToState(mockSnapshot)

    expect(restoredState.importRuns).toHaveLength(1)
    expect(restoredState.importRuns[0].modelKey).toBe('GLC_X254')
    expect(restoredState.importRuns[0].sourceFileName).toBe('GLC_X254_SimulationStatus.xlsx')
  })

  it('should restore ImportRun without modelKey from old snapshot (backward compatibility)', () => {
    const oldSnapshot: StoreSnapshot = {
      meta: {
        lastSavedAt: '2026-01-05T10:00:00Z',
        sourceKind: 'local',
        schemaVersion: 3
      },
      projects: [],
      areas: [],
      cells: [],
      assets: [],
      warnings: [],
      changeLog: [],
      importRuns: [
        {
          id: 'run_004',
          sourceFileName: 'OldToolList.xlsx',
          sourceType: 'toolList',
          plantKey: 'PLANT_KOKOMO',
          plantKeySource: 'filename',
          // modelKey not present in old snapshot
          importedAt: '2026-01-05T10:00:00Z',
          counts: {
            created: 8,
            updated: 2,
            deleted: 0,
            renamed: 1,
            ambiguous: 0
          }
        }
      ]
    }

    const restoredState = applySnapshotToState(oldSnapshot)

    expect(restoredState.importRuns).toHaveLength(1)
    expect(restoredState.importRuns[0].modelKey).toBeUndefined()
    expect(restoredState.importRuns[0].sourceFileName).toBe('OldToolList.xlsx')
    // Should still load successfully despite missing modelKey
    expect(restoredState.importRuns[0].id).toBe('run_004')
  })

  it('should handle mixed ImportRuns (some with modelKey, some without)', () => {
    const mixedSnapshot: StoreSnapshot = {
      meta: {
        lastSavedAt: '2026-01-07T13:00:00Z',
        sourceKind: 'local',
        schemaVersion: 3
      },
      projects: [],
      areas: [],
      cells: [],
      assets: [],
      warnings: [],
      changeLog: [],
      importRuns: [
        {
          id: 'run_005',
          sourceFileName: 'STLA-S_ToolList.xlsx',
          sourceType: 'toolList',
          plantKey: 'PLANT_KOKOMO',
          plantKeySource: 'filename',
          modelKey: 'STLA-S',
          importedAt: '2026-01-07T13:00:00Z',
          counts: { created: 10, updated: 0, deleted: 0, renamed: 0, ambiguous: 0 }
        },
        {
          id: 'run_006',
          sourceFileName: 'GenericToolList.xlsx',
          sourceType: 'toolList',
          plantKey: 'PLANT_UNKNOWN',
          plantKeySource: 'unknown',
          // No modelKey
          importedAt: '2026-01-07T13:10:00Z',
          counts: { created: 5, updated: 0, deleted: 0, renamed: 0, ambiguous: 0 }
        },
        {
          id: 'run_007',
          sourceFileName: 'GLC_X254_RobotList.xlsx',
          sourceType: 'robotList',
          plantKey: 'PLANT_DETROIT',
          plantKeySource: 'filename',
          modelKey: 'GLC_X254',
          importedAt: '2026-01-07T13:20:00Z',
          counts: { created: 3, updated: 2, deleted: 0, renamed: 0, ambiguous: 0 }
        }
      ]
    }

    const restoredState = applySnapshotToState(mixedSnapshot)

    expect(restoredState.importRuns).toHaveLength(3)
    expect(restoredState.importRuns[0].modelKey).toBe('STLA-S')
    expect(restoredState.importRuns[1].modelKey).toBeUndefined()
    expect(restoredState.importRuns[2].modelKey).toBe('GLC_X254')
  })

  it('should round-trip ImportRun with modelKey correctly', () => {
    const originalImportRun: ImportRun = {
      id: 'run_008',
      sourceFileName: 'RANGER_P703_ToolList.xlsx',
      sourceType: 'toolList',
      plantKey: 'PLANT_DETROIT',
      plantKeySource: 'filename',
      modelKey: 'RANGER_P703',
      importedAt: '2026-01-07T14:00:00Z',
      counts: {
        created: 20,
        updated: 10,
        deleted: 5,
        renamed: 3,
        ambiguous: 2
      },
      warnings: ['Plant context inferred from filename']
    }

    const originalState = {
      projects: [],
      areas: [],
      cells: [],
      assets: [],
      warnings: [],
      changeLog: [],
      lastUpdated: '2026-01-07T14:00:00Z',
      dataSource: null,
      referenceData: { employees: [], suppliers: [] },
      stationRecords: [],
      toolRecords: [],
      robotRecords: [],
      aliasRules: [],
      importRuns: [originalImportRun],
      diffResults: [],
      auditLog: []
    }

    // Create snapshot
    const snapshot = createSnapshotFromState(originalState, { sourceKind: 'local' })

    // Restore from snapshot
    const restoredState = applySnapshotToState(snapshot)

    // Verify round-trip
    expect(restoredState.importRuns).toHaveLength(1)
    expect(restoredState.importRuns[0]).toMatchObject({
      id: 'run_008',
      sourceFileName: 'RANGER_P703_ToolList.xlsx',
      modelKey: 'RANGER_P703',
      plantKey: 'PLANT_DETROIT',
      counts: {
        created: 20,
        updated: 10,
        deleted: 5,
        renamed: 3,
        ambiguous: 2
      }
    })
  })
})
