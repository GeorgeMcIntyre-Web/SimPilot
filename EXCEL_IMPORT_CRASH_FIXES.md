# Excel Import Crash Fixes

## Problem Summary
The Excel import feature was crashing due to several memory and performance issues when processing large or malformed Excel files.

## Root Causes Identified

### 1. **Memory Crashes from Large Files**
- **Issue**: No file size validation before loading
- **Impact**: Files >100MB would crash the browser tab
- **Location**: `src/ingestion/workbookLoader.ts`

### 2. **Infinite Loops from Malformed Files**
- **Issue**: No limits on row/sheet processing
- **Impact**: Files with millions of empty rows would freeze the browser
- **Location**: Row normalization loop (lines 255-268)

### 3. **Excessive Sheet Processing**
- **Issue**: No limit on number of sheets
- **Impact**: Workbooks with 100+ sheets would cause memory issues

## Fixes Applied

### ✅ File Size Validation
```typescript
// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024

// Check before loading
if (input.size > MAX_FILE_SIZE) {
  log.error(`File too large: ${sizeMB}MB exceeds ${maxMB}MB limit`)
  return { fileName: name, sheets: [] }
}
```

### ✅ Row Limiting
```typescript
// Maximum rows per sheet: 100,000
const MAX_ROWS_PER_SHEET = 100000

// Limit rows to prevent memory issues
const rowsToProcess = rawRows.slice(0, MAX_ROWS_PER_SHEET)
if (rawRows.length > MAX_ROWS_PER_SHEET) {
  log.warn(`Sheet has ${rawRows.length} rows, limiting to ${MAX_ROWS_PER_SHEET}`)
}
```

### ✅ Sheet Limiting
```typescript
// Maximum sheets per workbook: 50
const MAX_SHEETS_PER_WORKBOOK = 50

// Limit sheets to prevent excessive processing
const sheetsToProcess = workbook.SheetNames.slice(0, MAX_SHEETS_PER_WORKBOOK)
if (workbook.SheetNames.length > MAX_SHEETS_PER_WORKBOOK) {
  log.warn(`Workbook has ${workbook.SheetNames.length} sheets, limiting to ${MAX_SHEETS_PER_WORKBOOK}`)
}
```

## Safety Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max File Size | 100 MB | Prevents browser memory crashes |
| Max Rows/Sheet | 100,000 | Prevents infinite loops and freezing |
| Max Sheets/Workbook | 50 | Prevents excessive processing time |

## User Experience Improvements

1. **Early Validation**: Files are checked before loading into memory
2. **Clear Error Messages**: Users see helpful messages like "File too large: 150MB exceeds 100MB limit"
3. **Graceful Degradation**: Large files are truncated with warnings instead of crashing
4. **Console Logging**: All limits and warnings are logged for debugging

## Testing Recommendations

Test with:
- ✅ Normal Excel files (<10MB, <1000 rows)
- ✅ Large files (50-100MB)
- ✅ Files with many sheets (20-50 sheets)
- ✅ Files with excessive empty rows
- ✅ Corrupted/malformed Excel files

## Files Modified

- **`src/ingestion/workbookLoader.ts`** - Added safety limits for row/sheet processing
- **`src/ingestion/excelUtils.ts`** - **CRITICAL FIX**: Added file size validation before arrayBuffer() call

## Critical Fix Location

The **most important fix** is in `src/ingestion/excelUtils.ts` at line 40-49:

```typescript
// CRITICAL: Check file size BEFORE loading into memory to prevent crashes
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB limit
if (input.size > MAX_FILE_SIZE) {
  const sizeMB = (input.size / (1024 * 1024)).toFixed(2)
  const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)
  throw new Error(
    `File too large: ${name} (${sizeMB}MB exceeds ${maxMB}MB limit). ` +
    `Please split the file into smaller chunks or remove unnecessary data.`
  )
}
```

This check happens **BEFORE** `arrayBuffer()` is called, preventing the browser from attempting to load oversized files into memory.

## Next Steps (Optional Enhancements)

1. **Progress Indicators**: Show progress bar for large file processing
2. **Chunked Processing**: Process large files in chunks to prevent UI freezing
3. **Worker Threads**: Move Excel parsing to Web Workers for better performance
4. **User Preferences**: Allow users to adjust limits in settings
5. **File Preview**: Show file size/sheet count before importing

## Migration Notes

- **No Breaking Changes**: All changes are backward compatible
- **Existing Files**: Files within limits will work exactly as before
- **Oversized Files**: Will now fail gracefully with clear error messages instead of crashing
