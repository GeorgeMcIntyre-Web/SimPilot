/**
 * DATA HEALTH EXPORT UTILITIES
 *
 * Helpers for exporting data health metrics to JSON and CSV formats.
 * Designed to be reusable and extensible.
 */

import type { ReuseSummary, LinkingStats } from '../domain/dataHealthStore'

// ============================================================================
// TYPES
// ============================================================================

export interface DataHealthExport {
  exportedAt: string
  totalAssets: number
  totalErrors: number
  unknownSourcingCount: number
  reuseSummary: ReuseSummary
  linkingStats: LinkingStats | null
  errors: string[]
}

export interface ErrorExportRow {
  index: number
  message: string
  workbookId: string | null
  sheet: string | null
}

// ============================================================================
// JSON EXPORT
// ============================================================================

/**
 * Build data health export object
 */
export function buildDataHealthExport(data: {
  totalAssets: number
  totalErrors: number
  unknownSourcingCount: number
  reuseSummary: ReuseSummary
  linkingStats: LinkingStats | null
  errors: string[]
}): DataHealthExport {
  return {
    exportedAt: new Date().toISOString(),
    totalAssets: data.totalAssets,
    totalErrors: data.totalErrors,
    unknownSourcingCount: data.unknownSourcingCount,
    reuseSummary: data.reuseSummary,
    linkingStats: data.linkingStats,
    errors: data.errors
  }
}

/**
 * Trigger browser download of JSON file
 */
export function downloadJson(data: unknown, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export data health metrics as JSON file
 */
export function exportDataHealthJson(data: {
  totalAssets: number
  totalErrors: number
  unknownSourcingCount: number
  reuseSummary: ReuseSummary
  linkingStats: LinkingStats | null
  errors: string[]
}): void {
  const exportData = buildDataHealthExport(data)
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadJson(exportData, `simpilot_data_health_${dateStr}.json`)
}

// ============================================================================
// CSV EXPORT FOR ERRORS
// ============================================================================

/**
 * Parse error message to extract context (workbookId, sheet)
 * Error messages often contain patterns like "[WORKBOOK_ID:Sheet:Row]"
 */
export function parseErrorContext(message: string): {
  workbookId: string | null
  sheet: string | null
  cleanMessage: string
} {
  // Pattern: [WORKBOOK_ID:SheetName:RowNumber] or [file.xlsx:SheetName]
  const bracketMatch = message.match(/^\[([^\]]+)\]\s*(.*)/)

  if (bracketMatch === null) {
    return { workbookId: null, sheet: null, cleanMessage: message }
  }

  const context = bracketMatch[1]
  const cleanMessage = bracketMatch[2] || message

  const parts = context.split(':')

  if (parts.length >= 2) {
    return {
      workbookId: parts[0] || null,
      sheet: parts[1] || null,
      cleanMessage
    }
  }

  return {
    workbookId: parts[0] || null,
    sheet: null,
    cleanMessage
  }
}

/**
 * Build error export rows with parsed context
 */
export function buildErrorExportRows(errors: string[]): ErrorExportRow[] {
  return errors.map((message, index) => {
    const { workbookId, sheet, cleanMessage } = parseErrorContext(message)
    return {
      index: index + 1,
      message: cleanMessage,
      workbookId,
      sheet
    }
  })
}

/**
 * Generate CSV content from error rows
 */
export function generateErrorsCsv(errors: string[]): string {
  if (errors.length === 0) {
    return ''
  }

  const rows = buildErrorExportRows(errors)
  const header = 'Index,Workbook,Sheet,Message\n'

  const csvRows = rows.map(row => {
    // Escape double quotes and wrap in quotes if contains comma
    const escapedMessage = row.message.includes(',') || row.message.includes('"')
      ? `"${row.message.replace(/"/g, '""')}"`
      : row.message

    return `${row.index},${row.workbookId ?? ''},${row.sheet ?? ''},${escapedMessage}`
  })

  return header + csvRows.join('\n')
}

/**
 * Export errors as CSV file
 */
export function exportErrorsCsv(errors: string[]): void {
  if (errors.length === 0) {
    return
  }

  const csvContent = generateErrorsCsv(errors)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  const dateStr = new Date().toISOString().slice(0, 10)
  link.setAttribute('download', `simpilot_errors_${dateStr}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
