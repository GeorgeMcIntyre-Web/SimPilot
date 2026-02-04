// Ingestion Coordinator V2 - Warning Converters
// Functions to convert between telemetry and legacy warning formats

import type { IngestionWarning } from '../../domain/core'
import type { FileIngestionWarning } from '../ingestionTelemetry'

/**
 * Convert a telemetry warning to a legacy IngestionWarning
 */
export function telemetryToLegacyWarning(warning: FileIngestionWarning): IngestionWarning {
  return {
    id: warning.id,
    kind: mapWarningCodeToKind(warning.code),
    fileName: warning.fileName,
    sheetName: warning.sheetName,
    rowIndex: warning.rowIndex,
    message: warning.message,
    details: warning.details,
    createdAt: new Date().toISOString()
  }
}

/**
 * Map warning code to legacy kind
 */
function mapWarningCodeToKind(code: string): IngestionWarning['kind'] {
  switch (code) {
    case 'UNKNOWN_FILE_TYPE':
      return 'UNKNOWN_FILE_TYPE'
    case 'NO_HEADER_FOUND':
    case 'MISSING_REQUIRED_COLUMN':
      return 'HEADER_MISMATCH'
    case 'ROW_SKIPPED':
      return 'ROW_SKIPPED'
    case 'LINKING_AMBIGUOUS':
      return 'LINKING_AMBIGUOUS'
    case 'LINKING_MISSING_TARGET':
      return 'LINKING_MISSING_TARGET'
    default:
      return 'PARSER_ERROR'
  }
}

/**
 * Convert legacy IngestionWarning to telemetry warning
 */
export function legacyToTelemetryWarning(warning: IngestionWarning): FileIngestionWarning {
  return {
    id: warning.id,
    fileName: warning.fileName,
    sheetName: warning.sheetName,
    rowIndex: warning.rowIndex,
    code: mapLegacyKindToCode(warning.kind),
    message: warning.message,
    severity: warning.kind === 'PARSER_ERROR' ? 'error' : 'warning',
    details: warning.details
  }
}

/**
 * Map legacy kind to warning code
 */
function mapLegacyKindToCode(kind: IngestionWarning['kind']): FileIngestionWarning['code'] {
  switch (kind) {
    case 'UNKNOWN_FILE_TYPE':
      return 'UNKNOWN_FILE_TYPE'
    case 'HEADER_MISMATCH':
      return 'MISSING_REQUIRED_COLUMN'
    case 'ROW_SKIPPED':
      return 'ROW_SKIPPED'
    case 'LINKING_AMBIGUOUS':
      return 'LINKING_AMBIGUOUS'
    case 'LINKING_MISSING_TARGET':
      return 'LINKING_MISSING_TARGET'
    default:
      return 'PARSER_ERROR'
  }
}
