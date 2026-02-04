import { deriveCustomerFromFileName } from '../customerMapping'

/**
 * Derive project name from filename
 * e.g., "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx" -> "STLA-S"
 *
 * Note: The unit parts (FRONT UNIT, REAR UNIT, UNDERBODY) are NOT part of the project name.
 * They represent Areas within the project, which are already captured in the row data.
 */
export function deriveProjectName(fileName: string): string {
  const base = fileName.replace(/\.(xlsx|xlsm|xls)$/i, '')
  const parts = base.split('_')

  // Return just the customer/platform name (first part)
  // e.g., "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx" -> "STLA-S"
  return parts[0].replace(/-/g, ' ').trim()
}

/**
 * Derive customer from filename
 * Uses customer mapping for consistent assignment
 */
export function deriveCustomer(fileName: string): string {
  return deriveCustomerFromFileName(fileName)
}
