import { describe, expect, it } from 'vitest'
import { resolveHeaderMappings } from '../mappingRegistry'
import { validateSemanticMappings } from '../semanticValidator'
import type { SemanticFieldDefinition } from '../types'

describe('semanticValidator', () => {
  it('reports missing required semantic fields', () => {
    const customDefinitions: SemanticFieldDefinition[] = [
      {
        domain: 'toolList',
        key: 'custom.station',
        aliases: ['STATION'],
        required: true,
      },
      {
        domain: 'toolList',
        key: 'custom.robot',
        aliases: ['ROBOT'],
        required: true,
      },
    ]

    const resolution = resolveHeaderMappings(['Station'], 'toolList', {
      definitions: customDefinitions,
    })
    const validation = validateSemanticMappings({
      fileName: 'test.xlsx',
      sheetName: 'Data',
      resolution,
    })

    expect(validation.report.missingRequiredFields).toBe(1)
    expect(validation.ambiguities.some((item) => item.kind === 'MISSING_REQUIRED_FIELD')).toBe(true)
  })

  it('reports ambiguous and unmapped headers in a single pass', () => {
    const customDefinitions: SemanticFieldDefinition[] = [
      {
        domain: 'toolList',
        key: 'alpha.station',
        aliases: ['STATION'],
        required: false,
      },
      {
        domain: 'toolList',
        key: 'beta.station',
        aliases: ['STATION'],
        required: false,
      },
    ]
    const resolution = resolveHeaderMappings(['Station', 'Mystery Header'], 'toolList', {
      definitions: customDefinitions,
    })
    const validation = validateSemanticMappings({
      fileName: 'test.xlsx',
      sheetName: 'Data',
      resolution,
    })

    expect(validation.report.ambiguousHeaders).toBe(1)
    expect(validation.report.unmappedHeaders).toBe(1)
    expect(validation.ambiguities.some((item) => item.kind === 'AMBIGUOUS_HEADER')).toBe(true)
    expect(validation.ambiguities.some((item) => item.kind === 'UNMAPPED_HEADER')).toBe(true)
  })
})
