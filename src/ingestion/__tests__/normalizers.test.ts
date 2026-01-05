// Normalizers Tests
// Tests for canonical ID building and normalization functions

import { describe, it, expect } from 'vitest'
import {
  normalizeAreaName,
  normalizeStationCode,
  buildStationId,
  buildRobotId,
  buildToolId,
  inferAssembliesAreaName,
  extractRawStationCodeFromAssembliesLabel
} from '../normalizers'

describe('normalizeAreaName', () => {
  it('should normalize area names consistently', () => {
    expect(normalizeAreaName('RR UN 1')).toBe('REAR UNIT')
    expect(normalizeAreaName('  rr   un  1  ')).toBe('REAR UNIT')
    expect(normalizeAreaName('rr un 1')).toBe('REAR UNIT')
    expect(normalizeAreaName('FR FL 2')).toBe('FRONT UNIT')
  })

  it('should return null for empty or null input', () => {
    expect(normalizeAreaName(null)).toBe(null)
    expect(normalizeAreaName(undefined)).toBe(null)
    expect(normalizeAreaName('')).toBe(null)
    expect(normalizeAreaName('   ')).toBe(null)
  })

  it('should collapse multiple spaces', () => {
    expect(normalizeAreaName('RR  UN   1')).toBe('REAR UNIT')
  })
})

describe('normalizeStationCode', () => {
  it('should normalize station codes consistently', () => {
    expect(normalizeStationCode('CA008')).toBe('CA8')
    expect(normalizeStationCode('010')).toBe('10')
    expect(normalizeStationCode('OP010')).toBe('10')
    expect(normalizeStationCode('ST-020')).toBe('20')
    expect(normalizeStationCode('STATION 030')).toBe('30')
  })

  it('should handle alphanumeric codes', () => {
    expect(normalizeStationCode('CA008')).toBe('CA8')
    expect(normalizeStationCode('DD010')).toBe('DD10')
    expect(normalizeStationCode('BN010')).toBe('BN10')
  })

  it('should return null for empty or null input', () => {
    expect(normalizeStationCode(null)).toBe(null)
    expect(normalizeStationCode(undefined)).toBe(null)
    expect(normalizeStationCode('')).toBe(null)
    expect(normalizeStationCode('   ')).toBe(null)
  })

  it('should strip leading zeros from numeric parts', () => {
    expect(normalizeStationCode('008')).toBe('8')
    expect(normalizeStationCode('0010')).toBe('10')
  })
})

describe('buildStationId', () => {
  it('should build station ID from area and station', () => {
    expect(buildStationId('RR UN 1', 'CA008')).toBe('REAR UNIT|CA8')
    expect(buildStationId('FR FL 2', '010')).toBe('FRONT UNIT|10')
  })

  it('should handle only station present', () => {
    expect(buildStationId(null, '010')).toBe('__GLOBAL__|10')
    expect(buildStationId(undefined, 'CA008')).toBe('__GLOBAL__|CA8')
  })

  it('should handle only area present', () => {
    expect(buildStationId('RR UN 1', null)).toBe('REAR UNIT|__NO_STATION__')
    expect(buildStationId('FR FL 2', undefined)).toBe('FRONT UNIT|__NO_STATION__')
  })

  it('should return null when both missing', () => {
    expect(buildStationId(null, null)).toBe(null)
    expect(buildStationId(undefined, undefined)).toBe(null)
    expect(buildStationId('', '')).toBe(null)
  })

  it('should normalize inputs before building', () => {
    expect(buildStationId('  rr  un  1  ', ' CA008 ')).toBe('REAR UNIT|CA8')
    expect(buildStationId('rr un 1', 'OP010')).toBe('REAR UNIT|10')
  })
})

