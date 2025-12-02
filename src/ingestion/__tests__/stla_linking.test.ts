import { describe, it, expect, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'
import { ingestFiles } from '../ingestionCoordinator'
import { coreStore } from '../../domain/coreStore'
import {
    REAL_SIM_HEADERS,
    REAL_TOOL_HEADERS,
    REAL_EMPLOYEE_HEADERS,
    REAL_SUPPLIER_HEADERS
} from './fixtures/realWorldFixtures'

/**
 * Helper: Create a workbook from a 2D array
 */
function createWorkbookFromArray(data: any[][], sheetName = 'Sheet1'): XLSX.WorkBook {
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    return wb
}

/**
 * Helper: Create a File from a workbook
 */
async function createFileFromWorkbook(
    workbook: XLSX.WorkBook,
    fileName: string
): Promise<File> {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    return new File([blob], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
}

describe('Real-World Data Verification', () => {
    beforeEach(() => {
        // Reset store before each test
        coreStore.setData({
            projects: [],
            areas: [],
            cells: [],
            robots: [],
            tools: [],
            warnings: [],
            referenceData: { employees: [], suppliers: [] }
        }, 'Local')
    })

    it('should link Tool List metadata to Simulation Cell (Vacuum Verification)', async () => {
        // 1. Create Simulation Status File (The Hub)
        const simData = [
            ['', '', '', '', '', '', '', ''], // Padding row 1
            ['', '', '', '', '', '', '', ''], // Padding row 2
            ['', '', '', '', '', '', '', ''], // Padding row 3
            REAL_SIM_HEADERS,
            ['', '', '', '', '', '', '', ''], // Blank row expected by parser
            ['John Doe', 'Underbody', 'Line 1', '010', 'R01', 'Spot Weld', '100%', '100%']
        ]
        const simWorkbook = createWorkbookFromArray(simData, 'SIMULATION')
        const simFile = await createFileFromWorkbook(simWorkbook, 'STLA-S_UNDERBODY_Simulation_Status_DES.xlsx')

        // 2. Create Tool List File (The Metadata Source)
        const toolData = [
            REAL_TOOL_HEADERS,
            ['T-001', '', 'SubArea1', '010', 'Werner Hamel', 'Emp-001', '2025/12/31', 'Team Lead A', 'Designer X']
        ]
        const toolWorkbook = createWorkbookFromArray(toolData, 'ToolList')
        const toolFile = await createFileFromWorkbook(toolWorkbook, 'STLA_S_ZAR Tool List.xlsx')

        // 3. Ingest
        const result = await ingestFiles({
            simulationFiles: [simFile],
            equipmentFiles: [toolFile]
        })

        // 4. Verify
        expect(result.cellsCount).toBeGreaterThan(0)

        const state = coreStore.getState()
        const cell010 = state.cells.find(c => c.code === '010')
        expect(cell010).toBeDefined()

        // Verify "Vacuumed" Metadata
        // Note: The key names in metadata depend on how toolListParser extracts them.
        // Assuming it uses the header names as keys.
        expect(cell010?.metadata).toBeDefined()
        expect(cell010?.metadata?.['Sim. Leader']).toBe('Werner Hamel')
        expect(cell010?.metadata?.['Designer']).toBe('Designer X')
        expect(cell010?.metadata?.['Team Leader']).toBe('Team Lead A')
    })

    it('should populate Employee and Supplier stores (Reference Data)', async () => {
        // 1. Create Metadata File with EmployeeList and SupplierList
        const wb = XLSX.utils.book_new()

        // Employee List
        const empData = [
            REAL_EMPLOYEE_HEADERS,
            ['E001', 'Alice Smith'],
            ['E002', 'Bob Jones']
        ]
        const empSheet = XLSX.utils.aoa_to_sheet(empData)
        XLSX.utils.book_append_sheet(wb, empSheet, 'EmployeeList')

        // Supplier List
        const suppData = [
            REAL_SUPPLIER_HEADERS,
            ['S001', 'Acme Corp'],
            ['S002', 'Global Tech']
        ]
        const suppSheet = XLSX.utils.aoa_to_sheet(suppData)
        XLSX.utils.book_append_sheet(wb, suppSheet, 'SupplierList')

        const metadataFile = await createFileFromWorkbook(wb, 'STLA_S_ZAR Tool List.xlsx') // Reusing filename as it contains metadata

        // 2. Ingest (Need a dummy sim file to pass validation)
        const simData = [
            ['', '', '', '', '', '', '', ''], // Padding row 1
            ['', '', '', '', '', '', '', ''], // Padding row 2
            ['', '', '', '', '', '', '', ''], // Padding row 3
            REAL_SIM_HEADERS,
            ['', '', '', '', '', '', '', ''], // Blank row expected by parser
            ['', 'Area', 'Line', '010', 'R01', '', '', '']
        ]
        const simFile = await createFileFromWorkbook(createWorkbookFromArray(simData, 'SIMULATION'), 'Sim.xlsx')

        await ingestFiles({
            simulationFiles: [simFile],
            equipmentFiles: [metadataFile]
        })

        // 3. Verify
        const state = coreStore.getState()

        // Employees
        expect(state.referenceData.employees).toHaveLength(2)
        expect(state.referenceData.employees.find(e => e.id === 'E001')?.name).toBe('Alice Smith')
        expect(state.referenceData.employees.find(e => e.name === 'Bob Jones')).toBeDefined()

        // Suppliers
        expect(state.referenceData.suppliers).toHaveLength(2)
        expect(state.referenceData.suppliers.find(s => s.id === 'S001')?.name).toBe('Acme Corp')
        expect(state.referenceData.suppliers.find(s => s.name === 'Global Tech')).toBeDefined()
    })
})
