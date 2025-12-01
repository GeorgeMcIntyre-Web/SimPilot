// Tool List Parser Tests
// Comprehensive tests to ensure parser handles real-world messy data
// Target: 100% branch coverage for toolListParser.ts

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseToolList } from '../toolListParser'
import { MESSY_GUN_SHEET, GARBAGE_SHEET, PARTIAL_SHEET } from './fixtures/realWorldMock'

/**
 * Helper: Create a workbook from a 2D array
 */
function createWorkbookFromArray(data: any[][], sheetName = 'Sheet1'): XLSX.WorkBook {
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    return wb
}

describe('toolListParser - Real-World Resilience', () => {
    describe('Vacuum Logic: Unknown Columns', () => {
        it('should vacuum unknown columns into metadata', async () => {
            // Arrange: Use the messy gun sheet with unknown columns
            const workbook = createWorkbookFromArray(MESSY_GUN_SHEET)

            // Act: Parse the file
            const result = await parseToolList(workbook, 'MESSY_GUN_LIST.xlsx')

            // Assert: We should have parsed tools
            expect(result.tools.length).toBeGreaterThan(0)

            const firstTool = result.tools[0]

            // Assert: Unknown columns should be in metadata
            // Note: buildColumnMap uses includes() for partial matching, so:
            // - 'Refresment OK' matches REFRESMENT OK -> consumed
            // - 'Supplier 2' matches SUPPLIER -> consumed (treated as OEM model)
            // - 'Status' matches STATUS -> consumed
            // Only truly unknown columns get vacuumed:
            expect(firstTool.metadata).toBeDefined()
            expect(firstTool.metadata['Zone']).toBe('P1Mx')  // Unknown column
            expect(firstTool.metadata['Coments']).toBe('Issues with tip dresser')  // Typo "Coments" not in consumed list
            expect(firstTool.metadata['Robot Standard (Confirm)']).toBe('R-2000i/210F')  // Unknown column
            expect(firstTool.metadata['Asset description']).toBe('Pneumatic spot weld gun with extended arm')  // Unknown column
        })

        it('should vacuum columns even if they have special characters', async () => {
            // Arrange: Create a sheet with special character headers
            // Note: Don't use headers that match known columns (e.g., 'Status' matches STATUS)
            const specialSheet = [
                ['GUN ID', 'TYPE', 'Cost ($)', 'Weight (kg)', 'Condition [2024]'],
                ['G-100', 'Spot Weld', '25000', '150', 'Active']
            ]
            const workbook = createWorkbookFromArray(specialSheet)

            // Act
            const result = await parseToolList(workbook, 'special.xlsx')

            // Assert: Unknown columns with special characters should be vacuumed
            expect(result.tools[0].metadata['Cost ($)']).toBe('25000')
            expect(result.tools[0].metadata['Weight (kg)']).toBe('150')
            expect(result.tools[0].metadata['Condition [2024]']).toBe('Active')
        })
    })

    describe('Fuzzy Sourcing Detection', () => {
        it('should map "CARRY OVER" to REUSE', async () => {
            const workbook = createWorkbookFromArray(MESSY_GUN_SHEET)
            const result = await parseToolList(workbook, 'test.xlsx')

            // First tool has "CARRY OVER" status
            const carryOverTool = result.tools.find(t => t.name === 'G-101')
            expect(carryOverTool?.sourcing).toBe('REUSE')
        })

        it('should map "Existing" to REUSE', async () => {
            const workbook = createWorkbookFromArray(MESSY_GUN_SHEET)
            const result = await parseToolList(workbook, 'test.xlsx')

            // Second tool has "Existing" status
            const existingTool = result.tools.find(t => t.name === 'G-202')
            expect(existingTool?.sourcing).toBe('REUSE')
        })

        it('should map "Retain" to REUSE', async () => {
            const workbook = createWorkbookFromArray(MESSY_GUN_SHEET)
            const result = await parseToolList(workbook, 'test.xlsx')

            // Third tool has "Retain" status
            const retainTool = result.tools.find(t => t.name === 'G-303')
            expect(retainTool?.sourcing).toBe('REUSE')
        })

        it('should map "NEW" to NEW_BUY', async () => {
            const workbook = createWorkbookFromArray(MESSY_GUN_SHEET)
            const result = await parseToolList(workbook, 'test.xlsx')

            // Fourth tool has "NEW" status
            const newTool = result.tools.find(t => t.name === 'G-404')
            expect(newTool?.sourcing).toBe('NEW_BUY')
        })

        it('should default to UNKNOWN when sourcing is ambiguous', async () => {
            const workbook = createWorkbookFromArray(MESSY_GUN_SHEET)
            const result = await parseToolList(workbook, 'test.xlsx')

            // Last tool has no status
            const unknownTool = result.tools.find(t => t.name === 'G-505')
            expect(unknownTool?.sourcing).toBe('UNKNOWN')
        })

        it('should detect sourcing from comments field', async () => {
            const sheetWithCommentSourcing = [
                ['GUN ID', 'TYPE', 'COMMENTS'],
                ['G-100', 'Spot Weld', 'carry over from previous line'],
                ['G-200', 'Servo Gun', 'new station requirement']
            ]
            const workbook = createWorkbookFromArray(sheetWithCommentSourcing)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].sourcing).toBe('REUSE')  // "carry over" in comments
            expect(result.tools[1].sourcing).toBe('NEW_BUY')  // "new" in comments
        })
    })

    describe('Tool Type Detection', () => {
        it('should detect SPOT_WELD from filename with "wg"', async () => {
            const simpleSheet = [
                ['GUN ID', 'TYPE'],
                ['G-100', '']
            ]
            const workbook = createWorkbookFromArray(simpleSheet)
            const result = await parseToolList(workbook, 'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx')

            expect(result.tools[0].toolType).toBe('SPOT_WELD')
            expect(result.tools[0].kind).toBe('GUN')
        })

        it('should detect SPOT_WELD from type string', async () => {
            const workbook = createWorkbookFromArray(MESSY_GUN_SHEET)
            const result = await parseToolList(workbook, 'generic.xlsx')

            const spotWeldTool = result.tools.find(t => t.name === 'G-101')
            expect(spotWeldTool?.toolType).toBe('SPOT_WELD')
        })

        it('should detect SEALER from filename', async () => {
            const simpleSheet = [
                ['TOOL ID', 'TYPE'],
                ['S-100', 'Sealer']
            ]
            const workbook = createWorkbookFromArray(simpleSheet)
            const result = await parseToolList(workbook, 'Sealer_List.xlsx')

            expect(result.tools[0].toolType).toBe('SEALER')
            expect(result.tools[0].kind).toBe('TOOL')
        })

        it('should detect GRIPPER from type string', async () => {
            const gripperSheet = [
                ['TOOL ID', 'TYPE'],
                ['T-100', 'Gripper']
            ]
            const workbook = createWorkbookFromArray(gripperSheet)
            const result = await parseToolList(workbook, 'tools.xlsx')

            expect(result.tools[0].toolType).toBe('GRIPPER')
            expect(result.tools[0].kind).toBe('TOOL')
        })

        it('should default to OTHER for unknown tool types', async () => {
            const unknownSheet = [
                ['EQUIPMENT ID', 'TYPE'],
                ['E-100', 'Unknown Device']
            ]
            const workbook = createWorkbookFromArray(unknownSheet)
            const result = await parseToolList(workbook, 'equipment.xlsx')

            expect(result.tools[0].toolType).toBe('OTHER')
            expect(result.tools[0].kind).toBe('OTHER')
        })
    })

    describe('Spot Weld Subtype Detection', () => {
        it('should detect SERVO subtype', async () => {
            const servoSheet = [
                ['GUN ID', 'TYPE', 'SUBTYPE'],
                ['G-100', 'Spot Weld', 'Servo'],
                ['G-200', 'Servo Gun', '']
            ]
            const workbook = createWorkbookFromArray(servoSheet)
            const result = await parseToolList(workbook, 'guns.xlsx')

            expect(result.tools[0].subType).toBe('SERVO')
            expect(result.tools[1].subType).toBe('SERVO')
        })

        it('should detect PNEUMATIC subtype', async () => {
            const pneumaticSheet = [
                ['GUN ID', 'TYPE', 'SUBTYPE'],
                ['G-100', 'Spot Weld', 'Pneumatic'],
                ['G-200', 'Pneumatic Gun', '']
            ]
            const workbook = createWorkbookFromArray(pneumaticSheet)
            const result = await parseToolList(workbook, 'guns.xlsx')

            expect(result.tools[0].subType).toBe('PNEUMATIC')
            expect(result.tools[1].subType).toBe('PNEUMATIC')
        })

        it('should default to UNKNOWN subtype when unclear', async () => {
            const unknownSheet = [
                ['GUN ID', 'TYPE'],
                ['G-100', 'Spot Weld']
            ]
            const workbook = createWorkbookFromArray(unknownSheet)
            const result = await parseToolList(workbook, 'guns.xlsx')

            expect(result.tools[0].subType).toBe('UNKNOWN')
        })

        it('should not set subtype for non-spot-weld tools', async () => {
            const sealerSheet = [
                ['TOOL ID', 'TYPE'],
                ['S-100', 'Sealer']
            ]
            const workbook = createWorkbookFromArray(sealerSheet)
            const result = await parseToolList(workbook, 'tools.xlsx')

            expect(result.tools[0].subType).toBeUndefined()
        })
    })

    describe('Header Variations', () => {
        it('should find tool ID from "GUN ID" header', async () => {
            const sheet = [
                ['GUN ID', 'TYPE'],
                ['G-100', 'Spot Weld']
            ]
            const workbook = createWorkbookFromArray(sheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].name).toBe('G-100')
        })

        it('should find tool ID from "TOOL NAME" header', async () => {
            const sheet = [
                ['TOOL NAME', 'TYPE'],
                ['T-200', 'Sealer']
            ]
            const workbook = createWorkbookFromArray(sheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].name).toBe('T-200')
        })

        it('should find tool ID from "EQUIPMENT ID" header', async () => {
            const sheet = [
                ['EQUIPMENT ID', 'TYPE'],
                ['E-300', 'Gripper']
            ]
            const workbook = createWorkbookFromArray(sheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].name).toBe('E-300')
        })

        it('should parse area/line/station from various header names', async () => {
            const sheet = [
                ['GUN ID', 'AREA NAME', 'LINE CODE', 'STATION CODE'],
                ['G-100', 'Underbody', 'L-01', 'OP-20']
            ]
            const workbook = createWorkbookFromArray(sheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].areaName).toBe('Underbody')
            expect(result.tools[0].lineCode).toBe('L-01')
            expect(result.tools[0].stationCode).toBe('OP-20')
        })
    })

    describe('Resilience: Partial & Garbage Data', () => {
        it('should parse partial data without crashing', async () => {
            const workbook = createWorkbookFromArray(PARTIAL_SHEET)

            // Should not throw
            const result = await parseToolList(workbook, 'partial.xlsx')

            expect(result.tools.length).toBe(2)
            expect(result.tools[0].name).toBe('G-100')
            expect(result.tools[1].name).toBe('G-200')
        })

        it('should skip rows with no tool ID', async () => {
            const sheetWithEmptyRows = [
                ['GUN ID', 'TYPE'],
                ['G-100', 'Spot Weld'],
                ['', 'Sealer'],  // No ID - should be skipped
                ['G-200', 'Gripper']
            ]
            const workbook = createWorkbookFromArray(sheetWithEmptyRows)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools.length).toBe(2)
            expect(result.warnings.length).toBeGreaterThan(0)
            expect(result.warnings[0].kind).toBe('ROW_SKIPPED')
        })

        it('should skip empty rows', async () => {
            const sheetWithEmptyRows = [
                ['GUN ID', 'TYPE'],
                ['G-100', 'Spot Weld'],
                [],  // Empty row
                ['G-200', 'Gripper']
            ]
            const workbook = createWorkbookFromArray(sheetWithEmptyRows)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools.length).toBe(2)
        })

        it('should skip total rows', async () => {
            const sheetWithTotalRow = [
                ['GUN ID', 'TYPE', 'COUNT'],
                ['G-100', 'Spot Weld', '1'],
                ['G-200', 'Gripper', '1'],
                ['TOTAL', '', '2']  // Total row - should be skipped
            ]
            const workbook = createWorkbookFromArray(sheetWithTotalRow)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools.length).toBe(2)
        })

        it('should handle null and undefined values gracefully', async () => {
            const sheetWithNulls = [
                ['GUN ID', 'TYPE', 'COMMENTS'],
                ['G-100', null, undefined],
                ['G-200', 'Spot Weld', null]
            ]
            const workbook = createWorkbookFromArray(sheetWithNulls)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools.length).toBe(2)
            expect(result.tools[0].toolType).toBe('OTHER')  // Default when no type
        })

        it('should warn when no valid tools found', async () => {
            // Use rows with null values to ensure they have content that creates cells
            // Empty arrays [] don't create cells in xlsx, so we need explicit nulls
            const emptyDataSheet = [
                ['GUN ID', 'TYPE'],
                [null, null],   // Row with nulls (no tool ID = skipped)
                ['', '']        // Row with empty strings (no tool ID = skipped)
            ]
            const workbook = createWorkbookFromArray(emptyDataSheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools.length).toBe(0)
            expect(result.warnings.length).toBeGreaterThan(0)
            expect(result.warnings.some(w => w.kind === 'PARSER_ERROR')).toBe(true)
        })

        it('should throw error for workbook with no sheets', async () => {
            const emptyWorkbook = XLSX.utils.book_new()

            await expect(parseToolList(emptyWorkbook, 'empty.xlsx')).rejects.toThrow('No sheets found')
        })

        it('should throw error when no valid headers found', async () => {
            const workbook = createWorkbookFromArray(GARBAGE_SHEET)

            await expect(parseToolList(workbook, 'garbage.xlsx')).rejects.toThrow('Could not find header row')
        })

        it('should throw error for sheets with too few rows', async () => {
            const tinySheet = [['GUN ID']]
            const workbook = createWorkbookFromArray(tinySheet)

            await expect(parseToolList(workbook, 'tiny.xlsx')).rejects.toThrow('too few rows')
        })
    })

    describe('OEM Model Detection', () => {
        it('should extract OEM model from various column names', async () => {
            const sheet = [
                ['GUN ID', 'TYPE', 'MODEL'],
                ['G-100', 'Spot Weld', 'FANUC XYZ-100']
            ]
            const workbook = createWorkbookFromArray(sheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].oemModel).toBe('FANUC XYZ-100')
        })

        it('should try MANUFACTURER column if MODEL not found', async () => {
            const sheet = [
                ['GUN ID', 'TYPE', 'MANUFACTURER'],
                ['G-100', 'Spot Weld', 'FANUC']
            ]
            const workbook = createWorkbookFromArray(sheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].oemModel).toBe('FANUC')
        })

        it('should try SUPPLIER column if MODEL and MANUFACTURER not found', async () => {
            const sheet = [
                ['GUN ID', 'TYPE', 'SUPPLIER'],
                ['G-100', 'Spot Weld', 'ACME Corp']
            ]
            const workbook = createWorkbookFromArray(sheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].oemModel).toBe('ACME Corp')
        })
    })

    describe('Source Metadata', () => {
        it('should capture source file name and sheet name', async () => {
            const sheet = [
                ['GUN ID', 'TYPE'],
                ['G-100', 'Spot Weld']
            ]
            const workbook = createWorkbookFromArray(sheet, 'GunList')
            const result = await parseToolList(workbook, 'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx')

            expect(result.tools[0].sourceFile).toBe('GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx')
            expect(result.tools[0].sheetName).toBe('GunList')
        })

        it('should capture row index for debugging', async () => {
            const sheet = [
                ['GUN ID', 'TYPE'],
                ['G-100', 'Spot Weld'],  // Row 1 (0-indexed data row)
                ['G-200', 'Servo Gun']   // Row 2
            ]
            const workbook = createWorkbookFromArray(sheet)
            const result = await parseToolList(workbook, 'test.xlsx')

            expect(result.tools[0].rowIndex).toBe(1)
            expect(result.tools[1].rowIndex).toBe(2)
        })
    })
})
