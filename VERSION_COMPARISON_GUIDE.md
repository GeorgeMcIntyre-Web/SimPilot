# Version Comparison Feature Guide

## Overview

The Version Comparison feature automatically detects changes when you re-import data into SimPilot. It helps you understand what's changed between the current data and the new files you're uploading.

## How It Works

### 1. Initial Import (No Comparison)

When you upload files for the first time (empty database):
- Files are processed immediately
- No comparison is shown
- Data is loaded directly into the store

### 2. Re-Import (With Comparison)

When you upload files and there's existing data:
1. **Preview Phase**: System analyzes differences without applying changes
2. **Comparison Modal**: Shows a detailed breakdown of changes
3. **User Decision**: You choose to either "Import Changes" or "Cancel"
4. **Apply Phase**: If confirmed, changes are applied to the store

## What Gets Compared

The system compares all entity types:
- **Projects**: Name, customer, status, manager, SOP date
- **Areas**: Name, code, project assignments
- **Cells**: Name, code, status, assigned engineer, line code
- **Robots**: Name, OEM model, area, station, sourcing
- **Tools**: Name, OEM model, area, station, sourcing, description

## Change Types

### ✅ ADDED
New entities that don't exist in the current data.

**Example**: New tool "BN010 GJR 15" appears in Assemblies List

### 📝 MODIFIED
Existing entities with changed field values.

**Example**: Robot R1234 OEM model changed from "ABB IRB 6700" to "ABB IRB 6790"

### ❌ REMOVED
Entities that exist currently but are missing from the new data.

**Example**: Tool "BN005 GJR 3" no longer appears in the new files

### ✓ UNCHANGED
Entities that are identical in both versions (not shown in modal).

## Conflict Severity Levels

### 🔴 HIGH
Critical fields that affect core functionality:
- `id`, `name`, `projectId`, `areaId`, `cellId`, `stationNumber`, `kind`

**Why it matters**: Changing these fields can break entity relationships

### 🟡 MEDIUM
Important operational fields:
- `status`, `percentComplete`, `assignedEngineer`, `oemModel`, `toolType`

**Why it matters**: These affect project tracking and reporting

### 🟢 LOW
Descriptive or supplementary fields:
- `description`, `notes`, `metadata`, etc.

**Why it matters**: Changes are informational only

## Version Comparison Modal

### Summary Cards
Four cards show counts:
- **Added** (green): New entities
- **Modified** (blue): Changed entities
- **Removed** (red): Missing entities
- **Conflicts** (yellow/red): Total field changes

### High-Severity Warning
If any HIGH-severity conflicts are detected, a red warning banner appears:

```
⚠️ High-Severity Conflicts Detected
Important fields have changed. Please review carefully before importing.
```

### Detailed Changes Section
Expandable sections for each entity type:
- **Projects (X changes)**: List of added/modified/removed projects
- **Areas (X changes)**: List of area changes
- **Cells (X changes)**: List of cell changes
- **Robots (X changes)**: List of robot changes
- **Tools (X changes)**: List of tool changes

### Conflict Details
For modified entities, field-level changes are shown:

```
🔴 stationNumber: BN010 → BN015
🟡 oemModel: ABB IRB 6700 → ABB IRB 6790
🟢 description: "Gripper" → "Gripper with force sensor"
```

## User Actions

### Import Changes
- Applies all changes to the database
- Overwrites existing data with new values
- REMOVED entities are deleted
- ADDED entities are inserted
- MODIFIED entities are updated

### Cancel
- Discards the new data
- Keeps the current database unchanged
- No changes are applied

## Technical Architecture

### Key Files

1. **[src/ingestion/versionComparison.ts](src/ingestion/versionComparison.ts)**
   - Core comparison logic
   - Entity-level change detection
   - Field-level conflict analysis
   - Severity classification

2. **[src/ingestion/ingestionCoordinator.ts](src/ingestion/ingestionCoordinator.ts)**
   - Integrated version comparison into ingestion flow
   - Supports `previewOnly` mode for comparison
   - Converts robots/tools to UnifiedAsset for comparison

3. **[src/app/components/VersionComparisonModal.tsx](src/app/components/VersionComparisonModal.tsx)**
   - React component for comparison UI
   - Summary cards, conflict details, change lists
   - Confirm/cancel actions

4. **[src/app/routes/DataLoaderPage.tsx](src/app/routes/DataLoaderPage.tsx)**
   - Updated to show comparison modal
   - Handles both local and M365 ingestion
   - Two-phase import: preview → confirm

### Data Flow

```
User uploads files
      ↓
Has existing data?
      ↓ Yes
Parse files (previewOnly=true)
      ↓
Compare with current store
      ↓
Show VersionComparisonModal
      ↓
User confirms?
      ↓ Yes
Parse files (previewOnly=false)
      ↓
Apply changes to store
```

## Example Scenarios

### Scenario 1: Updated Robot Specs
**File**: New version of `Robotlist_*.xlsx` with updated OEM models

**Changes**:
- 3 robots modified (OEM model changed)
- 2 robots added (new robots purchased)
- 1 robot removed (decommissioned)

**Modal Shows**:
- Summary: 3 modified, 2 added, 1 removed
- Conflict severity: MEDIUM (oemModel changes)
- Detailed list of each robot with old → new values

