import { describe, it, expect } from 'vitest'
import { CATEGORY_KEYWORDS } from '../sheetSniffer'

describe('CATEGORY_KEYWORDS', () => {
  it('contains the exact typo signatures from real files', () => {
    const weldGunKeywords = CATEGORY_KEYWORDS.REUSE_WELD_GUNS.strong
    expect(weldGunKeywords).toContain('Refresment OK')

    const riserKeywords = CATEGORY_KEYWORDS.REUSE_RISERS.strong
    expect(riserKeywords).toContain('Proyect')
    expect(riserKeywords).toContain('Coments')
  })

  it('has SIMULATION_STATUS with expected strong keywords', () => {
    const simKeywords = CATEGORY_KEYWORDS.SIMULATION_STATUS.strong
    expect(simKeywords).toContain('1st STAGE SIM COMPLETION')
    expect(simKeywords).toContain('FINAL DELIVERABLES')
    expect(simKeywords).toContain('ROBOT POSITION - STAGE 1')
    expect(CATEGORY_KEYWORDS.SIMULATION_STATUS.weak).toContain('DCS CONFIGURED')
  })

  it('has IN_HOUSE_TOOLING with Sim. Leader pattern', () => {
    const toolingKeywords = CATEGORY_KEYWORDS.IN_HOUSE_TOOLING.strong
    expect(toolingKeywords).toContain('Sim. Leader')
    expect(toolingKeywords).toContain('Sim. Employee')
  })

  it('has GUN_FORCE with Gun Force pattern', () => {
    const gunForceKeywords = CATEGORY_KEYWORDS.GUN_FORCE.strong
    expect(gunForceKeywords).toContain('Gun Force')
    expect(gunForceKeywords).toContain('Gun Number')
  })
})
