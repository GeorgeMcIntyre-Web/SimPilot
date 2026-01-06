import { describe, it, expect } from 'vitest'
import {
  buildStationKey,
  buildToolKey,
  buildRobotKey,
  isKeyDerivationError
} from '../keyDerivation'

describe('buildStationKey', () => {
  it('should build key from line + bay + station', () => {
    const result = buildStationKey({
      line: 'AL',
      bay: '010',
      station: '10'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('AL_010-010')
      expect(result.strategy).toBe('line_bay_station')
      expect(result.labels.stationNo).toBe('010')
    }
  })

  it('should build key from area + station', () => {
    const result = buildStationKey({
      area: 'REAR UNIT',
      station: '008'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('REAR UNIT|008')
      expect(result.strategy).toBe('area_station')
    }
  })

  it('should use fullLabel fallback', () => {
    const result = buildStationKey({
      stationLabel: 'CA008'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('CA008')
      expect(result.strategy).toBe('fullLabel')
    }
  })

  it('should normalize station numbers to 3 digits', () => {
    const result = buildStationKey({
      area: 'FRONT UNIT',
      station: '5'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.labels.stationNo).toBe('005')
      expect(result.key).toBe('FRONT UNIT|005')
    }
  })

  it('should strip station prefixes', () => {
    const result = buildStationKey({
      area: 'REAR UNIT',
      station: 'OP010'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.labels.stationNo).toBe('010')
    }
  })

  it('should strip ST prefix', () => {
    const result = buildStationKey({
      area: 'REAR UNIT',
      station: 'ST012'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.labels.stationNo).toBe('012')
    }
  })

  it('should return error if insufficient columns', () => {
    const result = buildStationKey({
      someOtherField: 'value'
    })

    expect(isKeyDerivationError(result)).toBe(true)
    if (isKeyDerivationError(result)) {
      expect(result.code).toBe('MISSING_COLUMNS')
      expect(result.message).toContain('missing required fields')
    }
  })

  it('should handle case-insensitive column names', () => {
    const result = buildStationKey({
      LINE: 'bn',
      BAY: '010',
      Station: '12'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('BN_010-012')
    }
  })

  it('should handle mixed case area names', () => {
    const result = buildStationKey({
      area: 'Rear Unit',
      station: '10'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('REAR UNIT|010')
    }
  })

  it('should prioritize line+bay+station over area+station', () => {
    const result = buildStationKey({
      line: 'CA',
      bay: '008',
      station: '10',
      area: 'REAR UNIT'
    })

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.strategy).toBe('line_bay_station')
      expect(result.key).toBe('CA_008-010')
    }
  })
})

describe('buildToolKey', () => {
  it('should build key from station + toolCode', () => {
    const result = buildToolKey(
      { tool: 'GJR 10' },
      'AL_010-010'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('AL_010-010::GJR 10')
      expect(result.labels.toolCode).toBe('GJR 10')
    }
  })

  it('should fallback to gunNumber', () => {
    const result = buildToolKey(
      { gun: 'GUN 05' },
      'CA_008-010'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('CA_008-010::GUN 05')
    }
  })

  it('should fallback to toolName', () => {
    const result = buildToolKey(
      { toolName: 'Spot Weld Gun 3' },
      'REAR UNIT|010'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('REAR UNIT|010::SPOT WELD GUN 3')
    }
  })

  it('should return error if no tool identifier', () => {
    const result = buildToolKey(
      { someOtherField: 'value' },
      'AL_010-010'
    )

    expect(isKeyDerivationError(result)).toBe(true)
    if (isKeyDerivationError(result)) {
      expect(result.code).toBe('MISSING_COLUMNS')
      expect(result.message).toContain('missing tool identifier')
    }
  })

  it('should handle case-insensitive tool fields', () => {
    const result = buildToolKey(
      { TOOL: 'gjr 15' },
      'BN_012-020'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('BN_012-020::GJR 15')
    }
  })

  it('should normalize tool codes', () => {
    const result = buildToolKey(
      { tool: '  GJR  10  ' },
      'AL_010-010'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('AL_010-010::GJR 10')
    }
  })
})

describe('buildRobotKey', () => {
  it('should build key from station + robotCaption', () => {
    const result = buildRobotKey(
      { robot: 'R01' },
      'AL_010-010'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('AL_010-010::R:R01')
      expect(result.labels.robotCaption).toBe('R01')
    }
  })

  it('should fallback to robotName', () => {
    const result = buildRobotKey(
      { robotName: 'Robot 1' },
      'CA_008-010'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('CA_008-010::R:ROBOT 1')
    }
  })

  it('should return error if no robot identifier', () => {
    const result = buildRobotKey(
      { someOtherField: 'value' },
      'AL_010-010'
    )

    expect(isKeyDerivationError(result)).toBe(true)
    if (isKeyDerivationError(result)) {
      expect(result.code).toBe('MISSING_COLUMNS')
      expect(result.message).toContain('missing robot identifier')
    }
  })

  it('should handle case-insensitive robot fields', () => {
    const result = buildRobotKey(
      { ROBOT: 'r02' },
      'BN_012-020'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.key).toBe('BN_012-020::R:R02')
    }
  })

  it('should capture E-Number in labels', () => {
    const result = buildRobotKey(
      { robot: 'R01', eNumber: 'E12345' },
      'AL_010-010'
    )

    expect(isKeyDerivationError(result)).toBe(false)
    if (!isKeyDerivationError(result)) {
      expect(result.labels.eNumber).toBe('E12345')
    }
  })
})
