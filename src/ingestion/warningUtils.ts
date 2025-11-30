// Warning Utilities
// Factory functions for creating structured ingestion warnings

import { IngestionWarning, IngestionWarningKind } from '../domain/core'

let warningCounter = 0

/**
 * Reset warning counter (useful for tests)
 */
export function resetWarningCounter(): void {
  warningCounter = 0
}

/**
 * Generate unique warning ID
 */
function generateWarningId(): string {
  return `warn-${Date.now()}-${warningCounter++}`
}

/**
 * Create a parser error warning
 */
export function createParserErrorWarning(args: {
  fileName: string
  sheetName?: string
  error: string
  source?: 'local' | 'remote'
}): IngestionWarning {
  const details: Record<string, string | number | boolean> = {
    error: args.error
  }

  if (args.source) {
    details.source = args.source
  }

  return {
    id: generateWarningId(),
    kind: 'PARSER_ERROR',
    fileName: args.fileName,
    sheetName: args.sheetName,
    message: `Parser error: ${args.error}`,
    details,
    createdAt: new Date().toISOString()
  }
}

/**
 * Create a header mismatch warning
 */
export function createHeaderMismatchWarning(args: {
  fileName: string
  sheetName: string
  missingColumns: string[]
  source?: 'local' | 'remote'
}): IngestionWarning {
  const details: Record<string, string | number | boolean> = {
    missingCount: args.missingColumns.length,
    missingColumns: args.missingColumns.join(', ')
  }

  if (args.source) {
    details.source = args.source
  }

  return {
    id: generateWarningId(),
    kind: 'HEADER_MISMATCH',
    fileName: args.fileName,
    sheetName: args.sheetName,
    message: `Missing required columns: ${args.missingColumns.join(', ')}`,
    details,
    createdAt: new Date().toISOString()
  }
}

/**
 * Create a row skipped warning
 */
export function createRowSkippedWarning(args: {
  fileName: string
  sheetName: string
  rowIndex: number
  reason: string
  source?: 'local' | 'remote'
}): IngestionWarning {
  const details: Record<string, string | number | boolean> = {
    reason: args.reason
  }

  if (args.source) {
    details.source = args.source
  }

  return {
    id: generateWarningId(),
    kind: 'ROW_SKIPPED',
    fileName: args.fileName,
    sheetName: args.sheetName,
    rowIndex: args.rowIndex,
    message: `Row ${args.rowIndex + 1} skipped: ${args.reason}`,
    details,
    createdAt: new Date().toISOString()
  }
}

/**
 * Create a linking ambiguous warning
 */
export function createLinkingAmbiguousWarning(args: {
  entityType: 'ROBOT' | 'TOOL'
  entityId: string
  fileName: string
  candidatesCount: number
  matchKey: string
  source?: 'local' | 'remote'
}): IngestionWarning {
  const details: Record<string, string | number | boolean> = {
    entityType: args.entityType,
    entityId: args.entityId,
    candidatesCount: args.candidatesCount,
    matchKey: args.matchKey
  }

  if (args.source) {
    details.source = args.source
  }

  return {
    id: generateWarningId(),
    kind: 'LINKING_AMBIGUOUS',
    fileName: args.fileName,
    message: `${args.entityType} "${args.entityId}" has ${args.candidatesCount} possible matches for key "${args.matchKey}"`,
    details,
    createdAt: new Date().toISOString()
  }
}

/**
 * Create a linking missing target warning
 */
export function createLinkingMissingTargetWarning(args: {
  entityType: 'ROBOT' | 'TOOL'
  entityId: string
  entityName: string
  fileName: string
  matchKey?: string
  reason: string
  source?: 'local' | 'remote'
}): IngestionWarning {
  const message = args.matchKey
    ? `${args.entityType} "${args.entityName}" (${args.entityId}) could not be linked: ${args.reason} (key: ${args.matchKey})`
    : `${args.entityType} "${args.entityName}" (${args.entityId}) could not be linked: ${args.reason}`

  const details: Record<string, string | number | boolean> = {
    entityType: args.entityType,
    entityId: args.entityId,
    entityName: args.entityName,
    matchKey: args.matchKey || '',
    reason: args.reason
  }

  if (args.source) {
    details.source = args.source
  }

  return {
    id: generateWarningId(),
    kind: 'LINKING_MISSING_TARGET',
    fileName: args.fileName,
    message,
    details,
    createdAt: new Date().toISOString()
  }
}

/**
 * Create an unknown file type warning
 */
export function createUnknownFileTypeWarning(args: {
  fileName: string
  source?: 'local' | 'remote'
}): IngestionWarning {
  const details: Record<string, string | number | boolean> = {}

  if (args.source) {
    details.source = args.source
  }

  return {
    id: generateWarningId(),
    kind: 'UNKNOWN_FILE_TYPE',
    fileName: args.fileName,
    message: `Unknown file type - skipped`,
    details,
    createdAt: new Date().toISOString()
  }
}

/**
 * Convert a legacy warning string to structured format
 */
export function convertLegacyWarning(
  message: string,
  fileName: string = '',
  kind: IngestionWarningKind = 'PARSER_ERROR'
): IngestionWarning {
  // Extract filename from message if present
  const fileMatch = message.match(/\[([^\]]+)\]/)
  const extractedFileName = fileMatch ? fileMatch[1] : fileName

  // Clean message
  const cleanMessage = message.replace(/\[[^\]]+\]\s*/, '')

  return {
    id: generateWarningId(),
    kind,
    fileName: extractedFileName,
    message: cleanMessage,
    createdAt: new Date().toISOString()
  }
}
