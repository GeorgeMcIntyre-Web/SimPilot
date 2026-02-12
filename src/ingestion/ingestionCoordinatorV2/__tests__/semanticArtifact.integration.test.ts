import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { ingestFilesV2 } from '../ingestFiles'
import { MESSY_GUN_SHEET, MESSY_SIMULATION_SHEET } from '../../__tests__/fixtures/realWorldMock'

function createWorkbookFromArray(data: unknown[][], sheetName: string): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

async function createFileFromWorkbook(workbook: XLSX.WorkBook, fileName: string): Promise<File> {
  const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([workbookBytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  return new File([blob], fileName, { type: blob.type })
}

describe('ingestFilesV2 semantic artifact integration', () => {
  it('returns ingestionRunId and semanticArtifact when semantic inputs are parsed', async () => {
    const simulationWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
    const toolWorkbook = createWorkbookFromArray(MESSY_GUN_SHEET, 'ToolData')
    const simulationFile = await createFileFromWorkbook(simulationWorkbook, 'sim-status.xlsx')
    const toolFile = await createFileFromWorkbook(toolWorkbook, 'tools.xlsx')

    const result = await ingestFilesV2({
      files: [simulationFile, toolFile],
      stage: 'SCAN_AND_PARSE',
    })

    expect(result.ingestionRunId).toBeTruthy()
    expect(result.ingestionRunId).toBe(result.runResult.runId)
    expect(result.semanticArtifact).toBeDefined()
    expect(result.semanticArtifact?.runId).toBe(result.ingestionRunId)
    expect(result.semanticArtifact?.nodes.length).toBeGreaterThan(0)
    expect(result.semanticArtifact?.edges.length).toBeGreaterThan(0)
    expect(result.semanticArtifact?.report.totalHeaders).toBeGreaterThan(0)
  })
})
