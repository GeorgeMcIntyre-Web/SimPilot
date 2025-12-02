import { describe, it, expect } from 'vitest'
import {
  getAllFieldDescriptors,
  getFieldDescriptorById,
  getFieldDescriptorsByImportance,
  getFieldDescriptorsByType,
  findFieldDescriptorsBySynonym,
  getAllFieldIds,
  isValidFieldId,
  type FieldId,
  type FieldDescriptor
} from '../fieldRegistry'

describe('fieldRegistry', () => {
  describe('getAllFieldDescriptors', () => {
    it('returns all field descriptors', () => {
      const descriptors = getAllFieldDescriptors()

      expect(descriptors.length).toBeGreaterThan(40)
      expect(Array.isArray(descriptors)).toBe(true)
    })

    it('returns a copy (not the original array)', () => {
      const descriptors1 = getAllFieldDescriptors()
      const descriptors2 = getAllFieldDescriptors()

      expect(descriptors1).not.toBe(descriptors2)
    })

    it('all descriptors have required fields', () => {
      const descriptors = getAllFieldDescriptors()

      for (const descriptor of descriptors) {
        expect(descriptor.id).toBeDefined()
        expect(typeof descriptor.id).toBe('string')
        expect(descriptor.canonicalName).toBeDefined()
        expect(typeof descriptor.canonicalName).toBe('string')
        expect(Array.isArray(descriptor.synonyms)).toBe(true)
        expect(descriptor.description).toBeDefined()
        expect(descriptor.expectedType).toBeDefined()
        expect(descriptor.importance).toBeDefined()
      }
    })

    it('all descriptors have unique IDs', () => {
      const descriptors = getAllFieldDescriptors()
      const ids = descriptors.map(d => d.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('getFieldDescriptorById', () => {
    it('returns descriptor for known field ID', () => {
      const descriptor = getFieldDescriptorById('area_name')

      expect(descriptor).toBeDefined()
      expect(descriptor?.id).toBe('area_name')
      expect(descriptor?.canonicalName).toBe('Area')
    })

    it('returns undefined for unknown field ID', () => {
      const descriptor = getFieldDescriptorById('unknown_field' as FieldId)

      expect(descriptor).toBeUndefined()
    })

    it('finds robot-related fields', () => {
      expect(getFieldDescriptorById('robot_name')).toBeDefined()
      expect(getFieldDescriptorById('robot_id')).toBeDefined()
      expect(getFieldDescriptorById('robot_type')).toBeDefined()
    })

    it('finds gun-related fields', () => {
      expect(getFieldDescriptorById('gun_id')).toBeDefined()
      expect(getFieldDescriptorById('gun_number')).toBeDefined()
      expect(getFieldDescriptorById('gun_force_kn')).toBeDefined()
    })

    it('finds station and area fields', () => {
      expect(getFieldDescriptorById('station_name')).toBeDefined()
      expect(getFieldDescriptorById('area_name')).toBeDefined()
      expect(getFieldDescriptorById('cell_id')).toBeDefined()
    })
  })

  describe('getFieldDescriptorsByImportance', () => {
    it('returns high importance fields', () => {
      const highImportance = getFieldDescriptorsByImportance('high')

      expect(highImportance.length).toBeGreaterThan(10)
      expect(highImportance.every(d => d.importance === 'high')).toBe(true)
    })

    it('returns medium importance fields', () => {
      const mediumImportance = getFieldDescriptorsByImportance('medium')

      expect(mediumImportance.length).toBeGreaterThan(5)
      expect(mediumImportance.every(d => d.importance === 'medium')).toBe(true)
    })

    it('returns low importance fields', () => {
      const lowImportance = getFieldDescriptorsByImportance('low')

      expect(lowImportance.length).toBeGreaterThan(5)
      expect(lowImportance.every(d => d.importance === 'low')).toBe(true)
    })

    it('high importance includes key identity fields', () => {
      const highImportance = getFieldDescriptorsByImportance('high')
      const ids = highImportance.map(d => d.id)

      expect(ids).toContain('area_name')
      expect(ids).toContain('station_name')
      expect(ids).toContain('robot_id')
    })
  })

  describe('getFieldDescriptorsByType', () => {
    it('returns string type fields', () => {
      const stringFields = getFieldDescriptorsByType('string')

      expect(stringFields.length).toBeGreaterThan(10)
      expect(stringFields.every(d => d.expectedType === 'string')).toBe(true)
    })

    it('returns number type fields', () => {
      const numberFields = getFieldDescriptorsByType('number')

      expect(numberFields.length).toBeGreaterThan(0)
      expect(numberFields.every(d => d.expectedType === 'number')).toBe(true)
    })

    it('returns date type fields', () => {
      const dateFields = getFieldDescriptorsByType('date')

      expect(dateFields.length).toBeGreaterThan(0)
      expect(dateFields.every(d => d.expectedType === 'date')).toBe(true)
    })

    it('returns percentage type fields', () => {
      const percentageFields = getFieldDescriptorsByType('percentage')

      expect(percentageFields.length).toBeGreaterThan(0)
      expect(percentageFields.every(d => d.expectedType === 'percentage')).toBe(true)
    })
  })

  describe('findFieldDescriptorsBySynonym', () => {
    it('finds field by canonical name', () => {
      const results = findFieldDescriptorsBySynonym('Area')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(d => d.id === 'area_name')).toBe(true)
    })

    it('finds field by exact synonym', () => {
      const results = findFieldDescriptorsBySynonym('area name')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(d => d.id === 'area_name')).toBe(true)
    })

    it('is case insensitive', () => {
      const results1 = findFieldDescriptorsBySynonym('AREA')
      const results2 = findFieldDescriptorsBySynonym('area')

      expect(results1.length).toBe(results2.length)
    })

    it('finds gun force field by synonym', () => {
      const results = findFieldDescriptorsBySynonym('gun force')

      expect(results.length).toBeGreaterThan(0)
    })

    it('finds robotnumber field', () => {
      const results = findFieldDescriptorsBySynonym('robotnumber')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(d => d.id === 'robot_id' || d.id === 'robot_number')).toBe(true)
    })

    it('returns empty array for unknown synonym', () => {
      const results = findFieldDescriptorsBySynonym('completely_unknown_term')

      expect(results).toEqual([])
    })

    it('finds field with typo synonyms (coments)', () => {
      const results = findFieldDescriptorsBySynonym('coments')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(d => d.id === 'comment')).toBe(true)
    })

    it('finds field with typo synonyms (proyect)', () => {
      const results = findFieldDescriptorsBySynonym('proyect')

      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('getAllFieldIds', () => {
    it('returns all field IDs', () => {
      const ids = getAllFieldIds()

      expect(ids.length).toBeGreaterThan(40)
      expect(Array.isArray(ids)).toBe(true)
    })

    it('all IDs are strings', () => {
      const ids = getAllFieldIds()

      expect(ids.every(id => typeof id === 'string')).toBe(true)
    })

    it('includes key field IDs', () => {
      const ids = getAllFieldIds()

      expect(ids).toContain('project_id')
      expect(ids).toContain('area_name')
      expect(ids).toContain('cell_id')
      expect(ids).toContain('station_name')
      expect(ids).toContain('robot_name')
      expect(ids).toContain('gun_force_kn')
    })
  })

  describe('isValidFieldId', () => {
    it('returns true for valid field IDs', () => {
      expect(isValidFieldId('area_name')).toBe(true)
      expect(isValidFieldId('robot_id')).toBe(true)
      expect(isValidFieldId('gun_force_kn')).toBe(true)
    })

    it('returns false for invalid field IDs', () => {
      expect(isValidFieldId('not_a_field')).toBe(false)
      expect(isValidFieldId('')).toBe(false)
      expect(isValidFieldId('random_string')).toBe(false)
    })
  })

  describe('field descriptor structure', () => {
    it('gun_force_kn has correct structure', () => {
      const descriptor = getFieldDescriptorById('gun_force_kn')

      expect(descriptor).toBeDefined()
      expect(descriptor?.expectedType).toBe('number')
      expect(descriptor?.expectedUnit).toBe('kN')
      expect(descriptor?.importance).toBe('high')
      expect(descriptor?.synonyms).toContain('gun force')
    })

    it('station_name has header regexes', () => {
      const descriptor = getFieldDescriptorById('station_name')

      expect(descriptor).toBeDefined()
      expect(descriptor?.headerRegexes).toBeDefined()
      expect(descriptor?.headerRegexes?.length).toBeGreaterThan(0)
    })

    it('reuse allocation fields exist', () => {
      expect(getFieldDescriptorById('old_project')).toBeDefined()
      expect(getFieldDescriptorById('old_line')).toBeDefined()
      expect(getFieldDescriptorById('target_project')).toBeDefined()
      expect(getFieldDescriptorById('target_line')).toBeDefined()
    })

    it('simulation status fields exist', () => {
      expect(getFieldDescriptorById('simulation_status')).toBeDefined()
      expect(getFieldDescriptorById('stage_1_completion')).toBeDefined()
      expect(getFieldDescriptorById('final_deliverables')).toBeDefined()
    })
  })

  describe('synonyms coverage', () => {
    it('covers common Excel header variations', () => {
      const testCases = [
        { synonym: 'persons responsible', expectedField: 'person_responsible' },
        { synonym: 'assembly line', expectedField: 'assembly_line' },
        { synonym: 'robot caption', expectedField: 'robot_caption' },
        { synonym: 'fanuc order code', expectedField: 'robot_order_code' },
        { synonym: 'sim. leader', expectedField: 'sim_leader' }
      ]

      for (const { synonym, expectedField } of testCases) {
        const results = findFieldDescriptorsBySynonym(synonym)
        expect(results.some(d => d.id === expectedField)).toBe(true)
      }
    })

    it('includes German terminology synonyms', () => {
      const germanTerms = ['gewerk', 'zangennummer', 'bemerkungen', 'lieferung']

      for (const term of germanTerms) {
        const results = findFieldDescriptorsBySynonym(term)
        expect(results.length).toBeGreaterThan(0)
      }
    })

    it('includes French terminology synonyms', () => {
      const frenchTerms = ['constructeur', 'fournisseur', 'remarques']

      for (const term of frenchTerms) {
        const results = findFieldDescriptorsBySynonym(term)
        expect(results.length).toBeGreaterThan(0)
      }
    })
  })
})
