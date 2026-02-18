import { describe, it, expect } from 'vitest'
import { categoryToFileKind } from '../sheetSniffer'

describe('categoryToFileKind', () => {
  it('maps SIMULATION_STATUS to SimulationStatus', () => {
    expect(categoryToFileKind('SIMULATION_STATUS')).toBe('SimulationStatus')
  })

  it('maps ROBOT_SPECS to RobotList', () => {
    expect(categoryToFileKind('ROBOT_SPECS')).toBe('RobotList')
  })

  it('maps tool categories to ToolList', () => {
    expect(categoryToFileKind('IN_HOUSE_TOOLING')).toBe('ToolList')
    expect(categoryToFileKind('REUSE_WELD_GUNS')).toBe('ToolList')
    expect(categoryToFileKind('GUN_FORCE')).toBe('ToolList')
    expect(categoryToFileKind('REUSE_RISERS')).toBe('ToolList')
  })

  it('maps METADATA to Metadata', () => {
    expect(categoryToFileKind('METADATA')).toBe('Metadata')
  })

  it('maps UNKNOWN to Unknown', () => {
    expect(categoryToFileKind('UNKNOWN')).toBe('Unknown')
  })
})
