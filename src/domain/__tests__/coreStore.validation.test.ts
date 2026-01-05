/**
 * Tests for coreStore input validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { coreStore } from '../coreStore'

describe('coreStore.setData validation', () => {
  beforeEach(() => {
    coreStore.clear()
  })

  it('should accept valid data structure', () => {
    const validData = {
      projects: [],
      areas: [],
      cells: [],
      robots: [],
      tools: [],
      warnings: [],
    }

    expect(() => coreStore.setData(validData, 'Local')).not.toThrow()
  })

  it('should throw error for null data', () => {
    expect(() => coreStore.setData(null as any, 'Local')).toThrow('Invalid data: must be an object')
  })

  it('should throw error for undefined data', () => {
    expect(() => coreStore.setData(undefined as any, 'Local')).toThrow('Invalid data: must be an object')
  })

  it('should throw error for non-object data', () => {
    expect(() => coreStore.setData('invalid' as any, 'Local')).toThrow('Invalid data: must be an object')
  })

  it('should throw error if projects is not an array', () => {
    const invalidData = {
      projects: 'not-an-array',
      areas: [],
      cells: [],
      robots: [],
      tools: [],
      warnings: [],
    }

    expect(() => coreStore.setData(invalidData as any, 'Local')).toThrow('Invalid data: projects must be an array')
  })

  it('should throw error if areas is not an array', () => {
    const invalidData = {
      projects: [],
      areas: null,
      cells: [],
      robots: [],
      tools: [],
      warnings: [],
    }

    expect(() => coreStore.setData(invalidData as any, 'Local')).toThrow('Invalid data: areas must be an array')
  })

  it('should throw error if cells is missing', () => {
    const invalidData = {
      projects: [],
      areas: [],
      // cells missing
      robots: [],
      tools: [],
      warnings: [],
    }

    expect(() => coreStore.setData(invalidData as any, 'Local')).toThrow('Invalid data: cells must be an array')
  })

  it('should throw error if referenceData.employees is not an array', () => {
    const invalidData = {
      projects: [],
      areas: [],
      cells: [],
      robots: [],
      tools: [],
      warnings: [],
      referenceData: {
        employees: 'not-an-array',
        suppliers: [],
      },
    }

    expect(() => coreStore.setData(invalidData as any, 'Local')).toThrow('Invalid data: referenceData.employees must be an array')
  })

  it('should throw error if referenceData.suppliers is not an array', () => {
    const invalidData = {
      projects: [],
      areas: [],
      cells: [],
      robots: [],
      tools: [],
      warnings: [],
      referenceData: {
        employees: [],
        suppliers: null,
      },
    }

    expect(() => coreStore.setData(invalidData as any, 'Local')).toThrow('Invalid data: referenceData.suppliers must be an array')
  })

  it('should accept valid referenceData', () => {
    const validData = {
      projects: [],
      areas: [],
      cells: [],
      robots: [],
      tools: [],
      warnings: [],
      referenceData: {
        employees: [{ id: '1', name: 'John Doe', email: 'john@example.com' }],
        suppliers: [{ id: '1', name: 'ACME Corp', contactEmail: 'contact@acme.com' }],
      },
    }

    expect(() => coreStore.setData(validData as any, 'Local')).not.toThrow()
  })

  it('should populate store with valid data', () => {
    const validData = {
      projects: [{ id: 'p1', name: 'Project 1', description: 'Test', status: 'active' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
      areas: [],
      cells: [],
      robots: [],
      tools: [],
      warnings: ['Test warning'],
    }

    coreStore.setData(validData, 'Demo')

    const state = coreStore.getState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].id).toBe('p1')
    expect(state.warnings).toEqual(['Test warning'])
    expect(state.dataSource).toBe('Demo')
  })
})
