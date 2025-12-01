// Snapshot Diff Engine Tests
// Tests for the Git-style diff functionality

import { describe, it, expect } from 'vitest'
import { buildSnapshotDiff, describeCellDelta, describeDiffSummary } from '../snapshotDiff'
import { DailySnapshot } from '../snapshotTypes'
import { CellSnapshot, CrossRefFlag } from '../../crossRef/CrossRefTypes'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestSnapshot(
  id: string,
  projectId: string,
  cells: CellSnapshot[],
  capturedAt: string = new Date().toISOString()
): DailySnapshot {
  return {
    id,
    projectId,
    capturedAt,
    capturedBy: 'test',
    sourceFiles: ['test.xlsx'],
    cells,
    healthSummaries: [],
    globalFlags: [],
    stats: {
      totalCells: cells.length,
      cellsWithRisks: cells.filter(c => c.flags && c.flags.length > 0).length,
      totalFlags: cells.reduce((acc, c) => acc + (c.flags?.length ?? 0), 0),
      robotCount: cells.reduce((acc, c) => acc + c.robots.length, 0),
      toolCount: cells.reduce((acc, c) => acc + c.tools.length, 0),
      weldGunCount: cells.reduce((acc, c) => acc + c.weldGuns.length, 0),
      riserCount: cells.reduce((acc, c) => acc + c.risers.length, 0),
      avgCompletion: 50,
      atRiskCellCount: 0
    }
  }
}

