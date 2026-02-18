import { describe, it, expect } from 'vitest'
import { scanWorkbook } from '../sheetSniffer'
import { createMockWorkbook } from './helpers'

describe('sheet name scoring', () => {
  describe('SIMULATION_STATUS name preferences', () => {
    it('prefers sheet named "SIMULATION"', () => {
      const workbook = createMockWorkbook({
        SIMULATION: [
          ['ROBOT POSITION - STAGE 1', 'DCS CONFIGURED', 'AREA', 'STATION'],
          ...Array(30).fill(['val1', 'val2', 'val3', 'val4']),
        ],
        DATA: [
          [
            '1st STAGE SIM COMPLETION',
            'FINAL DELIVERABLES',
            'ROBOT POSITION - STAGE 1',
            'DCS CONFIGURED',
          ],
          ...Array(30).fill(['val1', 'val2', 'val3', 'val4']),
        ],
      })

      const result = scanWorkbook(workbook, 'test.xlsx', 50)

      expect(result.bestOverall?.sheetName).toBe('SIMULATION')
      expect(result.bestOverall?.nameScore).toBe(20)
    })

    it('applies +15 bonus for status_* pattern', () => {
      const workbook = createMockWorkbook({
        status_main: [
          ['ROBOT POSITION - STAGE 1', 'DCS CONFIGURED', 'AREA'],
          ...Array(30).fill(['val1', 'val2', 'val3']),
        ],
      })

      const result = scanWorkbook(workbook, 'test.xlsx', 50)

      expect(result.bestOverall?.nameScore).toBe(15)
    })

    it('penalizes generic names like DATA', () => {
      const workbook = createMockWorkbook({
        DATA: [
          ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', 'ROBOT POSITION - STAGE 1'],
          ...Array(30).fill(['val1', 'val2', 'val3']),
        ],
      })

      const result = scanWorkbook(workbook, 'test.xlsx', 50)

      expect(result.bestOverall?.nameScore).toBe(-10)
    })
  })

  describe('IN_HOUSE_TOOLING name preferences', () => {
    it('prefers sheet names containing "tool"', () => {
      const toolListData: string[][] = [
        ['Tool ID', 'Sim. Leader', 'Sim. Employee', 'Team Leader'],
        ['T-001', 'John', 'Jane', 'Bob'],
        ['T-002', 'John', 'Jane', 'Bob'],
        ['T-003', 'John', 'Jane', 'Bob'],
      ]
      for (let i = 4; i < 30; i++) {
        toolListData.push(['T-' + String(i).padStart(3, '0'), 'John', 'Jane', 'Bob'])
      }

      const sheet1Data: string[][] = [
        ['Tool ID', 'Sim. Leader', 'Sim. Employee', 'Team Leader'],
        ['T-001', 'John', 'Jane', 'Bob'],
        ['T-002', 'John', 'Jane', 'Bob'],
        ['T-003', 'John', 'Jane', 'Bob'],
      ]
      for (let i = 4; i < 30; i++) {
        sheet1Data.push(['T-' + String(i).padStart(3, '0'), 'John', 'Jane', 'Bob'])
      }

      const workbook = createMockWorkbook({
        ToolList: toolListData,
        Main: sheet1Data,
      })

      const result = scanWorkbook(workbook, 'test.xlsx', 50)

      const toolListDetection = result.allDetections.find((d) => d.sheetName === 'ToolList')
      const mainDetection = result.allDetections.find((d) => d.sheetName === 'Main')

      expect(toolListDetection).toBeDefined()
      expect(mainDetection).toBeDefined()
      if (toolListDetection && mainDetection) {
        expect(toolListDetection.score).toBeGreaterThan(mainDetection.score)
      }
    })
  })

  describe('ROBOT_SPECS name preferences', () => {
    it('prefers sheet names containing "robot"', () => {
      const robotSpecsData: string[][] = [
        ['Robotnumber', 'Robot caption', 'Model', 'Reach'],
        ['R001', 'Robot1', 'ModelX', '1000'],
        ['R002', 'Robot2', 'ModelY', '2000'],
        ['R003', 'Robot3', 'ModelZ', '3000'],
      ]
      for (let i = 4; i < 30; i++) {
        robotSpecsData.push(['R' + String(i).padStart(3, '0'), 'Robot' + i, 'ModelX', '1000'])
      }

      const sheet1Data: string[][] = [
        ['Robotnumber', 'Robot caption', 'Model', 'Reach'],
        ['R001', 'Robot1', 'ModelX', '1000'],
        ['R002', 'Robot2', 'ModelY', '2000'],
        ['R003', 'Robot3', 'ModelZ', '3000'],
      ]
      for (let i = 4; i < 30; i++) {
        sheet1Data.push(['R' + String(i).padStart(3, '0'), 'Robot' + i, 'ModelX', '1000'])
      }

      const workbook = createMockWorkbook({
        RobotSpecs: robotSpecsData,
        Main: sheet1Data,
      })

      const result = scanWorkbook(workbook, 'test.xlsx', 50)

      const robotDetection = result.allDetections.find((d) => d.sheetName === 'RobotSpecs')
      const mainDetection = result.allDetections.find((d) => d.sheetName === 'Main')

      expect(robotDetection).toBeDefined()
      expect(mainDetection).toBeDefined()
      if (robotDetection && mainDetection) {
        expect(robotDetection.score).toBeGreaterThan(mainDetection.score)
      }
    })
  })

  it('includes nameScore in detection result', () => {
    const workbook = createMockWorkbook({
      status_data: [['ROBOT POSITION - STAGE 1', 'AREA'], ...Array(30).fill(['val1', 'val2'])],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.bestOverall?.nameScore).toBeDefined()
    expect(result.bestOverall?.nameScore).toBe(15)
  })
})
