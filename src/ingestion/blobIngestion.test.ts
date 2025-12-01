// Blob Ingestion Tests
// Tests to verify ingestion works with Files created from Blobs (e.g., cloud storage downloads)

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { readWorkbook } from './excelUtils'

describe('Blob-based File Ingestion', () => {
  /**
   * Helper to create a minimal valid Excel workbook as a Blob
   */
  function createValidExcelBlob(): Blob {
    // Create a minimal workbook with SheetJS
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['AREA', 'STATION', 'ROBOT'],
      ['Test Area', '010', 'R01']
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    // Convert to buffer then Blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
  }

  /**
   * Helper to create an invalid (corrupted) Excel Blob
   */
  function createCorruptedExcelBlob(): Blob {
    // Create a blob with invalid Excel content
    const corruptedData = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0xFF, 0xFF, 0xFF, 0xFF])
    return new Blob([corruptedData], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
  }

  describe('File created from valid Blob', () => {
    it('should successfully parse a File created from a downloaded Blob', async () => {
      // Simulate downloading a blob from cloud storage
      const blob = createValidExcelBlob()

      // Create a File from the Blob (this is what cloud storage APIs do)
      const file = new File([blob], 'Test_Data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      // Parse the file using the ingestion layer
      const workbook = await readWorkbook(file)

      // Verify the workbook is valid
      expect(workbook).toBeDefined()
      expect(workbook.SheetNames).toBeDefined()
      expect(workbook.SheetNames.length).toBeGreaterThan(0)
      expect(workbook.SheetNames[0]).toBe('Sheet1')

      // Verify we can read data from the sheet
      const sheet = workbook.Sheets['Sheet1']
      expect(sheet).toBeDefined()

      // Convert to JSON and verify content
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
      expect(data).toBeDefined()
      expect(data.length).toBeGreaterThan(0)
      expect((data as any[])[0]).toContain('AREA')
      expect((data as any[])[0]).toContain('STATION')
      expect((data as any[])[0]).toContain('ROBOT')
    })

    it('should handle Files from blobs with various Excel extensions', async () => {
      const blob = createValidExcelBlob()

      // Test .xlsx
      const xlsxFile = new File([blob], 'data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const xlsxWorkbook = await readWorkbook(xlsxFile)
      expect(xlsxWorkbook.SheetNames.length).toBeGreaterThan(0)

      // Test .xlsm
      const xlsmFile = new File([blob], 'data.xlsm', {
        type: 'application/vnd.ms-excel.sheet.macroEnabled.12'
      })
      const xlsmWorkbook = await readWorkbook(xlsmFile)
      expect(xlsmWorkbook.SheetNames.length).toBeGreaterThan(0)
    })

    it('should work with Files from blobs simulating SharePoint/OneDrive download', async () => {
      // Simulate the pattern used when downloading from Microsoft Graph API:
      // 1. Fetch blob from Graph endpoint
      // 2. Create File from blob with original filename
      const blob = createValidExcelBlob()

      const file = new File([blob], 'STLA-S_Simulation_Status.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        lastModified: Date.now()
      })

      const workbook = await readWorkbook(file)

      expect(workbook).toBeDefined()
      expect(workbook.SheetNames).toBeDefined()
      expect(workbook.SheetNames.length).toBeGreaterThan(0)
    })
  })

  describe('Corrupted or invalid Files', () => {
    it('should throw a clear error for corrupted Excel files', async () => {
      const corruptedBlob = createCorruptedExcelBlob()
      const file = new File([corruptedBlob], 'corrupted.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      await expect(readWorkbook(file)).rejects.toThrow(/Failed to parse Excel file/)
    })

    it('should throw error for non-Excel file types', async () => {
      const textBlob = new Blob(['Hello World'], { type: 'text/plain' })
      const file = new File([textBlob], 'data.txt', { type: 'text/plain' })

      await expect(readWorkbook(file)).rejects.toThrow(/Invalid file type/)
      await expect(readWorkbook(file)).rejects.toThrow(/Expected Excel file/)
    })

    it('should throw error for empty Excel file', async () => {
      // Create an empty blob
      const emptyBlob = new Blob([], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const file = new File([emptyBlob], 'empty.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      await expect(readWorkbook(file)).rejects.toThrow()
    })

    // Note: This test is skipped because XLSX.write() throws an error when trying to 
    // write a workbook with no sheets. The "empty file" test above covers validation.
    it.skip('should throw error for Excel with no sheets', async () => {
      // XLSX.write() will throw if workbook has no sheets, so this scenario can't be tested
    })
  })

  describe('Edge cases', () => {
    it('should handle Files with special characters in names', async () => {
      const blob = createValidExcelBlob()
      const file = new File([blob], 'Test Data (2024) [FINAL].xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const workbook = await readWorkbook(file)
      expect(workbook).toBeDefined()
      expect(workbook.SheetNames.length).toBeGreaterThan(0)
    })

    it('should handle Files with long names', async () => {
      const blob = createValidExcelBlob()
      const longName = 'STLA-S_UNDERBODY_Manufacturing_Simulation_Status_DES_2024_Q4_Final_Rev_05_20241126.xlsx'
      const file = new File([blob], longName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const workbook = await readWorkbook(file)
      expect(workbook).toBeDefined()
      expect(workbook.SheetNames.length).toBeGreaterThan(0)
    })
  })
})
