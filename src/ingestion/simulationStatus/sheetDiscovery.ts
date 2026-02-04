import type * as XLSX from 'xlsx'

/**
 * Find all simulation-related sheets in the workbook.
 * Returns sheets in priority order: SIMULATION, MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT
 */
export function findAllSimulationSheets(workbook: XLSX.WorkBook): string[] {
  const sheetNames = workbook.SheetNames
  const found: string[] = []
  const priorityOrder = ['SIMULATION', 'MRS_OLP', 'DOCUMENTATION', 'SAFETY_LAYOUT']

  // Find sheets in priority order
  for (const priorityName of priorityOrder) {
    // Exact match
    if (sheetNames.includes(priorityName)) {
      found.push(priorityName)
      continue
    }

    // Case-insensitive match
    const match = sheetNames.find(name => name.toUpperCase() === priorityName.toUpperCase())
    if (match && !found.includes(match)) {
      found.push(match)
      continue
    }

    // Partial match for MRS_OLP (could be "MRS_OLP", "MRS OLP", etc.)
    if (priorityName === 'MRS_OLP') {
      const mrsMatch = sheetNames.find(name => {
        const upper = name.toUpperCase()
        return (upper.includes('MRS') && upper.includes('OLP')) || upper.includes('MULTI RESOURCE')
      })
      if (mrsMatch && !found.includes(mrsMatch)) {
        found.push(mrsMatch)
        continue
      }
    }

    // Partial match for SAFETY_LAYOUT
    if (priorityName === 'SAFETY_LAYOUT') {
      const safetyMatch = sheetNames.find(name => {
        const upper = name.toUpperCase()
        return (upper.includes('SAFETY') && upper.includes('LAYOUT')) || 
               (upper.includes('SAFETY') && upper.includes('&'))
      })
      if (safetyMatch && !found.includes(safetyMatch)) {
        found.push(safetyMatch)
        continue
      }
    }
  }

  // Fallback: look for any sheet with "SIMULATION" or "STATUS" in the name
  if (found.length === 0) {
    // Try "SIMULATION" first
    let partial = sheetNames.find(name => name.toUpperCase().includes('SIMULATION'))
    if (partial) {
      found.push(partial)
    }

    // Try "STATUS" for BMW-style sheets (e.g., "Status_Side_Frame_XXX")
    if (found.length === 0) {
      partial = sheetNames.find(name => {
        const upper = name.toUpperCase()
        return upper.includes('STATUS') && !upper.includes('OVERVIEW') && !upper.includes('DEF')
      })
      if (partial) {
        found.push(partial)
      }
    }
  }

  return found
}

/**
 * Extract area name from title cell
 * e.g., "UNDERBODY - SIMULATION" -> "UNDERBODY"
 */
export function extractAreaNameFromTitle(titleCell: string): string | undefined {
  if (!titleCell) return undefined

  // Try splitting by " - "
  const parts = titleCell.split(' - ')
  if (parts.length > 0 && parts[0].trim().length > 0) {
    return parts[0].trim()
  }

  return undefined
}
