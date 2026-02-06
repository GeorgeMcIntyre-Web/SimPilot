import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import {
  detectCategoryByFields,
  getColumnIndexForField,
  profileAndMatchSheet,
} from '../../src/excel/engineBridge'
import type { FieldId } from '../../src/excel/fieldRegistry'

interface FixtureGolden {
  fixtureFile: string
  sheetName: string
  detectedCategory: string
  fieldIndex: Record<string, number | null>
}

function getRepoRoot(): string {
  const testDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(testDir, '..', '..')
}

function loadFirstSheetRows(xlsxPath: string): { sheetName: string; rows: unknown[][] } {
  const buffer = readFileSync(xlsxPath)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]

  if (typeof sheetName !== 'string') {
    throw new Error('Fixture workbook has no sheets')
  }

  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error(`Fixture worksheet missing: ${sheetName}`)
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as unknown[][]
  return { sheetName, rows }
}

function readGolden(relativePath: string): FixtureGolden {
  const absolutePath = path.join(getRepoRoot(), relativePath)
  const raw = readFileSync(absolutePath, 'utf8')
  return JSON.parse(raw) as FixtureGolden
}

function buildFixtureSummary(fixtureFile: string, fields: string[]): FixtureGolden {
  const fixturesDir = path.join(getRepoRoot(), 'tests', 'fixtures', 'excel')
  const xlsxPath = path.join(fixturesDir, fixtureFile)
  const { sheetName, rows } = loadFirstSheetRows(xlsxPath)

  const { matchResults } = profileAndMatchSheet({ sheetName, rows }, fixtureFile)
  const detectedCategory = detectCategoryByFields(matchResults)

  const fieldIndex: Record<string, number | null> = {}
  for (const fieldId of fields) {
    const index = getColumnIndexForField(matchResults, fieldId as FieldId)
    fieldIndex[fieldId] = index ?? null
  }

  return {
    fixtureFile,
    sheetName,
    detectedCategory,
    fieldIndex,
  }
}

describe('integration: excel fixture profiling', () => {
  it('matches golden for SimulationStatus_TEST.xlsx', () => {
    const summary = buildFixtureSummary('SimulationStatus_TEST.xlsx', [
      'area_name',
      'station_name',
      'robot_name',
      'application_code',
      'stage_1_completion',
      'dcs_configured',
    ])

    const golden = readGolden('tests/fixtures/golden/SimulationStatus_TEST.profile.json')
    expect(summary).toEqual(golden)
  })

  it('matches golden for EquipmentList_TEST.xlsx', () => {
    const summary = buildFixtureSummary('EquipmentList_TEST.xlsx', [
      'tool_id',
      'area_name',
      'station_name',
      'robot_number',
      'reuse_status',
      'sourcing',
    ])

    const golden = readGolden('tests/fixtures/golden/EquipmentList_TEST.profile.json')
    expect(summary).toEqual(golden)
  })
})
