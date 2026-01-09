/**
 * Test pre-resolution mutations (mutateCellIds, mutateToolIds, mutateRobotIds)
 */

import { describe, it, expect } from 'vitest'
import { mutateCellIds, mutateToolIds, mutateRobotIds } from '../identifierMutator'
import type { Cell, Tool, Robot } from '../../src/domain/core'

describe('Pre-Resolution Mutations', () => {
  it('mutateCellIds - determinism with same seed', () => {
    const cells: Cell[] = [
      { id: 'AL_010-010', area: 'AL', location: '010', station: '010' } as Cell,
      { id: 'AL_020-020', area: 'AL', location: '020', station: '020' } as Cell,
      { id: 'BW_005-005', area: 'BW', location: '005', station: '005' } as Cell
    ]

    const config = { mutationRate: 1.0, seed: 42 }

    const result1 = mutateCellIds(cells, config)
    const result2 = mutateCellIds(cells, config)

    expect(result1.mutated.map(c => c.id)).toEqual(result2.mutated.map(c => c.id))
    expect(result1.mutationLog).toEqual(result2.mutationLog)
  })

  it('mutateCellIds - mutations change keys', () => {
    const cells: Cell[] = [
      { id: 'AL_010-010', area: 'AL', location: '010', station: '010' } as Cell,
      { id: 'AL_020-020', area: 'AL', location: '020', station: '020' } as Cell
    ]

    const config = { mutationRate: 1.0, seed: 42 }
    const result = mutateCellIds(cells, config)

    // At least one should mutate
    const changed = result.mutated.filter((c, i) => c.id !== cells[i].id)
    expect(changed.length).toBeGreaterThan(0)
  })

  it('mutateToolIds - determinism with same seed', () => {
    const tools: Tool[] = [
      { id: 'AL_ST010_GUN01', name: 'GUN01', toolNo: 'GUN01' } as Tool,
      { id: 'AL_ST020_SEALER_01', name: 'SEALER 01', toolNo: 'SEALER_01' } as Tool
    ]

    const config = { mutationRate: 1.0, seed: 42 }

    const result1 = mutateToolIds(tools, config)
    const result2 = mutateToolIds(tools, config)

    expect(result1.mutated.map(t => t.id)).toEqual(result2.mutated.map(t => t.id))
  })

  it('mutateRobotIds - determinism with same seed', () => {
    const robots: Robot[] = [
      { id: 'R01', robotNumber: 'R01', caption: 'Robot 1' } as Robot,
      { id: 'R02', robotNumber: 'R02', caption: 'Robot 2' } as Robot
    ]

    const config = { mutationRate: 1.0, seed: 42 }

    const result1 = mutateRobotIds(robots, config)
    const result2 = mutateRobotIds(robots, config)

    expect(result1.mutated.map(r => r.id)).toEqual(result2.mutated.map(r => r.id))
  })

  it('mutation rate controls percentage mutated', () => {
    const cells: Cell[] = Array.from({ length: 100 }, (_, i) => ({
      id: `CELL_${i.toString().padStart(3, '0')}`,
      area: 'AL',
      location: `LOC_${i}`,
      station: `ST_${i}`
    })) as Cell[]

    const config = { mutationRate: 0.05, seed: 42 } // 5% rate
    const result = mutateCellIds(cells, config)

    const mutatedCount = result.mutationLog.length
    expect(mutatedCount).toBeGreaterThan(0)
    expect(mutatedCount).toBeLessThan(20) // Should be around 5, allowing variance
  })

  it('different seeds produce different mutations', () => {
    const cells: Cell[] = [
      { id: 'AL_010-010', area: 'AL', location: '010', station: '010' } as Cell,
      { id: 'AL_020-020', area: 'AL', location: '020', station: '020' } as Cell
    ]

    const config1 = { mutationRate: 1.0, seed: 1 }
    const config2 = { mutationRate: 1.0, seed: 2 }

    const result1 = mutateCellIds(cells, config1)
    const result2 = mutateCellIds(cells, config2)

    // Different seeds should produce different mutations
    expect(result1.mutated.map(c => c.id)).not.toEqual(result2.mutated.map(c => c.id))
  })
})
