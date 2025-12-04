// Customer Mapping
// Maps project codes/identifiers to customer names
// This ensures consistent customer assignment across all file types

/**
 * Customer mapping configuration
 * Maps project identifiers (from filenames) to customer names
 */
const CUSTOMER_MAP: Record<string, string> = {
  // STLA-S projects map to TMS customer
  'STLA-S': 'TMS',
  'STLAS': 'TMS',
  'STLA': 'TMS',
  
  // Add more mappings as needed
  // 'PROJECT-CODE': 'Customer Name',
}

/**
 * Derive customer from filename or project identifier
 * Uses mapping if available, otherwise returns the identifier
 * 
 * @param identifier - Project identifier (usually from filename, e.g., "STLA-S")
 * @returns Customer name (e.g., "TMS")
 */
export function getCustomerFromIdentifier(identifier: string): string {
  if (!identifier) return 'Unknown'
  
  // Normalize identifier (uppercase, trim)
  const normalized = identifier.trim().toUpperCase()
  
  // Check mapping first
  if (CUSTOMER_MAP[normalized]) {
    return CUSTOMER_MAP[normalized]
  }
  
  // Check partial matches (e.g., "STLA-S_REAR" should match "STLA-S")
  for (const [key, value] of Object.entries(CUSTOMER_MAP)) {
    if (normalized.startsWith(key) || normalized.includes(key)) {
      return value
    }
  }
  
  // No mapping found, return identifier as-is
  return normalized
}

/**
 * Extract project identifier from filename
 * Typically the first part before underscore
 * 
 * @param fileName - Excel filename (e.g., "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx")
 * @returns Project identifier (e.g., "STLA-S")
 */
export function extractProjectIdentifier(fileName: string): string {
  // Remove extension
  const nameWithoutExt = fileName.replace(/\.(xlsx|xlsm|xls)$/i, '')
  
  // Split by underscore and take first part
  const parts = nameWithoutExt.split('_')
  return parts[0] || 'Unknown'
}

/**
 * Derive customer from filename
 * Combines extraction and mapping
 * 
 * @param fileName - Excel filename
 * @returns Customer name
 */
export function deriveCustomerFromFileName(fileName: string): string {
  const identifier = extractProjectIdentifier(fileName)
  return getCustomerFromIdentifier(identifier)
}

/**
 * Get all known customers
 * Useful for UI dropdowns, etc.
 */
export function getAllCustomers(): string[] {
  return Array.from(new Set(Object.values(CUSTOMER_MAP)))
}



