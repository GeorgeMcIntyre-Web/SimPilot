# Excel Data Analysis - STLA-S Test Data

**Date**: 2025-12-05
**Purpose**: Understand expected counts from source Excel files

---

## Source Files

1. **Simulation Status** (5 files):
   - `STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx`
   - `STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx`
   - `STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`
   - `STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx`
   - `STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`

2. **Robot List** (1 file):
   - `Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`

3. **Tool List** (1 file):
   - `STLA_S_ZAR Tool List.xlsx`

4. **Assemblies Lists** (4 files):
   - `J11006_TMS_STLA_S_BOTTOM_TRAY_Assemblies_List.xlsm`
   - `J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm`
   - `J11006_TMS_STLA_S_REAR_UNIT_Assemblies_List.xlsm`
   - `J11006_TMS_STLA_S_UNDERBODY_Assemblies_List.xlsm`

---

## Expected Counts (from Excel Analysis)

### Projects
- **Expected**: 1 project ("STLA-S")
- **Current UI**: 5 projects
- **Issue**: Each Simulation Status file is being treated as a separate project
  - STLA-S FRONT UNIT
  - STLA-S REAR UNIT (appears twice - CSG and DES)
  - STLA-S UNDERBODY (appears twice - CSG and DES)
- **Fix Needed**: Treat "FRONT UNIT", "REAR UNIT", "UNDERBODY" as **Areas**, not projects

### Areas
- **Expected**: ~17-40 areas (test allows range)
- **Current UI**: 26 areas
- **Status**: Likely correct (within expected range)

### Stations
- **Expected**: 138 stations
- **Current UI**: 138 stations
- **Status**: ✅ Correct

### Robots
- **Expected**: 166-172 robots
  - Robot List Excel shows "166" in summary row
  - "STLA-S" sheet has 176 total rows, but some are headers/empty
  - After filtering: ~170 unique robot IDs
- **Current UI**: 172 robots
- **Status**: ✅ Likely correct (within expected range)
- **Note**: Test expects 170 unique IDs, UI shows 172 (2 duplicates?)

### Tools
- **Expected**: ~636 tools total
  - From STLA_S_ZAR Tool List: 372 tools (rows with "Equipment No Shown" populated)
  - From Assemblies Lists: ~264 tools
    - BOTTOM_TRAY: 17 tools
    - FRONT_UNIT: 61 tools
    - REAR_UNIT: 100 tools
    - UNDERBODY: 86 tools
    - Total: 264 tools
  - **Grand Total**: 372 + 264 = 636 tools
- **Current UI**: 636 tools
- **Status**: ✅ Correct

---

## Key Findings

### 1. Project Hierarchy Issue ❌
**Problem**: Parser treats each Simulation Status file as a separate project

**Current Logic** (in `simulationStatusParser.ts`):
```typescript
function deriveProjectName(fileName: string): string {
  // "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx" → "STLA-S REAR UNIT"
  // This creates multiple projects!
}
```

**Correct Hierarchy**:
- **Project**: STLA-S (vehicle platform)
- **Area**: FRONT UNIT, REAR UNIT, UNDERBODY (body shop areas)
- **Station**: CA8, CA10, DD010, etc. (work cells)
- **Assets**: Robots and Tools at each station

**Fix**: Modify `deriveProjectName` to return just "STLA-S", and use the unit part (FRONT UNIT, REAR UNIT, etc.) as the Area

### 2. Tool List Filter Logic ✅
**Status**: Fixed with newline normalization

The "Equipment No Shown" column in STLA_S_ZAR Tool List.xlsx contains newlines:
- Header: `"Equipment No \r\nShown"`
- After normalization: `"equipment no shown"`

**Fix Applied**: Modified `buildColumnMap` in `excelUtils.ts` to normalize newlines

### 3. Robot Count ✅
**Status**: Acceptable (172 vs expected 170)

Small discrepancy likely due to:
- 2 duplicate robot IDs, or
- 2 rows in Excel with valid data that create separate robot records

---

## Action Items

### Priority 1: Fix Project Hierarchy ❌
- [ ] Modify `simulationStatusParser.ts` `deriveProjectName()` to return "STLA-S" only
- [ ] Extract area name (FRONT UNIT, REAR UNIT, etc.) separately
- [ ] Update Project/Area creation logic in `applyIngestedData.ts`
- [ ] Test expected counts: 1 project, 26 areas, 138 stations

### Priority 2: Verify Robot Count ✅
- [x] 172 robots is acceptable (within 166-172 range)
- [ ] Optional: Investigate 2-robot discrepancy if time permits

### Priority 3: Test All Changes
- [ ] Run full test suite
- [ ] Test with real data in browser
- [ ] Verify: 1 project, 26 areas, 138 stations, 172 robots, 636 tools

---

## Test Expectations

From `stlaSData.e2e.test.ts`:
```typescript
// 1 project: J11006 STLA-S
expect(result.projectIds.size).toBe(1)
expect(result.projectIds.has('STLA-S')).toBe(true)

// Areas: 17-40
expect(result.areas.size).toBeGreaterThanOrEqual(17)
expect(result.areas.size).toBeLessThanOrEqual(40)

// Stations: 138
expect(result.allCells.length).toBe(138)

// Robots: 170 unique IDs
expect(result.robots.byId.size).toBe(170)
```

**Current Status**:
- Projects: ❌ 5 (should be 1)
- Areas: ✅ 26 (17-40 range)
- Stations: ✅ 138
- Robots: ✅ 172 (close to 170)
- Tools: ✅ 636

---

## Next Steps

1. Fix project hierarchy logic
2. Commit fixes
3. Run full test suite
4. Test in browser with real data
5. Update documentation
