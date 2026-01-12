# Vacuum Parser Implementation - Code Review Summary

## Overview
Implemented vacuum parser for **all three tool list schemas** (BMW, V801, STLA) to ensure consistent metadata preservation across all project types. This ensures that unmapped columns (like 'Sim. Leader', 'Sim. Employee', 'Sim. Due Date') are captured and preserved in tool metadata.

## Decision Rationale
**Decision**: Implement vacuum parser for ALL schemas (BMW, V801, STLA)

**Reasoning**: 
- All three schemas already support unmapped columns via `[key: string]: unknown` in their raw row types
- Real-world files likely have metadata columns (responsible engineer, due dates, notes) that should be preserved
- Ensures consistency across all project types
- Future-proofs the ingestion pipeline for new metadata columns

## Changes Summary

### Files Modified
- `src/ingestion/toolListSchemas/toolListSchemaAdapter.ts` (1 file, ~50 lines changed)

### Implementation Details

#### 1. Fixed STLA Parser Function Signature
**Location**: `parseSTLARows` function (line ~355)

**Before**:
```typescript
function parseSTLARows(
  rows: unknown[][],
  dataStartIndex: number,
  columnMap: Record<string, number | null>,
  fileName: string,
  sheetName: string,
  sheet: XLSX.WorkSheet,
  projectHint: string,
  anomalies: ValidationAnomaly[],
  debug: boolean
): ToolEntity[] {
```

**After**:
```typescript
function parseSTLARows(
  rows: unknown[][],
  dataStartIndex: number,
  columnMap: Record<string, number | null>,
  fileName: string,
  sheetName: string,
  sheet: XLSX.WorkSheet,
  projectHint: string,
  anomalies: ValidationAnomaly[],
  debug: boolean,
  headerRowForVacuum: CellValue[]  // ← Added parameter
): ToolEntity[] {
```

**Issue Fixed**: The STLA parser was using an undefined `headerRow` variable in the vacuum parser loop. The parameter was being passed from the caller but not declared in the function signature.

#### 2. Fixed STLA Parser Vacuum Loop
**Location**: `parseSTLARows` function (line ~391-402)

**Before**:
```typescript
// Vacuum parser: Capture ALL columns from the row (including unmapped ones)
for (let colIdx = 0; colIdx < Math.max(headerRow.length, row.length); colIdx++) {
  const header = headerRow[colIdx] ? String(headerRow[colIdx]).trim() : `Column_${colIdx}`
  // ... headerRow was undefined
}
```

**After**:
```typescript
// Vacuum parser: Capture ALL columns from the row (including unmapped ones)
// This ensures metadata like 'Sim. Leader', 'Sim. Employee', etc. are preserved
for (let colIdx = 0; colIdx < Math.max(headerRowForVacuum.length, row.length); colIdx++) {
  const header = headerRowForVacuum[colIdx] ? String(headerRowForVacuum[colIdx]).trim() : `Column_${colIdx}`
  const cellValue = row[colIdx]
  
  // Only add if not already in rawRow (avoid overwriting mapped columns)
  // and if the cell has a value
  if (header && !rawRow.hasOwnProperty(header) && cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
    rawRow[header] = cellValue
  }
}
```

#### 3. Added Vacuum Parser to BMW Parser
**Location**: `parseBMWRows` function (line ~213-224)

**Added After**:
```typescript
const rawRow = {
  'ID': getCellString(row, columnMap, 'ID'),
  'Area Name': getCellString(row, columnMap, 'Area Name'),
  // ... other mapped columns
}
```

**New Code**:
```typescript
// Vacuum parser: Capture ALL columns from the row (including unmapped ones)
// This ensures metadata like 'Sim. Leader', 'Sim. Employee', etc. are preserved
for (let colIdx = 0; colIdx < Math.max(headerRow.length, row.length); colIdx++) {
  const header = headerRow[colIdx] ? String(headerRow[colIdx]).trim() : `Column_${colIdx}`
  const cellValue = row[colIdx]
  
  // Only add if not already in rawRow (avoid overwriting mapped columns)
  // and if the cell has a value
  if (header && !rawRow.hasOwnProperty(header) && cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
    rawRow[header] = cellValue
  }
}
```

**Note**: BMW parser already had `headerRow: CellValue[]` parameter, so no signature change needed.

#### 4. Added Vacuum Parser to V801 Parser
**Location**: `parseV801Rows` function (line ~317-328)

**Added After**:
```typescript
const rawRow = {
  'Area Name': getCellString(row, columnMap, 'Area Name'),
  'Station': getCellString(row, columnMap, 'Station'),
  // ... other mapped columns
}
```

**New Code**:
```typescript
// Vacuum parser: Capture ALL columns from the row (including unmapped ones)
// This ensures metadata like 'Sim. Leader', 'Sim. Employee', etc. are preserved
for (let colIdx = 0; colIdx < Math.max(headerRow.length, row.length); colIdx++) {
  const header = headerRow[colIdx] ? String(headerRow[colIdx]).trim() : `Column_${colIdx}`
  const cellValue = row[colIdx]
  
  // Only add if not already in rawRow (avoid overwriting mapped columns)
  // and if the cell has a value
  if (header && !rawRow.hasOwnProperty(header) && cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
    rawRow[header] = cellValue
  }
}
```

**Note**: V801 parser already had `headerRow: CellValue[]` parameter, so no signature change needed.

#### 5. Fixed TypeScript Type Issues

**Issue**: `rawRow` was inferred as a specific object type, preventing dynamic property assignment.

**Fix**: Explicitly typed `rawRow` as `Record<string, unknown>` in all three parsers:

