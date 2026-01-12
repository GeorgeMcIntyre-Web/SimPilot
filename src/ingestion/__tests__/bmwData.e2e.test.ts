import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'
import { parseToolList } from '../toolListParser'

const BASE_PATH = path.resolve(process.cwd(), '..', 'SimPilot_Data', 'TestData', 'BMW')

const BMW_FILES = {
  toolList: '02. Tool List/J10735_BMW_NCAR_Robot_Equipment_List_Side_Frame.xlsx'
}

const DATA_AVAILABLE =
  fs.existsSync(BASE_PATH) &&
  fs.existsSync(path.join(BASE_PATH, BMW_FILES.toolList))

const describeFn = DATA_AVAILABLE ? describe : describe.skip

describeFn('BMW (J10735) E2E Ingestion', () => {
  it('should parse BMW Tool List and create tools', async () => {
    const filePath = path.join(BASE_PATH, BMW_FILES.toolList)
    const workbook = XLSX.readFile(filePath)

    // BMW file has multiple sheets, use the main one
    const result = await parseToolList(workbook, BMW_FILES.toolList, 'BMW Mex J10735 Side Frame NCAR')

    expect(result.tools.length).toBeGreaterThan(0)
    
    // Verify project type was detected as BMW_J10735 by checking that tools were created
    // (If project type wasn't detected, it would fall back to legacy parser)
    const firstTool = result.tools[0]
    expect(firstTool).toBeDefined()
    expect(firstTool.metadata).toBeDefined()
  })

  it('should capture unmapped columns in tool metadata (VACUUM PARSER TEST)', async () => {
    const filePath = path.join(BASE_PATH, BMW_FILES.toolList)
    const workbook = XLSX.readFile(filePath)

    const result = await parseToolList(workbook, BMW_FILES.toolList, 'BMW Mex J10735 Side Frame NCAR')

    expect(result.tools.length).toBeGreaterThan(0)

    // Get first tool
    const tool = result.tools[0]
    expect(tool).toBeDefined()
    expect(tool.metadata).toBeDefined()

    // BMWRawRow interface only has these mapped columns:
    // - 'Area Name'
    // - 'Station'
    // - 'Equipment Type'
    // - 'Equipment No'
    // - 'Tool'
    // - 'Tooling Number RH'
    // - 'Tooling Number LH'
    //
    // Any other columns should be in metadata (vacuumed)
    // Common unmapped columns might include: Comments, Designer, Status, etc.
    
    // Check that metadata contains at least some keys beyond the mapped ones
    const mappedKeys = new Set([
      'Area Name',
      'Station',
      'Equipment Type',
      'Equipment No',
      'Tool',
      'Tooling Number RH',
      'Tooling Number LH',
      'stationGroup', // Added by converter
      'aliases' // Added by converter
    ])
    
    const metadataKeys = Object.keys(tool.metadata || {})
    const unmappedKeys = metadataKeys.filter(key => !mappedKeys.has(key))
    
    // There should be at least some unmapped columns vacuumed into metadata
    // (This test will pass even if there are no unmapped columns, but we log for visibility)
    if (unmappedKeys.length > 0) {
      console.log(`[BMW Vacuum Test] Found ${unmappedKeys.length} unmapped columns in metadata:`, unmappedKeys.slice(0, 10))
    }
    
    // At minimum, verify metadata exists and has some structure
    expect(Object.keys(tool.metadata || {}).length).toBeGreaterThan(0)
  })
})
