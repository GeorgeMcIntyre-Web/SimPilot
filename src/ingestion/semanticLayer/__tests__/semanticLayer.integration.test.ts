import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseSimulationStatus } from '../../simulationStatusParser'
import { parseToolList } from '../../toolListParser'
import { applyIngestedData } from '../../applyIngestedData'
import { MESSY_GUN_SHEET, MESSY_SIMULATION_SHEET } from '../../__tests__/fixtures/realWorldMock'
import type { SemanticLayerArtifact } from '../types'

function createWorkbookFromArray(data: unknown[][], sheetName: string): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

describe('semanticLayer integration', () => {
  it('threads semantic artifacts through ingestion and emits semantic warnings', async () => {
    const simulationWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
    const toolWorkbook = createWorkbookFromArray(MESSY_GUN_SHEET, 'ToolData')

    const simulation = await parseSimulationStatus(
      simulationWorkbook,
      'simulation-status.xlsx',
      'SIMULATION',
    )
    const tools = await parseToolList(toolWorkbook, 'tools.xlsx', 'ToolData')

    expect(simulation.semanticLayer).toBeDefined()
    expect(simulation.semanticLayer?.nodes.length).toBeGreaterThan(0)
    expect(simulation.semanticLayer?.edges.length).toBeGreaterThan(0)
    expect(tools.semanticLayer).toBeDefined()
    expect(tools.semanticLayer?.nodes.length).toBeGreaterThan(0)
    expect(tools.semanticLayer?.report.totalHeaders).toBeGreaterThan(0)

    const semanticLayers: SemanticLayerArtifact[] = [
      simulation.semanticLayer,
      tools.semanticLayer,
    ].filter((layer): layer is SemanticLayerArtifact => Boolean(layer))

    const applyResult = applyIngestedData({
      simulation,
      tools,
      semanticLayers,
    })

    const semanticWarnings = applyResult.warnings.filter(
      (warning) => warning.details?.semanticKind !== undefined,
    )
    expect(semanticWarnings.length).toBeGreaterThan(0)
    expect(semanticWarnings.every((warning) => warning.kind === 'HEADER_MISMATCH')).toBe(true)
  })
})
