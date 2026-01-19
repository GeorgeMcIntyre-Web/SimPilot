// @vitest-environment node

import { beforeEach, describe, expect, it } from 'vitest'
import { applyIngestedData } from '../applyIngestedData'
import { coreStore } from '../../domain/coreStore'
import type { Area, Cell, Project } from '../../domain/core'

describe('deduplication prefers latest simulation data', () => {
  beforeEach(() => {
    coreStore.clear()
  })

  it('replaces existing simulation cells when a new file has fresher values', () => {
    const project: Project = {
      id: 'project-1',
      name: 'STLA-S',
      customer: 'STLA-S',
      status: 'Running'
    }

    const area: Area = {
      id: 'area-1',
      projectId: project.id,
      name: 'UNDERBODY',
      code: 'L-01'
    }

    const initialCell: Cell = {
      id: 'cell-1',
      projectId: project.id,
      areaId: area.id,
      name: 'Station 010',
      code: '010',
      stationId: 'UNDERBODY|010',
      status: 'InProgress',
      lineCode: 'L-01',
      assignedEngineer: 'Old Engineer',
      simulation: {
        percentComplete: 20,
        hasIssues: false,
        metrics: {},
        sourceFile: 'old.xlsx',
        sheetName: 'SIMULATION',
        rowIndex: 2
      }
    }

    coreStore.setData({
      projects: [project],
      areas: [area],
      cells: [initialCell],
      robots: [],
      tools: [],
      warnings: []
    })

    const updatedCell: Cell = {
      ...initialCell,
      assignedEngineer: 'New Engineer',
      simulation: {
        ...initialCell.simulation!,
        percentComplete: 85,
        sourceFile: 'new.xlsx'
      }
    }

    const result = applyIngestedData({
      simulation: {
        projects: [{ ...project }],
        areas: [{ ...area }],
        cells: [updatedCell],
        warnings: []
      }
    })

    expect(result.cells).toHaveLength(1)
    const [cell] = result.cells
    expect(cell.simulation?.percentComplete).toBe(85)
    expect(cell.simulation?.sourceFile).toBe('new.xlsx')
    expect(cell.assignedEngineer).toBe('New Engineer')

    const collisionWarning = result.warnings.find(w => w.id === 'id-collisions')
    expect(collisionWarning?.message).toContain('Replaced existing records with the latest upload')
  })
})
