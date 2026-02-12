// Ingestion Coordinator V2 - Warning Converters
// Functions to convert between telemetry and legacy warning formats

import type { IngestionWarning } from '../../domain/core'
import type { FileIngestionWarning } from '../ingestionTelemetry'

const KNOWN_WARNING_KINDS = new Set<IngestionWarning['kind']>([
  'PARSER_ERROR',
  'HEADER_MISMATCH',
  'SEMANTIC_AMBIGUOUS_HEADER',
  'SEMANTIC_UNMAPPED_HEADER',
  'SEMANTIC_MISSING_REQUIRED_FIELD',
  'ROW_SKIPPED',
  'LINKING_AMBIGUOUS',
  'LINKING_MISSING_TARGET',
  'UNKNOWN_FILE_TYPE',
  'INACTIVE_ENTITY_REFERENCE',
  'DUPLICATE_ENTRY',
])

function toKnownLegacyKind(value: unknown): IngestionWarning['kind'] | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  if (!KNOWN_WARNING_KINDS.has(value as IngestionWarning['kind'])) {
    return undefined
  }

  return value as IngestionWarning['kind']
}

/**
 * Convert a telemetry warning to a legacy IngestionWarning
 */
export function telemetryToLegacyWarning(warning: FileIngestionWarning): IngestionWarning {
  // Preserve exact legacy warning kind when telemetry flattened it to a broader code.
  const explicitKind = toKnownLegacyKind(warning.details?.legacyKind)

  return {
    id: warning.id,
    kind: explicitKind ?? mapWarningCodeToKind(warning.code),
    fileName: warning.fileName,
    sheetName: warning.sheetName,
    rowIndex: warning.rowIndex,
    message: warning.message,
    details: warning.details,
    createdAt: new Date().toISOString(),
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
    case 'LOW_CONFIDENCE_MATCH':
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
    details: {
      // Store original warning kind so telemetry->legacy round-trip is lossless.
      ...(warning.details ?? {}),
      legacyKind: warning.kind,
    },
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
    case 'SEMANTIC_UNMAPPED_HEADER':
    case 'SEMANTIC_MISSING_REQUIRED_FIELD':
      return 'MISSING_REQUIRED_COLUMN'
    case 'SEMANTIC_AMBIGUOUS_HEADER':
      return 'LOW_CONFIDENCE_MATCH'
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