describe('buildRobotId', () => {
  it('should build robot ID from station ID and caption', () => {
    const stationId = 'REAR UNIT|CA8'
    expect(buildRobotId(stationId, 'R01')).toBe('REAR UNIT|CA8|R:R01')
    expect(buildRobotId(stationId, 'R02')).toBe('REAR UNIT|CA8|R:R02')
  })

  it('should return null if stationId is missing', () => {
    expect(buildRobotId(null, 'R01')).toBe(null)
    expect(buildRobotId(undefined, 'R01')).toBe(null)
  })

  it('should return null if robotCaption is missing', () => {
    const stationId = 'REAR UNIT|CA8'
    expect(buildRobotId(stationId, null)).toBe(null)
    expect(buildRobotId(stationId, undefined)).toBe(null)
    expect(buildRobotId(stationId, '')).toBe(null)
  })

  it('should normalize robot caption', () => {
    const stationId = 'REAR UNIT|CA8'
    expect(buildRobotId(stationId, '  r01  ')).toBe('REAR UNIT|CA8|R:R01')
    expect(buildRobotId(stationId, 'robot 03')).toBe('REAR UNIT|CA8|R:ROBOT 03')
  })
})

describe('buildToolId', () => {
  it('should build tool ID from station ID and tool code', () => {
    const stationId = 'REAR UNIT|CA8'
    expect(buildToolId(stationId, 'GJR 10', null)).toBe('REAR UNIT|CA8|T:GJR 10')
    expect(buildToolId(stationId, 'T01', null)).toBe('REAR UNIT|CA8|T:T01')
  })

  it('should use fallback key if tool code is missing', () => {
    const stationId = 'REAR UNIT|CA8'
    expect(buildToolId(stationId, null, 'BN010 GJR 10')).toBe('REAR UNIT|CA8|T:BN010 GJR 10')
  })

  it('should return null if stationId is missing', () => {
    expect(buildToolId(null, 'GJR 10', null)).toBe(null)
    expect(buildToolId(undefined, 'GJR 10', null)).toBe(null)
  })

  it('should return null if both toolCode and fallback are missing', () => {
    const stationId = 'REAR UNIT|CA8'
    expect(buildToolId(stationId, null, null)).toBe(null)
    expect(buildToolId(stationId, undefined, undefined)).toBe(null)
    expect(buildToolId(stationId, '', '')).toBe(null)
  })

  it('should normalize tool code', () => {
    const stationId = 'REAR UNIT|CA8'
    expect(buildToolId(stationId, '  gjr 10  ', null)).toBe('REAR UNIT|CA8|T:GJR 10')
  })
})

describe('inferAssembliesAreaName', () => {
  it('should infer area from FRONT_UNIT filename', () => {
    expect(inferAssembliesAreaName({ filename: 'J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm' }))
      .toBe('FRONT UNIT')
  })

  it('should infer area from REAR_UNIT filename', () => {
    expect(inferAssembliesAreaName({ filename: 'STLA_S_REAR_UNIT_Assemblies_List.xlsm' }))
      .toBe('REAR UNIT')
  })

  it('should infer area from UNDERBODY filename', () => {
    expect(inferAssembliesAreaName({ filename: 'J11006_TMS_STLA_S_UNDERBODY_Assemblies_List.xlsm' }))
      .toBe('UNDERBODY')
  })

  it('should infer area from BOTTOM_TRAY filename', () => {
    expect(inferAssembliesAreaName({ filename: 'STLA_S_BOTTOM_TRAY_Assemblies_List.xlsm' }))
      .toBe('BOTTOM TRAY')
  })

  it('should return null for unrecognized filename', () => {
    expect(inferAssembliesAreaName({ filename: 'unknown_file.xlsx' }))
      .toBe(null)
  })

  it('should prefer workbook metadata over filename', () => {
    expect(inferAssembliesAreaName({
      filename: 'FRONT_UNIT_Assemblies_List.xlsm',
      workbookAreaCell: 'Rear Unit'
    })).toBe('REAR UNIT')
  })

  it('should normalize area from workbook metadata', () => {
    expect(inferAssembliesAreaName({
      filename: 'unknown.xlsx',
      workbookAreaCell: '  front  unit  '
    })).toBe('FRONT UNIT')
  })
})

