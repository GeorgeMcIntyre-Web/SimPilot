import { describe, expect, it } from 'vitest'
import { resolveHeaderMappings, SEMANTIC_PROFILE_NAME_BY_DOMAIN } from '../mappingRegistry'
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

  it('exposes semantic profile names for robot equipment and reuse list', () => {
    expect(SEMANTIC_PROFILE_NAME_BY_DOMAIN.robotEquipmentList).toBe('ROBOT_EQUIPMENT_LIST')
    expect(SEMANTIC_PROFILE_NAME_BY_DOMAIN.reuseList).toBe('REUSE_LIST')
  })

  it('maps robot equipment headers to required semantic fields', () => {
    const resolution = resolveHeaderMappings(
      ['Robo No. New', 'Station No. New', 'Area'],
      'robotEquipmentList',
    )

    const required = new Set(resolution.requiredFields)
    const mappedFields = new Set(
      resolution.mappings
        .filter((mapping) => mapping.status === 'mapped' && mapping.matchedField)
        .map((mapping) => mapping.matchedField),
    )

    expect(required.has('robotEquipment.station')).toBe(true)
    expect(required.has('robotEquipment.robot')).toBe(true)
    expect(mappedFields.has('robotEquipment.station')).toBe(true)
    expect(mappedFields.has('robotEquipment.robot')).toBe(true)
  })

  it('maps reuse list headers to required semantic fields', () => {
    const resolution = resolveHeaderMappings(['Device Name', 'Station3', 'Area'], 'reuseList')

    const required = new Set(resolution.requiredFields)
    const mappedFields = new Set(
      resolution.mappings
        .filter((mapping) => mapping.status === 'mapped' && mapping.matchedField)
        .map((mapping) => mapping.matchedField),
    )

    expect(required.has('reuse.station')).toBe(true)
    expect(required.has('reuse.tool')).toBe(true)
    expect(mappedFields.has('reuse.station')).toBe(true)
    expect(mappedFields.has('reuse.tool')).toBe(true)
  })
})
