/**
 * Metadata Parser - Parses Employee and Supplier reference data
 * 
 * Purpose: Extract EmployeeList and SupplierList from metadata Excel sheets
 * to enable normalization (e.g., map "Werner" → Employee ID)
 */

import * as XLSX from 'xlsx'
import { sheetToMatrix } from './excelUtils'

export interface EmployeeRecord {
    id: string
    name: string
    role?: string
    department?: string
}

export interface SupplierRecord {
    id: string
    name: string
    contact?: string
}

export interface MetadataResult {
    employees: EmployeeRecord[]
    suppliers: SupplierRecord[]
}

/**
 * Parse metadata workbook containing EmployeeList and/or SupplierList sheets
 */
export function parseMetadata(workbook: XLSX.WorkBook): MetadataResult {
    const result: MetadataResult = {
        employees: [],
        suppliers: []
    }

    // Check for EmployeeList sheet
    if (workbook.SheetNames.includes('EmployeeList')) {
        result.employees = parseEmployeeList(workbook, 'EmployeeList')
    }

    // Check for SupplierList sheet
    if (workbook.SheetNames.includes('SupplierList')) {
        result.suppliers = parseSupplierList(workbook, 'SupplierList')
    }

    // If no specific sheets, try to detect from first sheet headers
    if (result.employees.length === 0 && result.suppliers.length === 0) {
        const firstSheet = workbook.SheetNames[0]
        const rows = sheetToMatrix(workbook, firstSheet)

        if (rows.length > 0) {
            const headerRow = rows[0].map(cell => String(cell || '').toLowerCase())

            if (headerRow.some(h => h.includes('employee'))) {
                result.employees = parseEmployeeList(workbook, firstSheet)
            } else if (headerRow.some(h => h.includes('supplier'))) {
                result.suppliers = parseSupplierList(workbook, firstSheet)
            }
        }
    }

    return result
}

/**
 * Parse EmployeeList sheet
 */
function parseEmployeeList(workbook: XLSX.WorkBook, sheetName: string): EmployeeRecord[] {
    const rows = sheetToMatrix(workbook, sheetName)

    if (rows.length < 2) return []

    // Find header row (look for 'id' or 'name' columns)
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i].map(cell => String(cell || '').toLowerCase())
        if (row.some(h => h.includes('id') || h.includes('name') || h.includes('employee'))) {
            headerRowIndex = i
            break
        }
    }

    const headerRow = rows[headerRowIndex].map(cell => String(cell || '').toLowerCase())

    // Find column indices
    const idIndex = headerRow.findIndex(h => h.includes('id') || h === 'nr')
    const nameIndex = headerRow.findIndex(h => h.includes('name') || h.includes('employee'))
    const roleIndex = headerRow.findIndex(h => h.includes('role') || h.includes('position') || h.includes('function'))
    const deptIndex = headerRow.findIndex(h => h.includes('department') || h.includes('dept') || h.includes('area'))

    if (idIndex === -1 && nameIndex === -1) {
        return []
    }

    const employees: EmployeeRecord[] = []

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i]

        const id = idIndex >= 0 ? String(row[idIndex] || '') : String(i - headerRowIndex)
        const name = nameIndex >= 0 ? String(row[nameIndex] || '') : ''

        if (!id && !name) continue

        employees.push({
            id: id.trim(),
            name: name.trim(),
            role: roleIndex >= 0 ? String(row[roleIndex] || '') : undefined,
            department: deptIndex >= 0 ? String(row[deptIndex] || '') : undefined
        })
    }

    return employees
}

/**
 * Parse SupplierList sheet
 */
function parseSupplierList(workbook: XLSX.WorkBook, sheetName: string): SupplierRecord[] {
    const rows = sheetToMatrix(workbook, sheetName)

    if (rows.length < 2) return []

    // Find header row
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i].map(cell => String(cell || '').toLowerCase())
        if (row.some(h => h.includes('supplier') || h.includes('vendor') || h.includes('id'))) {
            headerRowIndex = i
            break
        }
    }

    const headerRow = rows[headerRowIndex].map(cell => String(cell || '').toLowerCase())

    // Find column indices
    const idIndex = headerRow.findIndex(h => h.includes('id') || h === 'nr')
    const nameIndex = headerRow.findIndex(h => h.includes('name') || h.includes('supplier') || h.includes('vendor'))
    const contactIndex = headerRow.findIndex(h => h.includes('contact') || h.includes('email') || h.includes('phone'))

    if (idIndex === -1 && nameIndex === -1) {
        return []
    }

    const suppliers: SupplierRecord[] = []

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i]

        const id = idIndex >= 0 ? String(row[idIndex] || '') : String(i - headerRowIndex)
        const name = nameIndex >= 0 ? String(row[nameIndex] || '') : ''

        if (!id && !name) continue

        suppliers.push({
            id: id.trim(),
            name: name.trim(),
            contact: contactIndex >= 0 ? String(row[contactIndex] || '') : undefined
        })
    }

    return suppliers
}
