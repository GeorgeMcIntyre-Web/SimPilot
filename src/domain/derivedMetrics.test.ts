// Derived Metrics Tests
// Unit tests for business logic calculations

import { describe, it, expect, beforeEach } from 'vitest'
import { coreStore } from './coreStore'
import {
  getProjectMetrics,
  getAllProjectMetrics,
  getGlobalSimulationMetrics,
  getAllEngineerMetrics,
  getEngineerMetrics
} from './derivedMetrics'
import { Project, Area, Cell } from './core'

describe('derivedMetrics', () => {
  beforeEach(() => {
    // Clear store before each test
    coreStore.clear()
  })

  describe('getProjectMetrics', () => {
    it('should return correct metrics for a project with cells', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          simulation: {
            percentComplete: 100,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        },
        {
          id: 'cell-2',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 2',
          code: '020',
          status: 'InProgress',
          simulation: {
            percentComplete: 75,
            hasIssues: true,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 2
          }
        },
        {
          id: 'cell-3',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 3',
          code: '030',
          status: 'InProgress',
          simulation: {
            percentComplete: 50,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 3
          }
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getProjectMetrics('proj-1')

      expect(metrics.projectId).toBe('proj-1')
      expect(metrics.cellCount).toBe(3)
      expect(metrics.avgCompletion).toBe(75) // (100 + 75 + 50) / 3 = 75
      expect(metrics.atRiskCellsCount).toBe(2) // cell-2 (hasIssues), cell-3 (< 80%)
    })

    it('should return null avgCompletion when no cells have simulation data', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'NotStarted'
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getProjectMetrics('proj-1')

      expect(metrics.projectId).toBe('proj-1')
      expect(metrics.cellCount).toBe(1)
      expect(metrics.avgCompletion).toBeNull()
      expect(metrics.atRiskCellsCount).toBe(0)
    })
  })

  describe('getAllProjectMetrics', () => {
    it('should return metrics for all projects', () => {
      const projects: Project[] = [
        {
          id: 'proj-1',
          name: 'Project 1',
          customer: 'Customer A',
          status: 'Running'
        },
        {
          id: 'proj-2',
          name: 'Project 2',
          customer: 'Customer B',
          status: 'Running'
        }
      ]

      const areas: Area[] = [
        { id: 'area-1', projectId: 'proj-1', name: 'Area 1' },
        { id: 'area-2', projectId: 'proj-2', name: 'Area 2' }
      ]

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          simulation: {
            percentComplete: 90,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        },
        {
          id: 'cell-2',
          projectId: 'proj-2',
          areaId: 'area-2',
          name: 'Cell 2',
          code: '020',
          status: 'InProgress',
          simulation: {
            percentComplete: 60,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 2
          }
        }
      ]

      coreStore.setData({
        projects,
        areas,
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const allMetrics = getAllProjectMetrics()

      expect(allMetrics).toHaveLength(2)
      expect(allMetrics[0].projectId).toBe('proj-1')
      expect(allMetrics[0].avgCompletion).toBe(90)
      expect(allMetrics[1].projectId).toBe('proj-2')
      expect(allMetrics[1].avgCompletion).toBe(60)
      expect(allMetrics[1].atRiskCellsCount).toBe(1) // cell-2 < 80%
    })
  })

  describe('getGlobalSimulationMetrics', () => {
    it('should return correct global metrics across all projects', () => {
      const projects: Project[] = [
        { id: 'proj-1', name: 'Project 1', customer: 'Customer A', status: 'Running' },
        { id: 'proj-2', name: 'Project 2', customer: 'Customer B', status: 'Running' }
      ]

      const areas: Area[] = [
        { id: 'area-1', projectId: 'proj-1', name: 'Area 1' },
        { id: 'area-2', projectId: 'proj-2', name: 'Area 2' }
      ]

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          simulation: {
            percentComplete: 100,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        },
        {
          id: 'cell-2',
          projectId: 'proj-2',
          areaId: 'area-2',
          name: 'Cell 2',
          code: '020',
          status: 'Blocked',
          simulation: {
            percentComplete: 70,
            hasIssues: true,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 2
          }
        },
        {
          id: 'cell-3',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 3',
          code: '030',
          status: 'InProgress',
          simulation: {
            percentComplete: 50,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 3
          }
        }
      ]

      coreStore.setData({
        projects,
        areas,
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const globalMetrics = getGlobalSimulationMetrics()

      expect(globalMetrics.totalProjects).toBe(2)
      expect(globalMetrics.totalCells).toBe(3)
      expect(globalMetrics.avgCompletion).toBe(73) // (100 + 70 + 50) / 3 = 73.33 -> 73
      expect(globalMetrics.atRiskCellsCount).toBe(2) // cell-2 (hasIssues), cell-3 (< 80%)
    })

    it('should handle empty store', () => {
      const globalMetrics = getGlobalSimulationMetrics()

      expect(globalMetrics.totalProjects).toBe(0)
      expect(globalMetrics.totalCells).toBe(0)
      expect(globalMetrics.avgCompletion).toBeNull()
      expect(globalMetrics.atRiskCellsCount).toBe(0)
    })
  })

  describe('getAllEngineerMetrics', () => {
    it('should return empty array when no cells have engineers', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress'
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getAllEngineerMetrics()
      expect(metrics).toHaveLength(0)
    })

    it('should correctly aggregate metrics for a single engineer', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 90,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        },
        {
          id: 'cell-2',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 2',
          code: '020',
          status: 'InProgress',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 70,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 2
          }
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getAllEngineerMetrics()

      expect(metrics).toHaveLength(1)
      expect(metrics[0].engineerName).toBe('Dale Harris')
      expect(metrics[0].cellCount).toBe(2)
      expect(metrics[0].avgCompletion).toBe(80) // (90 + 70) / 2 = 80
      expect(metrics[0].projectIds).toEqual(['proj-1'])
      expect(metrics[0].atRiskCellsCount).toBe(1) // cell-2 (70 < 80)
    })

    it('should correctly aggregate metrics for multiple engineers', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 90,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        },
        {
          id: 'cell-2',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 2',
          code: '020',
          status: 'InProgress',
          assignedEngineer: 'John Smith',
          simulation: {
            percentComplete: 60,
            hasIssues: true,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 2
          }
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getAllEngineerMetrics()

      expect(metrics).toHaveLength(2)

      const daleMetrics = metrics.find(m => m.engineerName === 'Dale Harris')
      expect(daleMetrics).toBeDefined()
      expect(daleMetrics?.cellCount).toBe(1)
      expect(daleMetrics?.avgCompletion).toBe(90)
      expect(daleMetrics?.atRiskCellsCount).toBe(0)

      const johnMetrics = metrics.find(m => m.engineerName === 'John Smith')
      expect(johnMetrics).toBeDefined()
      expect(johnMetrics?.cellCount).toBe(1)
      expect(johnMetrics?.avgCompletion).toBe(60)
      expect(johnMetrics?.atRiskCellsCount).toBe(1) // hasIssues = true
    })

    it('should normalize engineer names by trimming whitespace', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          assignedEngineer: '  Dale Harris  ',
          simulation: {
            percentComplete: 90,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        },
        {
          id: 'cell-2',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 2',
          code: '020',
          status: 'InProgress',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 80,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 2
          }
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getAllEngineerMetrics()

      expect(metrics).toHaveLength(1)
      expect(metrics[0].engineerName).toBe('Dale Harris')
      expect(metrics[0].cellCount).toBe(2)
    })

    it('should correctly count at-risk cells based on AT_RISK_THRESHOLD', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 81,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        },
        {
          id: 'cell-2',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 2',
          code: '020',
          status: 'InProgress',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 79,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 2
          }
        },
        {
          id: 'cell-3',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 3',
          code: '030',
          status: 'Blocked',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 85,
            hasIssues: true,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 3
          }
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getAllEngineerMetrics()

      expect(metrics).toHaveLength(1)
      expect(metrics[0].atRiskCellsCount).toBe(2) // cell-2 (79 < 80), cell-3 (hasIssues)
    })
  })

  describe('getEngineerMetrics', () => {
    it('should return metrics for a specific engineer', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 90,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getEngineerMetrics('Dale Harris')

      expect(metrics).toBeDefined()
      expect(metrics?.engineerName).toBe('Dale Harris')
      expect(metrics?.cellCount).toBe(1)
    })

    it('should normalize engineer name when searching', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      const cells: Cell[] = [
        {
          id: 'cell-1',
          projectId: 'proj-1',
          areaId: 'area-1',
          name: 'Cell 1',
          code: '010',
          status: 'InProgress',
          assignedEngineer: 'Dale Harris',
          simulation: {
            percentComplete: 90,
            hasIssues: false,
            metrics: {},
            sourceFile: 'test.xlsx',
            sheetName: 'Sheet1',
            rowIndex: 1
          }
        }
      ]

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells,
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getEngineerMetrics('  Dale Harris  ')

      expect(metrics).toBeDefined()
      expect(metrics?.engineerName).toBe('Dale Harris')
    })

    it('should return undefined for unknown engineer', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Test Project',
        customer: 'Test Customer',
        status: 'Running'
      }

      const area: Area = {
        id: 'area-1',
        projectId: 'proj-1',
        name: 'Test Area'
      }

      coreStore.setData({
        projects: [project],
        areas: [area],
        cells: [],
        robots: [],
        tools: [],
        warnings: []
      })

      const metrics = getEngineerMetrics('Unknown Engineer')

      expect(metrics).toBeUndefined()
    })

    it('should return undefined for empty engineer name', () => {
      const metrics = getEngineerMetrics('')
      expect(metrics).toBeUndefined()
    })
  })
})
