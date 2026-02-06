import { describe, it, expect } from 'vitest'
import { calculateDiff, getTotalChanges, hasChanges } from '../diffCalculator'
import type { CoreStoreState } from '../../domain/coreStore'
import type { Area, Cell, Project, UnifiedAsset } from '../../domain/core'

const makeState = (partial: Partial<CoreStoreState> = {}): CoreStoreState => ({
  projects: [],
  areas: [],
  cells: [],
  assets: [],
  warnings: [],
  changeLog: [],
  lastUpdated: null,
  dataSource: null,
  referenceData: { employees: [], suppliers: [] },
  stationRecords: [],
  toolRecords: [],
  robotRecords: [],
  aliasRules: [],
  importRuns: [],
  diffResults: [],
  auditLog: [],
  ...partial,
})

const makeAsset = (
  overrides: Partial<UnifiedAsset> & Pick<UnifiedAsset, 'id' | 'kind'>,
): UnifiedAsset => ({
  name: overrides.name ?? overrides.id,
  sourcing: overrides.sourcing ?? 'UNKNOWN',
  metadata: overrides.metadata ?? {},
  sourceFile: overrides.sourceFile ?? 'test.xlsx',
  sheetName: overrides.sheetName ?? 'Sheet1',
  rowIndex: overrides.rowIndex ?? 1,
  ...overrides,
})

describe('diffCalculator', () => {
  it('calculates added/removed/modified items with field-level changes', () => {
    const project: Project = {
      id: 'proj-1',
      name: 'Project 1',
      customer: 'ACME',
      status: 'Planning',
    }

    const areaOld: Area = {
      id: 'area-1',
      projectId: project.id,
      name: 'Area 1',
    }

    const areaNew: Area = {
      ...areaOld,
      name: 'Area One',
    }

    const cellOld: Cell = {
      id: 'cell-1',
      projectId: project.id,
      areaId: areaOld.id,
      name: 'Cell 1',
      code: '010',
      status: 'InProgress',
    }

    const cellAdded: Cell = {
      id: 'cell-2',
      projectId: project.id,
      areaId: areaOld.id,
      name: 'Cell 2',
      code: '020',
      status: 'NotStarted',
    }

    const toolOld = makeAsset({
      id: 'tool-1',
      kind: 'TOOL',
      name: '',
      sourceFile: 'old.xlsx',
      sheetName: 'Tools',
      rowIndex: 1,
      metadata: { status: 'old' },
      isActive: true,
    })

    const toolNew: UnifiedAsset = {
      ...toolOld,
      name: 'Tool One',
      sourceFile: 'new.xlsx',
      rowIndex: 2,
      isActive: false,
      metadata: { status: 'new', extra: 'nested' },
    }

    const robotRemoved = makeAsset({
      id: 'robot-1',
      kind: 'ROBOT',
      name: 'R-001',
      sourceFile: 'old.xlsx',
      sheetName: 'Robots',
      rowIndex: 1,
    })

    const robotAdded = makeAsset({
      id: 'robot-2',
      kind: 'ROBOT',
      name: 'R-002',
      sourceFile: 'new.xlsx',
      sheetName: 'Robots',
      rowIndex: 2,
    })

    const oldState = makeState({
      projects: [project],
      areas: [areaOld],
      cells: [cellOld],
      assets: [toolOld, robotRemoved],
    })

    const newState = makeState({
      projects: [project],
      areas: [areaNew],
      cells: [cellOld, cellAdded],
      assets: [toolNew, robotAdded],
    })

    const diff = calculateDiff(oldState, newState, 't1', 't2')

    expect(diff.added.robots).toBe(1)
    expect(diff.removed.robots).toBe(1)
    expect(diff.modified.tools).toBe(1)
    expect(diff.added.cells).toBe(1)
    expect(diff.modified.areas).toBe(1)

    const modifiedTool = diff.modifiedItems.find((item) => item.id === 'tool-1')
    expect(modifiedTool).toBeDefined()
    expect(
      modifiedTool?.changes.some((c) => c.field === 'name' && c.oldValueDisplay === '(empty)'),
    ).toBe(true)
    expect(
      modifiedTool?.changes.some((c) => c.field === 'isActive' && c.newValueDisplay === 'No'),
    ).toBe(true)
    expect(
      modifiedTool?.changes.some((c) => c.field === 'sourceFile' && c.fieldLabel === 'sourceFile'),
    ).toBe(true)

    const modifiedArea = diff.modifiedItems.find(
      (item) => item.id === 'area-1' && item.kind === 'AREA',
    )
    expect(modifiedArea).toBeDefined()

    expect(hasChanges(diff)).toBe(true)
    expect(getTotalChanges(diff)).toBe(
      diff.addedItems.length + diff.removedItems.length + diff.modifiedItems.length,
    )
    expect(diff.summary).not.toBe('No changes detected')
  })

  it('returns a no-op diff when states are identical', () => {
    const state = makeState()
    const diff = calculateDiff(state, state, 't1', 't2')

    expect(hasChanges(diff)).toBe(false)
    expect(getTotalChanges(diff)).toBe(0)
    expect(diff.summary).toBe('No changes detected')
  })
})
