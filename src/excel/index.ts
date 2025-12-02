// Excel Module
// Schema-agnostic ingestion engine for SimPilot.
// Provides field registry, column/sheet profiling, and field matching.

// Field Registry
export {
  type FieldId,
  type FieldExpectedType,
  type FieldImportance,
  type FieldDescriptor,
  getAllFieldDescriptors,
  getFieldDescriptorById,
  getFieldDescriptorsByImportance,
  getFieldDescriptorsByType,
  findFieldDescriptorsBySynonym,
  getAllFieldIds,
  isValidFieldId
} from './fieldRegistry'

// Column Profiler
export {
  type RawColumnContext,
  type DataTypeDistribution,
  type ColumnProfile,
  profileColumn,
  profileColumns,
  tokenizeHeader,
  isNumericColumn,
  isIntegerColumn,
  isDateColumn,
  isMostlyEmptyColumn,
  getColumnFillRate,
  getColumnCardinality,
  isLikelyIdentifierColumn,
  isLikelyCategoryColumn
} from './columnProfiler'

// Sheet Profiler
export {
  type RawSheet,
  type SheetQualityMetrics,
  type SheetProfile,
  profileSheet,
  profileSheets,
  detectHeaderRowIndex,
  findColumnsByHeaderPattern,
  getColumnByIndex,
  getColumnByHeader,
  getIdentifierColumns,
  getCategoryColumns,
  isValidDataSheet,
  getSheetProfileSummary
} from './sheetProfiler'

// Field Matcher
export {
  type FieldMatch,
  type FieldMatchResult,
  type MatchScoringConfig,
  DEFAULT_SCORING_CONFIG,
  matchFieldForColumn,
  matchAllColumns,
  getBestFieldId,
  findColumnsForField,
  buildFieldToColumnMap,
  getUnmatchedColumns,
  getLowConfidenceMatches,
  getMatchSummary,
  formatMatchResult,
  normalizeScore
} from './fieldMatcher'

// Engine Bridge (integration with existing ingestion modules)
export {
  fieldIdToColumnRole,
  columnRoleToFieldIds,
  scoreSheetByFieldSignatures,
  detectCategoryByFields,
  normalizedSheetToRawSheet,
  profileAndMatchSheet,
  getColumnIndexForField,
  getColumnIndicesForField,
  buildRoleMapFromMatchResults,
  generateDiagnosticReport
} from './engineBridge'