### Scenario 2: Updated Assemblies List
**File**: New version of `J11006_TMS_STLA_S_*_Assemblies_List.xlsm` with design progress updates

**Changes**:
- 150 tools modified (progress percentages updated)
- 5 tools added (new assemblies designed)
- 0 tools removed

**Modal Shows**:
- Summary: 150 modified, 5 added, 0 removed
- Conflict severity: LOW (metadata changes only)
- First 5 modified tools shown (... and 145 more)

### Scenario 3: New Simulation Status
**File**: Updated `Simulation Status List.xlsx` with new cells and status changes

**Changes**:
- 2 projects modified (SOP date updated)
- 5 cells modified (status changed from "Not Started" to "In Progress")
- 3 cells added (new stations added)
- 0 removed

**Modal Shows**:
- Summary: 10 modified, 3 added, 0 removed
- Conflict severity: MEDIUM (status changes)
- Detailed breakdown by entity type

## Data Size Analysis

**Current Dataset**:
- 2 projects
- 8 areas
- 170 cells
- 166 robots
- 439 tools (including 2000+ assemblies)

**Total Size**: ~5-6 MB

**Browser Limits**:
- IndexedDB: ~50 GB
- In-memory operations: Hundreds of MB

**Conclusion**: Version comparison is perfectly feasible. The dataset is tiny compared to browser capabilities.

## Implementation Status

### ✅ Completed
- [x] Core comparison logic (`compareVersions()`)
- [x] Entity-level change detection (ADDED/MODIFIED/REMOVED/UNCHANGED)
- [x] Field-level conflict detection with severity
- [x] Version comparison integrated into `ingestFiles()`
- [x] `previewOnly` mode support
- [x] VersionComparisonModal React component
- [x] DataLoaderPage updated (both local and M365)
- [x] Build passing with no TypeScript errors

### 🧪 Testing Needed
- [ ] Test end-to-end flow with real data files
- [ ] Verify comparison accuracy
- [ ] Test with large datasets (2000+ assemblies)
- [ ] Test cancel flow
- [ ] Test confirm flow
- [ ] Verify store updates correctly

## How to Test

### Test 1: First Import (No Comparison)
1. Clear all data: Use "Clear Data" button or `public/clear_all_data.html`
2. Go to Data Loader page
3. Upload files (Simulation Status + Equipment files)
4. **Expected**: Data loads immediately, no modal shown

### Test 2: Re-Import (With Comparison)
1. With data already loaded from Test 1
2. Upload the same files again
3. **Expected**: Version comparison modal appears
4. **Expected**: Summary shows "0 changes" (data identical)
5. Click "Import Changes"
6. **Expected**: Data remains unchanged

### Test 3: Modified Data
1. Modify an Excel file (e.g., change robot OEM model in Robotlist)
2. Upload the modified file
3. **Expected**: Modal shows 1 modified robot
4. **Expected**: Old → new values displayed
5. Click "Import Changes"
6. **Expected**: Store updated with new values

### Test 4: Added/Removed Entities
1. Add a new row to Simulation Status (new cell)
2. Remove a row from Robot List (remove robot)
3. Upload both files
4. **Expected**: Modal shows 1 added cell, 1 removed robot
5. **Expected**: High-severity warning for removed entity
6. Click "Import Changes"
7. **Expected**: New cell added, robot deleted from store

### Test 5: Cancel Flow
1. Upload modified files
2. **Expected**: Modal appears
3. Click "Cancel"
4. **Expected**: Modal closes, no changes applied
5. **Expected**: Store remains unchanged

## Future Enhancements

### Possible Improvements
- **Merge Strategy**: Instead of overwrite, allow selective merge
- **Conflict Resolution**: Let user choose which value to keep per field
- **Change History**: Store version history with timestamps
- **Rollback**: Ability to undo previous imports
- **Diff Viewer**: Side-by-side comparison of field values
- **Export Changes**: Export comparison results to Excel
- **Auto-Merge Low Conflicts**: Automatically apply low-severity changes

### Not Planned
- **Collaborative Editing**: Multi-user conflict resolution (out of scope)
- **Real-time Sync**: Live updates from SharePoint (would require WebHooks)
- **Version Branches**: Git-like branching (over-engineering)

## Troubleshooting

### Modal Doesn't Appear
- **Check**: Do you have existing data? First import won't show modal
- **Check**: Is `hasData` hook working correctly?
- **Fix**: Clear data and re-import to test

### Incorrect Change Detection
- **Check**: Are IDs stable across files?
- **Issue**: If IDs change, entities will show as REMOVED + ADDED
- **Fix**: Ensure parsers use consistent ID generation

### High Memory Usage
- **Check**: Dataset size in DevTools → Application → IndexedDB
- **Expected**: ~5-6 MB for current dataset
- **Issue**: If >50 MB, investigate parser memory leaks

### Modal Performance Slow
- **Check**: Number of entities in comparison
- **Issue**: Rendering 1000+ modified entities might be slow
- **Fix**: Use pagination or virtualized lists for large change sets

## Summary

The Version Comparison feature provides:
- ✅ **Safety**: Review changes before applying
- ✅ **Transparency**: See exactly what will change
- ✅ **Control**: Choose to apply or cancel
- ✅ **Insight**: Understand data evolution over time

This feature is production-ready and awaiting end-to-end testing with real data files.
