# Plan: Fix Empty Columns in Assets Tab

**Columns to fix:** Line, Sourcing, Reuse Status, Robot #

**Status:** Ready for implementation

---

## Summary

The Assets tab table correctly defines columns that look for metadata fields, but the data parsers aren't extracting/storing these fields properly.

| Column | Expected Metadata Key | Current Issue |
|--------|----------------------|---------------|
| Line | `metadata.lineCode` | Stored at top-level, not always in metadata |
| Sourcing | `asset.sourcing` | Hardcoded to `'UNKNOWN'` in robotListParser |
| Reuse Status | `metadata.reuseAllocationStatus` | Never stored in metadata |
| Robot # | `metadata.robotNumber` or `metadata.gunId` | Never extracted |

---

## Task 1: Update robotListParser.ts

**File:** `src/ingestion/robotListParser.ts`

### 1.1 Fix Sourcing (Line ~259)

**Current code:**
```typescript
sourcing: 'UNKNOWN', // Default for now
```

**Change to:**
```typescript
sourcing: detectRobotSourcing(metadata, comments) || 'UNKNOWN',
```

**Add helper function** (around line 50):
```typescript
function detectRobotSourcing(
  metadata: Record<string, unknown>,
  comments?: string
): EquipmentSourcing | undefined {
  const searchText = [
    comments,
    metadata['status'] as string,
    metadata['sourcing'] as string,
    metadata['supply'] as string,
  ].filter(Boolean).join(' ').toLowerCase();

  if (searchText.includes('carry over') || searchText.includes('carryover') || searchText.includes('reuse')) {
    return 'CARRYOVER';
  }
  if (searchText.includes('new') || searchText.includes('make')) {
    return 'NEW';
  }
  return undefined;
}
```

### 1.2 Add robotNumber to metadata (Line ~260-264)

**Current code:**
```typescript
metadata: {
  ...metadata,
  ...(lineCode ? { lineCode } : {}),
}
```

**Change to:**
```typescript
metadata: {
  ...metadata,
  ...(lineCode ? { lineCode } : {}),
  ...(lineCode ? { assemblyLine: lineCode } : {}),
  ...(robotCaption ? { robotNumber: robotCaption } : {}),
  ...(eNumber ? { serialNumber: eNumber } : {}),
}
```

### 1.3 Ensure robotCaption is extracted (Line ~172-178)

Verify this extraction exists and works:
```typescript
const robotCaption = getCellString(row, columnMap, 'ROBOT CAPTION')
  || getCellString(row, columnMap, 'ROBOT')
  || getCellString(row, columnMap, 'ROBOT NAME')
  || getCellString(row, columnMap, 'ROBOT ID');
```

---

## Task 2: Update toolListParser.ts

**File:** `src/ingestion/toolListParser.ts`

### 2.1 Store reuseStatus in metadata as reuseAllocationStatus (Line ~380-384)

**Current code:**
```typescript
metadata: {
  ...metadata,
  ...(lineCode ? { lineCode } : {}),
  ...(notes ? { notes } : {}),
}
```

**Change to:**
```typescript
metadata: {
  ...metadata,
  ...(lineCode ? { lineCode } : {}),
  ...(lineCode ? { assemblyLine: lineCode } : {}),
  ...(notes ? { notes } : {}),
  ...(reuseStatus ? { reuseAllocationStatus: reuseStatus } : {}),
  ...(gunId ? { gunId } : {}),
}
```

### 2.2 Ensure gunId is extracted (Line ~159-197)

Verify the extraction includes:
```typescript
const gunId = getCellString(row, columnMap, 'GUN ID')
  || getCellString(row, columnMap, 'GUN NUMBER')
  || getCellString(row, columnMap, 'WG ID')
  || getCellString(row, columnMap, 'TOOL ID');
```

### 2.3 Verify sourcing detection is applied

The `detectSourcing()` function exists at lines 471-492. Ensure it's called and the result is used:
```typescript
const sourcing = detectSourcing(reuseStatus, comments, supplyIndicator);
```

---

## Task 3: Verify AssetsTableColumns.tsx (No changes expected)

