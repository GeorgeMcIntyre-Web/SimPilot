import { describe, expect, it } from 'vitest'
import { resolveHeaderMappings } from '../mappingRegistry'
import type { SemanticFieldDefinition } from '../types'

describe('mappingRegistry', () => {
  it('maps known tool-list headers to semantic fields', () => {
    const resolution = resolveHeaderMappings(
      ['Area Name', 'Station', 'Equipment Type', 'Tooling Number RH'],
      'toolList',
    )

    const byHeader = new Map(resolution.mappings.map((mapping) => [mapping.header, mapping]))

    expect(byHeader.get('Area Name')?.status).toBe('mapped')
    expect(byHeader.get('Area Name')?.matchedField).toBe('tool.areaName')
    expect(byHeader.get('Station')?.matchedField).toBe('tool.station')
    expect(byHeader.get('Equipment Type')?.matchedField).toBe('tool.equipmentType')
    expect(byHeader.get('Tooling Number RH')?.matchedField).toBe('tool.toolingNumber')
  })

  it('marks unknown headers as unmapped', () => {
    const resolution = resolveHeaderMappings(['Completely Unknown Header'], 'toolList')
    expect(resolution.mappings).toHaveLength(1)
    expect(resolution.mappings[0].status).toBe('unmapped')
  })

  it('marks conflicting best matches as ambiguous', () => {
    const customDefinitions: SemanticFieldDefinition[] = [
      {
        domain: 'toolList',
        key: 'field.one',
        aliases: ['STATION'],
        required: false,
      },
      {
        domain: 'toolList',
        key: 'field.two',
        aliases: ['STATION'],
        required: false,
      },
    ]
    const resolution = resolveHeaderMappings(['Station'], 'toolList', {
      definitions: customDefinitions,
    })

    expect(resolution.mappings[0].status).toBe('ambiguous')
    expect(resolution.mappings[0].candidates).toEqual(['field.one', 'field.two'])
  })
})
