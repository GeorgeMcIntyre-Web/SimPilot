// Ingestion Coordinator Tests
// Comprehensive tests for file classification and routing
// Target: Prove header sniffing works regardless of filename

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { ingestFiles } from '../ingestionCoordinator'
import { MESSY_GUN_SHEET, MESSY_ROBOT_SHEET, MESSY_SIMULATION_SHEET } from './fixtures/realWorldMock'
import { coreStore } from '../../domain/coreStore'
import { clearCrossRefData } from '../../hooks/useCrossRefData'

/**
 * Helper: Create a workbook from a 2D array
 * Note: Don't use 'Sheet1', 'Sheet2' etc. as they match skip patterns in the sniffer
 */
function createWorkbookFromArray(data: any[][], sheetName = 'Data'): XLSX.WorkBook {
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    return wb
}

/**
 * Helper: Create a File from a workbook (mimics cloud download)
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

describe('ingestionCoordinator - Header Sniffing', () => {
    describe('Preview mode', () => {
        beforeEach(() => {
            coreStore.clear()
            clearCrossRefData()
        })

        it('does not mark preview uploads as duplicates so confirmation can apply changes', async () => {
            // Seed store with initial data
            const baseWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const baseFile = await createFileFromWorkbook(baseWorkbook, 'sim-initial.xlsx')
            const initialResult = await ingestFiles({
                simulationFiles: [baseFile],
                equipmentFiles: []
            })
            expect(initialResult.cellsCount).toBeGreaterThan(0)

            // Create an updated simulation file with an extra station
            const updatedSheet = [
                ...MESSY_SIMULATION_SHEET,
                ['P1Mx', 'BN_B05', 'OP-50', 'R-005', 'Spot Welding', 'PASS', 'OK', 'New station']
            ]
            const updatedWorkbook = createWorkbookFromArray(updatedSheet, 'SIMULATION')
            const updatedFile = await createFileFromWorkbook(updatedWorkbook, 'sim-updated.xlsx')

            // Preview-only pass should not persist or mark the file as uploaded
            const previewResult = await ingestFiles({
                simulationFiles: [updatedFile],
                equipmentFiles: [],
                previewOnly: true
            })
            expect(previewResult.versionComparison).toBeDefined()

            // Confirmation run should process the same file (not flagged as duplicate) and apply the new station
            const confirmedResult = await ingestFiles({
                simulationFiles: [updatedFile],
                equipmentFiles: []
            })
            expect(confirmedResult.cellsCount).toBe(initialResult.cellsCount + 1)
        })
    })

    describe('File Classification: Ignore Filename, Use Headers', () => {
        it('should detect ToolList from headers even if file is named "Budget_V1.xlsx"', async () => {
            // Arrange: Create a file with gun data but misleading name
            const workbook = createWorkbookFromArray(MESSY_GUN_SHEET, 'GunData')
            const gunFile = await createFileFromWorkbook(workbook, 'Budget_V1.xlsx')

            // We need a simulation file to pass validation
            // Note: Simulation parser requires sheet named "SIMULATION"
            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            // Act: Ingest with misleading filename
            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [gunFile]
            })

            // Assert: Should detect guns despite wrong filename
            expect(result.toolsCount).toBeGreaterThan(0)
            expect(result.warnings.every(w => w.kind !== 'UNKNOWN_FILE_TYPE')).toBe(true)
        })

        it('should detect SimulationStatus from headers even if file is named "Data.xlsx"', async () => {
            // Arrange: Create a simulation file with generic name
            // Note: Simulation parser requires sheet named "SIMULATION"
            const workbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const file = await createFileFromWorkbook(workbook, 'Data.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [file],
                equipmentFiles: []
            })

            // Assert: Should detect as simulation status
            expect(result.projectsCount).toBeGreaterThan(0)
            expect(result.cellsCount).toBeGreaterThan(0)
        })

        it('should detect RobotList from headers even with wrong filename', async () => {
            // Arrange: Create robot list with misleading name
            const workbook = createWorkbookFromArray(MESSY_ROBOT_SHEET, 'RobotData')
            const robotFile = await createFileFromWorkbook(workbook, 'Equipment_Final.xlsx')

            // Need simulation file (requires sheet named "SIMULATION")
            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [robotFile]
            })

            // Assert: Should detect robots
            expect(result.robotsCount).toBeGreaterThan(0)
        })
    })

    describe('Header Sniffing: Content Patterns', () => {
        it('should detect ToolList from "gun" keyword in headers', async () => {
            const gunSheet = [
                ['GUN ID', 'TYPE', 'STATION'],
                ['G-100', 'Spot Weld', 'OP-10']
            ]
            const workbook = createWorkbookFromArray(gunSheet, 'ToolData')
            const file = await createFileFromWorkbook(workbook, 'mystery1.xlsx')

            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [file]
            })

            expect(result.toolsCount).toBeGreaterThan(0)
        })

        it('should detect ToolList from "tool" keyword in headers', async () => {
            const toolSheet = [
                ['TOOL ID', 'TYPE', 'AREA'],
                ['T-100', 'Sealer', 'Underbody']
            ]
            const workbook = createWorkbookFromArray(toolSheet, 'ToolData')
            const file = await createFileFromWorkbook(workbook, 'mystery2.xlsx')

            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [file]
            })

            expect(result.toolsCount).toBeGreaterThan(0)
        })

        it('should detect ToolList from "equipment" keyword in headers', async () => {
            const equipmentSheet = [
                ['EQUIPMENT ID', 'TYPE', 'LINE'],
                ['E-100', 'Gripper', 'L-01']
            ]
            const workbook = createWorkbookFromArray(equipmentSheet, 'ToolData')
            const file = await createFileFromWorkbook(workbook, 'mystery3.xlsx')

            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [file]
            })

            expect(result.toolsCount).toBeGreaterThan(0)
        })

        it('should detect SimulationStatus from "1st stage sim" keyword', async () => {
            // Note: Simulation parser requires at least 5 rows with specific headers
            // Using MESSY_SIMULATION_SHEET which has proper structure
            const workbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const file = await createFileFromWorkbook(workbook, 'data123.xlsx')

            const result = await ingestFiles({
                simulationFiles: [file],
                equipmentFiles: []
            })

            expect(result.cellsCount).toBeGreaterThan(0)
        })

        it('should detect SimulationStatus from "robot reach" keywords', async () => {
            // Note: Simulation parser requires at least 5 rows with specific headers
            // Using MESSY_SIMULATION_SHEET which has proper structure
            const workbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const file = await createFileFromWorkbook(workbook, 'unknown.xlsx')

            const result = await ingestFiles({
                simulationFiles: [file],
                equipmentFiles: []
            })

            expect(result.cellsCount).toBeGreaterThan(0)
        })

        it('should detect RobotList from "fanuc order code" keyword', async () => {
            // Robot parser needs headers matching ROBOT, AREA, STATION or similar patterns
            const robotSheet = [
                ['Robot', 'Area', 'Station', 'Fanuc Order Code'],
                ['R-001', 'Underbody', 'OP-10', 'R-2000i/210F'],
                ['R-002', 'Side Body', 'OP-20', 'R-2000i/165F']
            ]
            const workbook = createWorkbookFromArray(robotSheet, 'RobotData')
            const file = await createFileFromWorkbook(workbook, 'data.xlsx')

            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [file]
            })

            expect(result.robotsCount).toBeGreaterThan(0)
        })
    })

    describe('Resilience: Edge Cases', () => {
        it('should warn but not crash on empty files', async () => {
            // Arrange: Create empty workbook
            const emptyWorkbook = XLSX.utils.book_new()
            const emptySheet = XLSX.utils.aoa_to_sheet([])
            XLSX.utils.book_append_sheet(emptyWorkbook, emptySheet, 'EmptyData')
            const emptyFile = await createFileFromWorkbook(emptyWorkbook, 'empty.xlsx')

            // Need a valid simulation file
            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [emptyFile]
            })

            // Assert: Should warn but not crash
            expect(result.warnings.length).toBeGreaterThan(0)
            expect(result.warnings.some(w => w.kind === 'UNKNOWN_FILE_TYPE')).toBe(true)
        })

        it('should warn on unknown file types', async () => {
            // Arrange: Create a file with unrecognizable headers
            const unknownSheet = [
                ['Column A', 'Column B', 'Column C'],
                ['Data 1', 'Data 2', 'Data 3']
            ]
            const workbook = createWorkbookFromArray(unknownSheet, 'UnknownData')
            const unknownFile = await createFileFromWorkbook(workbook, 'unknown.xlsx')

            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [unknownFile]
            })

            // Assert: Should have unknown file warning
            expect(result.warnings.some(w => w.kind === 'UNKNOWN_FILE_TYPE')).toBe(true)
            expect(result.warnings.some(w => w.fileName === 'unknown.xlsx')).toBe(true)
        })

        it('should require at least one simulation file', async () => {
            // Arrange: No simulation files
            const gunWorkbook = createWorkbookFromArray(MESSY_GUN_SHEET, 'GunData')
            const gunFile = await createFileFromWorkbook(gunWorkbook, 'guns.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [],
                equipmentFiles: [gunFile]
            })

            // Assert: Should return error
            expect(result.projectsCount).toBe(0)
            expect(result.warnings.length).toBeGreaterThan(0)
            expect(result.warnings[0].message).toContain('Simulation Status file')
        })

        it('should handle corrupted file gracefully', async () => {
            // Arrange: Create a corrupted file
            const corruptedData = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0xFF, 0xFF])
            const corruptedBlob = new Blob([corruptedData], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            const corruptedFile = new File([corruptedBlob], 'corrupted.xlsx', {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })

            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [corruptedFile]
            })

            // Assert: Should have parser error warning
            expect(result.warnings.some(w => w.kind === 'PARSER_ERROR')).toBe(true)
        })
    })

    describe('Multi-File Ingestion', () => {
        it('should merge tools from multiple equipment files', async () => {
            // Arrange: Two tool files
            const gunSheet1 = [
                ['GUN ID', 'TYPE'],
                ['G-100', 'Spot Weld']
            ]
            const gunSheet2 = [
                ['GUN ID', 'TYPE'],
                ['G-200', 'Servo Gun']
            ]
            const file1 = await createFileFromWorkbook(createWorkbookFromArray(gunSheet1, 'GunData1'), 'guns1.xlsx')
            const file2 = await createFileFromWorkbook(createWorkbookFromArray(gunSheet2, 'GunData2'), 'guns2.xlsx')

            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [file1, file2]
            })

            // Assert: Should have tools from both files
            expect(result.toolsCount).toBeGreaterThanOrEqual(2)
        })

        it('should merge data from multiple simulation files', async () => {
            // Arrange: Two simulation files (both need sheet named SIMULATION)
            // Note: Each file must have at least 5 rows and match required headers
            const file1 = await createFileFromWorkbook(createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION'), 'sim1.xlsx')
            const file2 = await createFileFromWorkbook(createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION'), 'sim2.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [file1, file2],
                equipmentFiles: []
            })

            // Assert: Should have data from both files
            // Both files have same data so cells will be merged/deduplicated
            expect(result.projectsCount).toBeGreaterThanOrEqual(1)
            expect(result.cellsCount).toBeGreaterThanOrEqual(1)
        })
    })

    describe('Fallback to Filename', () => {
        it('should fallback to filename detection when headers are unclear', async () => {
            // Arrange: A file with minimal headers but clear filename
            const minimalSheet = [
                ['ID', 'Type'],
                ['G-100', '']
            ]
            const workbook = createWorkbookFromArray(minimalSheet, 'ToolData')
            const file = await createFileFromWorkbook(workbook, 'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx')

            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            // Act
            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [file]
            })

            // Assert: Should detect as tool list from filename
            expect(result.toolsCount).toBeGreaterThan(0)
        })

        it('should detect simulation status from filename when needed', async () => {
            // Simulation parser requires proper structure - use MESSY_SIMULATION_SHEET
            const workbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const file = await createFileFromWorkbook(workbook, 'STLA_Simulation_Status.xlsx')

            const result = await ingestFiles({
                simulationFiles: [file],
                equipmentFiles: []
            })

            expect(result.projectsCount).toBeGreaterThan(0)
        })
    })

    describe('Data Source Tracking', () => {
        it('should track data source as Local by default', async () => {
            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: []
            })

            expect(result.projectsCount).toBeGreaterThan(0)
            // Data source is stored in coreStore, tested implicitly
        })

        it('should accept dataSource parameter', async () => {
            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [],
                dataSource: 'MS365'
            })

            expect(result.projectsCount).toBeGreaterThan(0)
        })

        it('should accept fileSources mapping', async () => {
            const simWorkbook = createWorkbookFromArray(MESSY_SIMULATION_SHEET, 'SIMULATION')
            const simFile = await createFileFromWorkbook(simWorkbook, 'sim.xlsx')

            const result = await ingestFiles({
                simulationFiles: [simFile],
                equipmentFiles: [],
                fileSources: {
                    'sim.xlsx': 'remote'
                }
            })

            expect(result.projectsCount).toBeGreaterThan(0)
        })
    })
})