function createTestCell(
  stationKey: string,
  options: {
    areaKey?: string
    firstStageCompletion?: number
    engineer?: string
    flags?: CrossRefFlag[]
    robots?: number
    tools?: number
    weldGuns?: number
    risers?: number
  } = {}
): CellSnapshot {
  return {
    stationKey,
    areaKey: options.areaKey,
    simulationStatus: {
      stationKey,
      firstStageCompletion: options.firstStageCompletion,
      engineer: options.engineer,
      raw: {}
    },
    tools: Array(options.tools ?? 0).fill(null).map((_, idx) => ({
      stationKey,
      toolId: `tool-${idx}`,
      raw: {}
    })),
    robots: Array(options.robots ?? 0).fill(null).map((_, idx) => ({
      stationKey,
      robotKey: `robot-${idx}`,
      hasDressPackInfo: true,
      raw: {}
    })),
    weldGuns: Array(options.weldGuns ?? 0).fill(null).map((_, idx) => ({
      stationKey,
      gunKey: `gun-${idx}`,
      raw: {}
    })),
    gunForces: [],
    risers: Array(options.risers ?? 0).fill(null).map(() => ({
      stationKey,
      raw: {}
    })),
    flags: options.flags ?? []
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('buildSnapshotDiff', () => {
  it('detects added cells', () => {
    const oldSnapshot = createTestSnapshot('old', 'proj-1', [
      createTestCell('OP_010')
    ])
    
    const newSnapshot = createTestSnapshot('new', 'proj-1', [
      createTestCell('OP_010'),
      createTestCell('OP_020')
    ])
    
    const diff = buildSnapshotDiff(oldSnapshot, newSnapshot)
    
    expect(diff.fromId).toBe('old')
    expect(diff.toId).toBe('new')
    expect(diff.summary.cellsAdded).toBe(1)
    expect(diff.summary.cellsRemoved).toBe(0)
    
    const addedCell = diff.cells.find(c => c.stationKey === 'OP_020')
    expect(addedCell).toBeDefined()
    expect(addedCell?.added).toBe(true)
  })
  
  it('detects removed cells', () => {
    const oldSnapshot = createTestSnapshot('old', 'proj-1', [
      createTestCell('OP_010'),
      createTestCell('OP_020')
    ])
    
    const newSnapshot = createTestSnapshot('new', 'proj-1', [
      createTestCell('OP_010')
    ])
    
    const diff = buildSnapshotDiff(oldSnapshot, newSnapshot)
    
    expect(diff.summary.cellsRemoved).toBe(1)
    expect(diff.summary.cellsAdded).toBe(0)
    
    const removedCell = diff.cells.find(c => c.stationKey === 'OP_020')
    expect(removedCell).toBeDefined()
    expect(removedCell?.removed).toBe(true)
  })
  
  it('detects completion changes', () => {
    const oldSnapshot = createTestSnapshot('old', 'proj-1', [
      createTestCell('OP_010', { firstStageCompletion: 50 })
    ])
    
    const newSnapshot = createTestSnapshot('new', 'proj-1', [
      createTestCell('OP_010', { firstStageCompletion: 75 })
    ])
    
    const diff = buildSnapshotDiff(oldSnapshot, newSnapshot)
    
    expect(diff.summary.cellsModified).toBe(1)
    
    const modifiedCell = diff.cells.find(c => c.stationKey === 'OP_010')
    expect(modifiedCell).toBeDefined()
    expect(modifiedCell?.completionChange).toBeDefined()
    expect(modifiedCell?.completionChange?.fromFirstStage).toBe(50)
    expect(modifiedCell?.completionChange?.toFirstStage).toBe(75)
  })
  
  it('detects owner changes', () => {
    const oldSnapshot = createTestSnapshot('old', 'proj-1', [
      createTestCell('OP_010', { engineer: 'Werner' })
    ])
    
    const newSnapshot = createTestSnapshot('new', 'proj-1', [
      createTestCell('OP_010', { engineer: 'Dale' })
    ])
    
    const diff = buildSnapshotDiff(oldSnapshot, newSnapshot)
    
    const modifiedCell = diff.cells.find(c => c.stationKey === 'OP_010')
    expect(modifiedCell?.ownerChange).toBeDefined()
    expect(modifiedCell?.ownerChange?.from).toBe('Werner')
    expect(modifiedCell?.ownerChange?.to).toBe('Dale')
  })
  
  it('detects flag changes', () => {
    const warningFlag: CrossRefFlag = {
      type: 'MISSING_GUN_FORCE_FOR_WELD_GUN',
      stationKey: 'OP_010',
      message: 'Gun missing force data',
      severity: 'WARNING'
    }
    
    const oldSnapshot = createTestSnapshot('old', 'proj-1', [
      createTestCell('OP_010', { flags: [warningFlag] })
    ])
    
    const newSnapshot = createTestSnapshot('new', 'proj-1', [
      createTestCell('OP_010', { flags: [] })
    ])
    
    const diff = buildSnapshotDiff(oldSnapshot, newSnapshot)
    
    const modifiedCell = diff.cells.find(c => c.stationKey === 'OP_010')
    expect(modifiedCell?.flagsRemoved.length).toBe(1)
    expect(modifiedCell?.flagsAdded.length).toBe(0)
    expect(diff.summary.resolvedFlagsCount).toBe(1)
  })
  
  it('detects asset count changes', () => {
    const oldSnapshot = createTestSnapshot('old', 'proj-1', [
      createTestCell('OP_010', { robots: 2, tools: 3 })
    ])
    
    const newSnapshot = createTestSnapshot('new', 'proj-1', [
      createTestCell('OP_010', { robots: 4, tools: 3 })
    ])
    
    const diff = buildSnapshotDiff(oldSnapshot, newSnapshot)
    
    const modifiedCell = diff.cells.find(c => c.stationKey === 'OP_010')
    expect(modifiedCell?.assetChanges?.robotsDelta).toBe(2)
    expect(modifiedCell?.assetChanges?.toolsDelta).toBe(0)
  })
  
  it('ignores unchanged cells', () => {
    const cell = createTestCell('OP_010', { firstStageCompletion: 50 })
    
    const oldSnapshot = createTestSnapshot('old', 'proj-1', [cell])
    const newSnapshot = createTestSnapshot('new', 'proj-1', [cell])
    
    const diff = buildSnapshotDiff(oldSnapshot, newSnapshot)
    
    expect(diff.cells.length).toBe(0)
    expect(diff.summary.cellsModified).toBe(0)
    expect(diff.summary.cellsUnchanged).toBe(1)
  })
  
  it('calculates correct summary statistics', () => {
    const oldSnapshot = createTestSnapshot('old', 'proj-1', [
      createTestCell('OP_010', { firstStageCompletion: 50 }),
      createTestCell('OP_020', { firstStageCompletion: 30 }),
      createTestCell('OP_030')
    ])
    
    const newSnapshot = createTestSnapshot('new', 'proj-1', [
      createTestCell('OP_010', { firstStageCompletion: 75 }), // modified
      createTestCell('OP_020', { firstStageCompletion: 30 }), // unchanged
      createTestCell('OP_040') // added (OP_030 removed)
    ])
    
    const diff = buildSnapshotDiff(oldSnapshot, newSnapshot)
    
    expect(diff.summary.cellsAdded).toBe(1)
    expect(diff.summary.cellsRemoved).toBe(1)
    expect(diff.summary.cellsModified).toBe(1)
  })
})

describe('describeCellDelta', () => {
  it('describes added cell', () => {
    const delta = {
      stationKey: 'OP_010',
      added: true,
      removed: false,
      metricDeltas: [],
      flagsAdded: [],
      flagsRemoved: []
    }
    
    const descriptions = describeCellDelta(delta)
    
    expect(descriptions.length).toBe(1)
    expect(descriptions[0]).toContain('added')
  })
  
  it('describes owner change', () => {
    const delta = {
      stationKey: 'OP_010',
      added: false,
      removed: false,
      metricDeltas: [],
      ownerChange: { from: 'Werner', to: 'Dale' },
      flagsAdded: [],
      flagsRemoved: []
    }
    
    const descriptions = describeCellDelta(delta)
    
    expect(descriptions.some(d => d.includes('Werner') && d.includes('Dale'))).toBe(true)
  })
})

describe('describeDiffSummary', () => {
  it('generates readable summary', () => {
    const summary = {
      cellsAdded: 2,
      cellsRemoved: 1,
      cellsModified: 5,
      cellsUnchanged: 10,
      metricsImproved: 8,
      metricsRegressed: 2,
      avgCompletionDelta: 5.5,
      newFlagsCount: 1,
      resolvedFlagsCount: 3
    }
    
    const text = describeDiffSummary(summary)
    
    expect(text).toContain('+2')
    expect(text).toContain('−1')
    expect(text).toContain('5 modified')
    expect(text).toContain('+5.5%')
    expect(text).toContain('3 issues resolved')
  })
  
  it('handles no changes', () => {
    const summary = {
      cellsAdded: 0,
      cellsRemoved: 0,
      cellsModified: 0,
      cellsUnchanged: 10,
      metricsImproved: 0,
      metricsRegressed: 0,
      newFlagsCount: 0,
      resolvedFlagsCount: 0
    }
    
    const text = describeDiffSummary(summary)
    
    expect(text).toBe('No changes')
  })
})