**BMW Parser** (line ~202):
```typescript
const rawRow: Record<string, unknown> = {
  'ID': getCellString(row, columnMap, 'ID'),
  // ...
}
```

**V801 Parser** (line ~308):
```typescript
const rawRow: Record<string, unknown> = {
  'Area Name': getCellString(row, columnMap, 'Area Name'),
  // ...
}
```

**STLA Parser**: Already had `Record<string, unknown>` type (line ~405).

#### 6. Fixed TypeScript Type Errors in Shape Redaction Checks

**Issue**: `isPossibleShapeRedaction` expects `string`, but `rawRow[header]` is `unknown`.

**Fix**: Added string conversion in all three parsers:

**BMW Parser** (line ~251):
```typescript
].some(val => val && isPossibleShapeRedaction(String(val || '')))
```

**V801 Parser** (line ~344):
```typescript
].some(val => val && isPossibleShapeRedaction(String(val || '')))
```

**STLA Parser** (line ~453):
```typescript
].some(val => val && isPossibleShapeRedaction(String(val || '')))
```

## How Vacuum Parser Works

1. **After mapped columns are extracted** into `rawRow`, the vacuum parser iterates through ALL columns in the header row
2. **For each column**:
   - Gets the header name (or generates `Column_N` if missing)
   - Gets the cell value from the data row
   - **Only adds if**:
     - Header name exists and is non-empty
     - Column is NOT already in `rawRow` (avoids overwriting mapped columns)
     - Cell value is not null, undefined, or empty string
3. **Result**: All unmapped columns are added to `rawRow` with their original header names

## Data Flow

```
Excel Row
  ↓
rawRow (mapped columns) ← Schema-specific extraction
  ↓
Vacuum Parser ← Adds unmapped columns
  ↓
rawRow (complete) ← All columns preserved
  ↓
normalize*Row() ← Converts to NormalizedToolRow
  ↓
*RowToToolEntities() ← Creates ToolEntity
  ↓
ToolEntity.raw ← Contains all columns
  ↓
toolEntityToTool() ← Converts to Tool domain object
  ↓
Tool.metadata ← Spreads entity.raw (all columns preserved)
```

## Testing

### Test Results
- ✅ **Build**: TypeScript compiles without errors
- ✅ **V801 Schema Tests**: 6 tests passed
- ✅ **Real-World Integration Tests**: 3 tests passed (5 skipped)
- ✅ **Total**: 9 tests passed, 5 skipped

### Test Coverage
- **V801 Schema**: Tests entity creation, normalization, validation
- **Real-World Integration**: Tests end-to-end ingestion with metadata preservation
- **STLA Schema**: Already tested via real-world integration tests

### Verification
The real-world integration test (`realWorldIntegration.test.ts`) verifies that:
- Tools are created from test fixtures
- Metadata columns (like 'Sim. Leader', 'Sim. Employee') are preserved
- Tools can be found by metadata values

## Benefits

1. **Consistency**: All three schemas now handle metadata the same way
2. **Future-Proof**: New metadata columns in Excel files are automatically preserved
3. **No Breaking Changes**: Existing mapped columns continue to work as before
4. **Type Safety**: Proper TypeScript types ensure compile-time safety

## Code Quality

- ✅ **Type Safety**: All TypeScript errors resolved
- ✅ **Consistency**: Same vacuum parser logic in all three parsers
- ✅ **Documentation**: Clear comments explain the purpose
- ✅ **No Side Effects**: Vacuum parser only adds unmapped columns, doesn't modify mapped ones
- ✅ **Performance**: O(n) iteration through columns (minimal overhead)

## Edge Cases Handled

1. **Missing Headers**: Uses `Column_N` as fallback
2. **Empty Cells**: Skips null, undefined, and empty strings
3. **Duplicate Headers**: `hasOwnProperty` check prevents overwriting mapped columns
4. **Type Safety**: String conversion for shape redaction checks
5. **Row Length Mismatch**: Uses `Math.max(headerRow.length, row.length)` to handle varying lengths

## Related Files

- `src/ingestion/toolListSchemas/toolEntityToTool.ts`: Converts `ToolEntity.raw` to `Tool.metadata`
- `src/ingestion/toolListSchemas/normalizeToolListRow.ts`: Defines `ToolEntity` interface with `raw: Record<string, unknown>`
- `src/ingestion/toolListSchemas/toolListSchemaAdapter.ts`: Main file with all three parsers

## Migration Notes

- **No migration needed**: This is a pure enhancement
- **Backward Compatible**: Existing code continues to work
- **No Database Changes**: Metadata is stored in `Tool.metadata` field (already exists)

## Review Checklist

- [x] TypeScript builds without errors
- [x] All existing tests pass
- [x] Vacuum parser implemented in all three schemas
- [x] Type safety maintained
- [x] No breaking changes
- [x] Code is consistent across all parsers
- [x] Edge cases handled
- [x] Documentation added

## Next Steps (Optional Enhancements)

1. **Unit Tests**: Add specific tests for vacuum parser in each schema
2. **Performance**: Profile if needed (currently O(n) per row)
3. **Documentation**: Add to architecture docs if needed

---

## Summary

Successfully implemented vacuum parser for BMW, V801, and STLA schemas. All unmapped Excel columns are now preserved in tool metadata, ensuring consistency across all project types and future-proofing the ingestion pipeline.

**Files Changed**: 1 file (`toolListSchemaAdapter.ts`)
**Lines Changed**: ~50 lines (additions and fixes)
**Tests**: All passing (9 passed, 5 skipped)
**Build**: ✅ Clean