**File:** `src/app/components/AssetsTableColumns.tsx`

Verify the columns are reading the correct metadata keys (lines 71-125):

```typescript
// Line column (should already be correct)
accessor: (asset) => {
  const lineCode = extractMetadata<string>(asset, 'lineCode')
    ?? extractMetadata<string>(asset, 'assemblyLine');
  return lineCode ?? '—';
}

// Sourcing column (should already be correct)
accessor: (asset) => <SourcingBadge sourcing={asset.sourcing} />

// Reuse Status column (should already be correct)
accessor: (asset) => {
  const reuseStatus = extractMetadata<ReuseAllocationStatus>(asset, 'reuseAllocationStatus');
  // ...
}

// Robot # column (should already be correct)
accessor: (asset) => {
  const robotNumber = extractMetadata<string>(asset, 'robotNumber');
  const gunId = extractMetadata<string>(asset, 'gunId');
  return robotNumber || gunId || '—';
}
```

---

## Task 4 (Optional): Integrate Reuse List Pipeline

This is a more complex change that would fully integrate reuse list data.

**Files involved:**
- `src/ingestion/ingestionCoordinator.ts` (lines 630-680)
- `src/ingestion/applyIngestedData.ts`
- `src/ingestion/parsers/reuseListCoordinator.ts`

**Approach:**
1. In `ingestFilesInternal()`, after processing robot/tool lists, call reuse list coordinator
2. Match reuse records to tools/robots by equipment ID or location
3. Update `metadata.reuseAllocationStatus` with matched reuse allocation

**Skip this task** if your Excel files already contain reuse status in the robot/tool lists themselves.

---

## Testing Checklist

After implementing the fixes:

- [ ] Load a robot list Excel file
  - [ ] Line column shows line codes
  - [ ] Robot # column shows robot identifiers
  - [ ] Sourcing column shows detected sourcing (not UNKNOWN)

- [ ] Load a tool/equipment Excel file
  - [ ] Line column shows line codes
  - [ ] Robot # column shows gun IDs
  - [ ] Reuse Status column shows reuse status
  - [ ] Sourcing column shows detected sourcing

- [ ] Verify in browser console:
  ```javascript
  // Check robot metadata
  coreStore.getState().assets
    .filter(a => a.kind === 'ROBOT')
    .map(a => ({ name: a.name, metadata: a.metadata }))

  // Check tool metadata
  coreStore.getState().assets
    .filter(a => a.kind !== 'ROBOT')
    .map(a => ({ name: a.name, metadata: a.metadata }))
  ```

---

## Files to Modify (Priority Order)

| Priority | File | Lines | Change |
|----------|------|-------|--------|
| 1 | `src/ingestion/robotListParser.ts` | 259-264 | Add sourcing detection, robotNumber to metadata |
| 2 | `src/ingestion/toolListParser.ts` | 380-384 | Add reuseAllocationStatus, gunId to metadata |
| 3 | `src/app/components/AssetsTableColumns.tsx` | 71-125 | Verify (likely no changes) |
| 4 | `src/ingestion/ingestionCoordinator.ts` | 630-680 | Optional: Reuse list integration |

---

## Key Code Patterns to Follow

### Metadata extraction pattern (parsers):
```typescript
metadata: {
  ...existingMetadata,
  ...(fieldValue ? { fieldName: fieldValue } : {}),
}
```

### Metadata reading pattern (UI):
```typescript
const value = extractMetadata<string>(asset, 'fieldName');
```

### Sourcing detection pattern:
```typescript
function detectSourcing(text: string): EquipmentSourcing {
  const lower = text.toLowerCase();
  if (lower.includes('carry over') || lower.includes('reuse')) return 'CARRYOVER';
  if (lower.includes('new') || lower.includes('make')) return 'NEW';
  return 'UNKNOWN';
}
```

---

## Notes

- The field registry (`src/excel/fieldRegistry.ts`) already has all required field definitions
- The vacuum parser pattern automatically captures extra columns into metadata
- Both parsers use fallback chains (`||`) to try multiple column name variations
- The `extractMetadata()` helper handles type-safe metadata access
