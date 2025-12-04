# CSG DesignOS Data Clarification

**Updated:** December 4, 2025

## Key Insight from User

> "The robot list in CSG DesignOS is just for reference, so that the external supplier can see it as a reference."

This is a **critical clarification** that changes how we handle the CSG data.

---

## What This Means

### CSG DesignOS Robot List
**File:** `DesignOS\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`

**Status:** ⚠️ **REFERENCE ONLY - DO NOT INGEST**

**Purpose:**
- Copy of the master robot list provided to CSG external supplier
- Allows CSG to see what robots they'll be working with
- **Not** an independent data source
- **Not** to be ingested into SimPilot (would create duplicates)

**Relationship to Master Robot List:**
- This is a **copy** of the main robot list (likely the same file)
- Placed in `DesignOS` folder for CSG's convenience
- May become **out of sync** with master if not updated regularly

---

## Updated Data Source Map

```
PRIMARY DATA SOURCES (DES Internal):
├── Tool List (Master)
│   └── Location: SimPilot_Data\STLA_S_ZAR Tool List.xlsx
│   └── Status: ✅ INGEST
│
├── Robot Equipment List (Master)
│   └── Location: SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx
│   └── Status: ✅ INGEST
│
├── Simulation Status - DES
│   ├── REAR UNIT (41% complete)
│   ├── UNDERBODY (31% complete)
│   └── Status: ✅ INGEST
│
└── Assemblies List (Design Progress)
    ├── BOTTOM TRAY, FRONT UNIT, REAR UNIT, UNDERBODY
    └── Status: ✅ INGEST

EXTERNAL SUPPLIER DATA (CSG):
├── Robot Equipment List (DesignOS Copy)
│   └── Location: DesignOS\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx
│   └── Status: ❌ REFERENCE ONLY - DO NOT INGEST
│   └── Note: This is a copy of the master for CSG reference
│
└── Simulation Status - CSG
    ├── FRONT UNIT (25% complete)
    ├── REAR UNIT (13% complete)
    ├── UNDERBODY (24% complete)
    └── Status: ✅ INGEST (with supplier tag)
```

---

## Impact on Blind Side Issues

### ✅ RESOLVED: Issue #2 Partially Clarified

**Original Issue:** "Robot Count Mismatch: 166 Robots vs 3,200+ Rows"

**Clarification:**
- The DesignOS robot list was a red herring
- We won't have duplicate robot lists (one was just a reference copy)
- Still need to understand why simulation status has 3,200+ rows for 166 robots
  - Most likely: Each robot has multiple tasks/applications tracked separately

### ⚠️ STILL NEEDS CLARIFICATION: DES vs CSG Station Ownership

**Question:** Do DES and CSG work on **different stations** within the same area?

**Example:**
- REAR UNIT has both:
  - DES Status: 41% complete
  - CSG Status: 13% complete
- Are these for **different stations/robots** within REAR UNIT?
- Or are they **duplicate tracking** of the same work?

**Possible Scenarios:**

**Scenario A: Split by Station** (Most Likely)
```
REAR UNIT Area
├── Stations 010-050: DES Internal (41% done)
└── Stations 060-100: CSG External (13% done)
```

**Scenario B: Split by Technology**
```
REAR UNIT Area
├── Spot Welding: DES Internal (41% done)
└── Material Handling: CSG External (13% done)
```

**Scenario C: Duplicate Tracking** (Unlikely but possible)
```
REAR UNIT Area
├── DES View: 41% complete (optimistic)
└── CSG View: 13% complete (conservative)
    → Need to reconcile which is true
```

---

## Updated Ingestion Strategy

### Step 1: Primary Data Sources (No Duplicates)
```typescript
const PRIMARY_FILES = [
  'STLA_S_ZAR Tool List.xlsx',                                    // ✅ Master tool list
  'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx',                 // ✅ Master robot list (from 03_Simulation folder)
  'STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx',                 // ✅ DES simulation
  'STLA-S_UNDERBODY_Simulation_Status_DES.xlsx',                 // ✅ DES simulation
  'J11006_TMS_STLA_S_*_Assemblies_List.xlsm'                     // ✅ All assemblies lists
]
```

### Step 2: External Supplier Data (Tagged)
```typescript
const EXTERNAL_SUPPLIER_FILES = [
  'DesignOS/05_Status_Sheets/STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx',    // ✅ CSG work
  'DesignOS/05_Status_Sheets/STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx',     // ✅ CSG work
  'DesignOS/05_Status_Sheets/STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx'      // ✅ CSG work
]

// Tag all CSG data with supplier identifier
interface SimulationStatus {
  // ... other fields
  supplier: 'DES' | 'CSG'  // ← Tag data by source
  sourceFile: string       // Track which file it came from
}
```

