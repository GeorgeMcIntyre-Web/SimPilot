/**
 * Unit tests for realDataRegress categorization
 */

import { describe, it, expect } from 'vitest'
import { categorizeByFilename, walkDirectory, type CategorizedFile } from '../realDataRegress'

describe('categorizeByFilename', () => {
  describe('Simulation Status detection', () => {
    it('should detect simulation status from "simulation" + "status" pattern', () => {
      const result = categorizeByFilename('STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('SimulationStatus')
      expect(result?.confidence).toBe('high')
      expect(result?.reason).toContain('simulation')
      expect(result?.reason).toContain('status')
    })

    it('should detect simulation status from sim_status pattern', () => {
      const result = categorizeByFilename('project_sim_status_v2.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('SimulationStatus')
      expect(result?.confidence).toBe('high')
    })

    it('should be case insensitive', () => {
      const result = categorizeByFilename('SIMULATION_STATUS_REPORT.XLSX')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('SimulationStatus')
    })
  })

  describe('Robot List detection', () => {
    it('should detect robot list from "robot" + "list" pattern', () => {
      const result = categorizeByFilename('Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('RobotList')
      expect(result?.confidence).toBe('high')
    })

    it('should detect robot list from "robot" + "spec" pattern', () => {
      const result = categorizeByFilename('Robot_Specifications_V801.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('RobotList')
      expect(result?.confidence).toBe('high')
    })

    it('should handle robot_list pattern', () => {
      const result = categorizeByFilename('robot_list_2024.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('RobotList')
      expect(result?.confidence).toBe('high')
    })
  })

  describe('Tool List detection', () => {
    it('should detect tool list from "tool" keyword', () => {
      const result = categorizeByFilename('STLA_S_ZAR Tool List.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('ToolList')
      expect(result?.confidence).toBe('high')
      expect(result?.reason).toContain('tool')
    })

    it('should detect tool list from "weld" + "gun" keywords', () => {
      const result = categorizeByFilename('Weld_Gun_List_BMW.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('ToolList')
      expect(result?.confidence).toBe('high')
      expect(result?.reason).toContain('weld')
    })

    it('should assign medium confidence for "weld" without "list"', () => {
      const result = categorizeByFilename('Weld_Gun_Configuration_BMW.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('ToolList')
      expect(result?.confidence).toBe('medium')
      expect(result?.reason).toContain('weld')
    })

    it('should detect tool list from "gun" keyword', () => {
      const result = categorizeByFilename('Gun_List_SideFrame.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('ToolList')
      expect(result?.confidence).toBe('high')
      expect(result?.reason).toContain('gun')
    })

    it('should detect tool list from "equipment" keyword', () => {
      const result = categorizeByFilename('Ford_OHAP_V801N_Robot_Equipment_List.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('ToolList')
      expect(result?.confidence).toBe('high')
      expect(result?.reason).toContain('equipment')
    })

    it('should assign medium confidence when tool keyword but no list', () => {
      const result = categorizeByFilename('Weld_Analysis.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('ToolList')
      expect(result?.confidence).toBe('medium')
    })
  })

  describe('Assemblies List detection', () => {
    it('should detect assemblies from "assemblies" keyword', () => {
      const result = categorizeByFilename('J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('AssembliesList')
      expect(result?.confidence).toBe('high')
    })

    it('should detect assemblies from "assembly" keyword', () => {
      const result = categorizeByFilename('Assembly_Progress_Report.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('AssembliesList')
      expect(result?.confidence).toBe('high')
    })
  })

  describe('Unknown files', () => {
    it('should return Unknown for files with no clear pattern', () => {
      const result = categorizeByFilename('Budget_Report_2024.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('Unknown')
      expect(result?.confidence).toBe('low')
    })

    it('should return Unknown for generic names', () => {
      const result = categorizeByFilename('data.xlsx')

      expect(result).not.toBeNull()
      expect(result?.sourceType).toBe('Unknown')
      expect(result?.confidence).toBe('low')
    })
  })

  describe('File extensions', () => {
    it('should handle .xlsx files', () => {
      const result = categorizeByFilename('robot_list.xlsx')
      expect(result?.sourceType).toBe('RobotList')
    })

    it('should handle .xlsm files', () => {
      const result = categorizeByFilename('assemblies_list.xlsm')
      expect(result?.sourceType).toBe('AssembliesList')
    })

    it('should handle .xls files', () => {
      const result = categorizeByFilename('tool_list.xls')
      expect(result?.sourceType).toBe('ToolList')
    })
  })
})

describe('walkDirectory', () => {
  it('should return array of file paths', () => {
    // Note: This test would require a fixture directory
    // For now, just verify the function exports and has correct signature
    expect(typeof walkDirectory).toBe('function')
  })
})
