import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseRobotList } from '../../robotListParser'
import { applyIngestedData } from '../../applyIngestedData'
import type { WorkbookConfig } from '../../excelIngestionTypes'
import { parseReuseListRisers } from '../../parsers/reuseListRisersParser'
import { buildSemanticLayerArtifact, enrichSemanticArtifactWithRelationships } from '..'

function createWorkbookFromArray(data: unknown[][], sheetName: string): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

describe('semantic coverage integration', () => {
  it('emits robot equipment semantic relationships and required-field warnings', async () => {
    const workbook = createWorkbookFromArray(
      [
        ['ROBOT', 'AREA', 'STATION'],
        ['R001', 'UNDERBODY', 'UB-010'],
        ['R002', 'UNDERBODY', ''],
      ],
      'RobotData',
    )

    const result = await parseRobotList(workbook, 'ROBOTLIST.xlsx', 'RobotData')

    expect(result.semanticLayer).toBeDefined()
    expect(result.semanticLayer?.domain).toBe('robotEquipmentList')
    expect(result.semanticLayer?.edges.some((edge) => edge.type === 'STATION_TO_ROBOT')).toBe(true)
    expect(result.semanticLayer?.edges.some((edge) => edge.type === 'AREA_GROUPS_STATION')).toBe(
      true,
    )

    const applyResult = applyIngestedData({
      robots: result,
      semanticLayers: result.semanticLayer ? [result.semanticLayer] : [],
    })
    const semanticWarnings = applyResult.warnings.filter(
      (warning) =>
        warning.details?.semanticDomain === 'robotEquipmentList' &&
        warning.details?.semanticKind === 'SEMANTIC_MISSING_REQUIRED_FIELD',
    )

    expect(semanticWarnings.length).toBeGreaterThan(0)
  })

  it('emits reuse-list semantic relationships and required-field ambiguities', () => {
    const rawRows: Record<string, unknown>[] = [
      {
        Proyect: 'OLD_A',
        Area: 'UNDERBODY',
        Location: 'LOC_1',
        Brand: 'KA-001',
        Height: 'Baseplate',
        Standard: 'STD',
        Type: 'R1',
        'Project STLA/P1H/O1H/LPM': 'NEW_A',
        'New Line': 'L01',
        'New station': '010',
        Coments: 'ok',
      },
      {
        Proyect: 'OLD_B',
        Area: 'UNDERBODY',
        Location: 'LOC_2',
        Brand: 'KA-002',
        Height: 'Baseplate',
        Standard: 'STD',
        Type: 'R1',
        'Project STLA/P1H/O1H/LPM': 'NEW_B',
        'New Line': 'L02',
        'New station': '',
        Coments: 'missing station',
      },
    ]

    const workbookConfig: WorkbookConfig = {
      workbookId: 'GLOBAL_ZA_REUSE_RISERS_INTERNAL',
      simulationSourceKind: 'InternalSimulation',
      defaultSiteLocation: 'Unknown',
      humanLabel: 'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx (INTERNAL)',
      expectedSheets: [],
    }

    const parsedRows = parseReuseListRisers(
      rawRows,
      workbookConfig,
      'RISERS',
      'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
    )
    const headers = Object.keys(rawRows[0])
    const baseLayer = buildSemanticLayerArtifact({
      domain: 'reuseList',
      fileName: 'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
      sheetName: 'RISERS',
      headers,
    })
    const semanticLayer = enrichSemanticArtifactWithRelationships({
      artifact: baseLayer,
      relationships: parsedRows.map((parsed) => ({
        area: parsed.oldArea,
        station: parsed.targetStation || parsed.oldStation,
        tool: parsed.name || parsed.partNumber,
        robot: parsed.robotNumber,
        rowIndex: parsed.sourceRowIndex,
      })),
      requiredFields: ['station', 'tool'],
    })

    expect(parsedRows.length).toBeGreaterThan(0)
    expect(semanticLayer.nodes.length).toBeGreaterThan(0)
    expect(semanticLayer.edges.some((edge) => edge.type === 'STATION_TO_TOOL')).toBe(true)

    const applyResult = applyIngestedData({
      semanticLayers: [semanticLayer],
    })
    const semanticWarnings = applyResult.warnings.filter(
      (warning) =>
        warning.details?.semanticDomain === 'reuseList' &&
        warning.details?.semanticKind === 'SEMANTIC_MISSING_REQUIRED_FIELD',
    )

    expect(semanticWarnings.length).toBeGreaterThan(0)
  })
})