### Step 3: Skip Reference-Only Files
```typescript
const REFERENCE_ONLY_FILES = [
  'DesignOS/01_Equipment_List/Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx'  // ❌ Skip - reference copy
]

// Add to ingestion config
const INGESTION_CONFIG = {
  skipFiles: REFERENCE_ONLY_FILES,
  skipReason: 'Reference copy for external supplier - data duplicates master robot list'
}
```

---

## Validation Rules to Add

### Rule 1: Prevent Duplicate Robot Ingestion
```typescript
function validateRobotList(workbook: Workbook, fileName: string): ValidationResult {
  // Check if this is the reference copy
  if (fileName.includes('DesignOS') && fileName.includes('Robotlist')) {
    return {
      valid: false,
      warning: 'This appears to be a reference copy for CSG. Use the master robot list from 03_Simulation folder instead.',
      skip: true
    }
  }
  return { valid: true }
}
```

### Rule 2: Tag Simulation Data by Supplier
```typescript
function detectSimulationSupplier(fileName: string): 'DES' | 'CSG' {
  if (fileName.includes('_CSG.xlsx')) return 'CSG'
  if (fileName.includes('_DES.xlsx')) return 'DES'

  // Fallback: Check file path
  if (fileName.includes('DesignOS')) return 'CSG'
  return 'DES'  // Default to internal
}
```

### Rule 3: Warn on Potential Station Overlap
```typescript
function validateStationOwnership(
  desData: SimulationStatus[],
  csgData: SimulationStatus[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  // Group by area + station
  const desStations = new Set(desData.map(r => `${r.area}_${r.station}`))
  const csgStations = new Set(csgData.map(r => `${r.area}_${r.station}`))

  // Find overlaps
  const overlaps = [...desStations].filter(s => csgStations.has(s))

  if (overlaps.length > 0) {
    warnings.push({
      severity: 'warning',
      message: `Found ${overlaps.length} stations tracked by both DES and CSG. This may indicate duplicate data or unclear ownership.`,
      stations: overlaps
    })
  }

  return warnings
}
```

---

## Updated Document Count

### Before Clarification:
- **12 documents** (including duplicate robot list)

### After Clarification:
- **11 unique data sources**
- **1 reference copy** (to be skipped)

---

## Questions Still Need Answering

1. **Station Ownership:** How are DES and CSG stations split within each area?
   - By station number range?
   - By technology/application type?
   - By building/floor?

2. **Progress Reconciliation:** If there IS overlap, which supplier's progress is authoritative?
   - DES as primary, CSG as backup?
   - Average the two?
   - Show both with visual indicator?

3. **Robot Task Breakdown:** Why 3,200+ rows for 166 robots?
   - Confirm: Each robot has ~20 tasks/applications?
   - Is each row a "robot instance" or a "robot task"?

4. **Reference File Sync:** How often is the DesignOS robot list updated?
   - Could it be stale/outdated?
   - Should we warn user if versions mismatch?

---

## Recommended UI Changes

### Data Source Indicator
Show users where data came from:

```
┌─────────────────────────────────────────┐
│ REAR UNIT - Station BN_B05-010          │
│ Robot: R01 | Application: HW            │
├─────────────────────────────────────────┤
│ Progress: 41% complete                  │
│ Source: DES Internal ✓                  │
│                                         │
│ ⚠️ CSG also tracking this area (13%)    │
│    [View CSG Progress]                  │
└─────────────────────────────────────────┘
```

### Supplier Filter
Allow filtering by data source:

```
[Filter] Simulation Supplier:
  ☑ DES Internal (166 robots, 41% avg)
  ☑ CSG External (TBD robots, 20% avg)
```

### Ingestion Log
Show what was skipped and why:

```
✅ Ingested: STLA_S_ZAR Tool List.xlsx (439 tools)
✅ Ingested: Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx (166 robots)
⚠️ Skipped: DesignOS/.../Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx
   Reason: Reference copy for CSG supplier (duplicate of master robot list)
✅ Ingested: STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx (DES Internal)
✅ Ingested: STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx (CSG External)
```

---

## Next Steps

1. ✅ **DONE:** Document that DesignOS robot list is reference-only
2. ⏳ **TODO:** Confirm DES vs CSG station split methodology
3. ⏳ **TODO:** Add supplier tagging to domain model
4. ⏳ **TODO:** Implement reference file skip logic
5. ⏳ **TODO:** Add station overlap validation
6. ⏳ **TODO:** Update UI to show data source