describe('extractRawStationCodeFromAssembliesLabel', () => {
  it('should extract alphanumeric station codes', () => {
    expect(extractRawStationCodeFromAssembliesLabel('S010 GJR 02 - 03')).toBe('S010')
    expect(extractRawStationCodeFromAssembliesLabel('BN010 TT1')).toBe('BN010')
    expect(extractRawStationCodeFromAssembliesLabel('CA008 Tool X')).toBe('CA008')
  })

  it('should extract numeric station codes', () => {
    expect(extractRawStationCodeFromAssembliesLabel('010 GJR 5')).toBe('010')
    expect(extractRawStationCodeFromAssembliesLabel('20 Tool')).toBe('20')
  })

  it('should return null for empty or invalid input', () => {
    expect(extractRawStationCodeFromAssembliesLabel(null)).toBe(null)
    expect(extractRawStationCodeFromAssembliesLabel(undefined)).toBe(null)
    expect(extractRawStationCodeFromAssembliesLabel('')).toBe(null)
    expect(extractRawStationCodeFromAssembliesLabel('   ')).toBe(null)
  })

  it('should handle labels without station codes', () => {
    expect(extractRawStationCodeFromAssembliesLabel('GA')).toBe(null)
    expect(extractRawStationCodeFromAssembliesLabel('Base Unit')).toBe(null)
  })

  it('should extract station codes with various lengths', () => {
    expect(extractRawStationCodeFromAssembliesLabel('A1 Tool')).toBe('A1')
    expect(extractRawStationCodeFromAssembliesLabel('AB123 Tool')).toBe('AB123')
    expect(extractRawStationCodeFromAssembliesLabel('S1234 Tool')).toBe('S1234')
  })
})

describe('Integration: End-to-end ID building', () => {
  it('should build consistent IDs for real-world data', () => {
    // Simulation Status data
    const areaName = 'RR UN 1'
    const stationCode = 'CA008'

    const stationId = buildStationId(areaName, stationCode)
    expect(stationId).toBe('REAR UNIT|CA8')

    // Robot List data
    const robotCaption = 'R01'
    const robotId = buildRobotId(stationId, robotCaption)
    expect(robotId).toBe('REAR UNIT|CA8|R:R01')

    // Tool List data
    const toolCode = 'GJR 10'
    const toolId = buildToolId(stationId, toolCode, null)
    expect(toolId).toBe('REAR UNIT|CA8|T:GJR 10')
  })

  it('should handle different area/station formats from different OEMs', () => {
    // OEM 1 format
    const stationId1 = buildStationId('FR FL 1', '010')
    expect(stationId1).toBe('FRONT UNIT|10')

    // OEM 2 format (with prefixes)
    const stationId2 = buildStationId('UNDERBODY', 'OP010')
    expect(stationId2).toBe('UNDERBODY|10')

    // Same normalized station in both cases
    expect(stationId1?.split('|')[1]).toBe('10')
    expect(stationId2?.split('|')[1]).toBe('10')
  })

  it('should build consistent IDs for Assemblies List data', () => {
    // Infer area from filename
    const filename = 'J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm'
    const areaName = inferAssembliesAreaName({ filename })
    expect(areaName).toBe('FRONT UNIT')

    // Extract station code from compound label
    const label = 'S010 GJR 02 - 03'
    const rawStation = extractRawStationCodeFromAssembliesLabel(label)
    expect(rawStation).toBe('S010')

    // Build station ID
    const stationId = buildStationId(areaName, rawStation)
    expect(stationId).toBe('FRONT UNIT|S10')

    // Build tool ID
    const toolCode = 'GJR 02 - 03'
    const toolId = buildToolId(stationId, toolCode, null)
    expect(toolId).toBe('FRONT UNIT|S10|T:GJR 02 - 03')
  })
})
