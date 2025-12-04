# Station Ownership Map - DES vs CSG

**Analysis Date:** December 4, 2025
**Result:** ✅ **ZERO CONFLICTS** - Clean separation of work

---

## Executive Summary

**Key Finding:** DES and CSG work on **completely different assembly lines** within each area. There is **ZERO overlap** in station ownership.

- **Total Station-Robot Combinations:** 166
  - DES Internal: 66 (40%)
  - CSG External: 100 (60%)

- **Overlap:** 0 stations tracked by both suppliers ✅

---

## Area-by-Area Breakdown

### 1. FRONT UNIT
**Owner:** CSG External (100%)

| Supplier | Assembly Lines | Stations | Sample Stations |
|----------|---------------|----------|-----------------|
| **CSG** | AA_B05, AD_B05, AF_B05, AK_B05, AL_B09, AL_B10, DD_B05 | 58 | AL_B09/010, AL_B09/020, AL_B10/010 |
| DES | _(none)_ | 0 | - |

**Interpretation:** FRONT UNIT is entirely outsourced to CSG external supplier.

---

### 2. REAR UNIT
**Owner:** Split between DES and CSG

| Supplier | Assembly Lines | Stations | Sample Stations |
|----------|---------------|----------|-----------------|
| **DES** | BN_B05, CL_B05, CL_B06 | 24 | BN_B05/010, BN_B05/020, CL_B05/010 |
| **CSG** | CA_B05, CM_B05, CN_B05 | 23 | CM_B05/005, CM_B05/020, CN_B05/010 |

**Interpretation:** REAR UNIT work is split approximately 50/50 by assembly line designation.

**DES Assembly Lines:**
- BN_B05 (stations: 010, 020, 030, 040, 110, 120, 130, 140)
- CL_B05 (stations: 010, 020, 030, 040, 050, etc.)
- CL_B06 (various stations)

**CSG Assembly Lines:**
- CA_B05
- CM_B05 (stations: 005, 020, 030, 040, 050, 060)
- CN_B05 (stations: 010, 020, 030, 040, etc.)

---

### 3. UNDERBODY
**Owner:** Primarily DES, with CSG handling one line

| Supplier | Assembly Lines | Stations | Sample Stations |
|----------|---------------|----------|-----------------|
| **DES** | BA_B04, BC_B04, BP_B05, BQ_B05, BS_B05 | 42 | BC_B04/007, BC_B04/008, BA_B04/010 |
| **CSG** | BR_B06 | 19 | BR_B06/010, BR_B06/020, BR_B06/030 |

**Interpretation:** DES handles most of UNDERBODY (69%), with CSG responsible for the BR_B06 assembly line.

**DES Assembly Lines:**
- BA_B04, BC_B04, BP_B05, BQ_B05, BS_B05

**CSG Assembly Lines:**
- BR_B06 (only)

---

## Assembly Line Naming Convention

Assembly lines follow the pattern: `[Code]_B0[Number]`

**Examples:**
- `AL_B09` - Assembly Line AL, Building 9
- `CM_B05` - Assembly Line CM, Building 5
- `BC_B04` - Assembly Line BC, Building 4

**Observation:** Different assembly line codes indicate different physical locations or production lines.

---

## Supplier Responsibility Matrix

```
┌──────────────┬─────────────────────────┬──────────────────────────┬────────┐
│ Area         │ DES Assembly Lines      │ CSG Assembly Lines       │ Split  │
├──────────────┼─────────────────────────┼──────────────────────────┼────────┤
│ FRONT UNIT   │ (none)                  │ AA, AD, AF, AK, AL, DD   │ 0/100% │
│ REAR UNIT    │ BN, CL                  │ CA, CM, CN               │ 51/49% │
│ UNDERBODY    │ BA, BC, BP, BQ, BS      │ BR                       │ 69/31% │
└──────────────┴─────────────────────────┴──────────────────────────┴────────┘
```

---

## Data Ingestion Strategy

### ✅ Confirmed: Ingest ALL files without conflict

Since there is **zero overlap**, we can safely ingest all simulation status files:

**DES Internal:**
```
✅ STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx
   → Assembly Lines: BN_B05, CL_B05, CL_B06
   → 24 station-robot combinations

✅ STLA-S_UNDERBODY_Simulation_Status_DES.xlsx
   → Assembly Lines: BA_B04, BC_B04, BP_B05, BQ_B05, BS_B05
   → 42 station-robot combinations
```

**CSG External:**
```
✅ STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx
   → Assembly Lines: AA_B05, AD_B05, AF_B05, AK_B05, AL_B09, AL_B10, DD_B05
   → 58 station-robot combinations

✅ STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx
   → Assembly Lines: CA_B05, CM_B05, CN_B05
   → 23 station-robot combinations

✅ STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx
   → Assembly Lines: BR_B06
   → 19 station-robot combinations
```

**Reference Only (SKIP):**
```
❌ DesignOS/01_Equipment_List/Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx
   → This is a copy of the master robot list for CSG reference only
```

---

## Domain Model Updates Needed

### Add Supplier Tagging

```typescript
interface Cell {
  id: string
  projectId: string
  areaId: string
  // ... existing fields

  // NEW: Track which supplier is responsible
  simulationSupplier: 'DES' | 'CSG'
  assemblyLine: string  // e.g., "BN_B05", "AL_B09"
}

interface Robot {
  id: string
  cellId: string
  // ... existing fields

  // NEW: Supplier tracking
  simulationSupplier: 'DES' | 'CSG'
  assemblyLine: string
  station: string
}
```

### Validation Rule: Detect Unexpected Overlaps

Even though current data shows zero conflicts, add defensive validation:

```typescript
function validateStationOwnership(
  allCells: Cell[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  // Group by assembly line + station
  const stationMap = new Map<string, Set<string>>()

  allCells.forEach(cell => {
    const key = `${cell.assemblyLine}_${cell.station}`
    if (!stationMap.has(key)) {
      stationMap.set(key, new Set())
    }
    stationMap.get(key)!.add(cell.simulationSupplier)
  })

  // Check for unexpected overlaps
  stationMap.forEach((suppliers, stationKey) => {
    if (suppliers.size > 1) {
      warnings.push({
        severity: 'error',
        message: `Station ${stationKey} has conflicting ownership: ${[...suppliers].join(' and ')}`,
        stationKey,
        suppliers: [...suppliers]
      })
    }
  })

  return warnings
}
```

---

## UI Display Recommendations

### Dashboard - Supplier Breakdown

Show work distribution visually:

```
┌─────────────────────────────────────────────────────┐
│ Project Overview - STLA-S                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│ FRONT UNIT (58 stations)                           │
│ ████████████████████████████████████ 100% CSG      │
│                                                     │
│ REAR UNIT (47 stations)                            │
│ ████████████████░░░░░░░░░░░░░░░░ 51% DES           │
│ ░░░░░░░░░░░░░░░░████████████████ 49% CSG           │
│                                                     │
│ UNDERBODY (61 stations)                            │
│ ████████████████████████░░░░░░░░ 69% DES           │
│ ░░░░░░░░░░░░░░░░░░░░░░░░████████ 31% CSG           │
│                                                     │
│ Overall: 66 DES (40%) | 100 CSG (60%)              │
└─────────────────────────────────────────────────────┘
```

### Cell/Station Detail - Show Supplier

```
┌─────────────────────────────────────────┐
│ REAR UNIT - Assembly Line BN_B05        │
│ Station: 010                            │
├─────────────────────────────────────────┤
│ Supplier: DES Internal ✓                │
│ Progress: 41% complete                  │
│                                         │
│ Robots: 1 (R01 - HW application)        │
└─────────────────────────────────────────┘
```

### Filter by Supplier

```
[Filter] Simulation Supplier:
  ☑ DES Internal (66 stations, 40% overall)
  ☑ CSG External (100 stations, 60% overall)

[Filter] Assembly Line:
  ☑ BN_B05 (DES)
  ☑ CL_B05 (DES)
  ☑ CM_B05 (CSG)
  ☑ AL_B09 (CSG)
  ... (show all)
```

---

## Progress Comparison - DES vs CSG

From the original analysis, we can now contextualize the completion percentages:

### REAR UNIT
- **DES (BN_B05, CL_B05, CL_B06):** 41% complete ✅
- **CSG (CA_B05, CM_B05, CN_B05):** 13% complete ⚠️
- **Interpretation:** DES is ahead; CSG needs acceleration on their assembly lines

### UNDERBODY
- **DES (BA_B04, BC_B04, BP_B05, BQ_B05, BS_B05):** 31% complete ⚠️
- **CSG (BR_B06):** 24% complete ⚠️
- **Interpretation:** Both suppliers behind schedule; DES slightly ahead

### FRONT UNIT
- **CSG (all lines):** 25% complete ⚠️
- **Interpretation:** CSG is solely responsible; needs attention

---

## Critical Insights

### 1. CSG Workload is Heavier
- **CSG:** 100 station-robot combinations (60%)
- **DES:** 66 station-robot combinations (40%)
- CSG is handling more stations overall

### 2. FRONT UNIT Entirely External
- 100% outsourced to CSG
- If CSG falls behind, FRONT UNIT is at risk
- No DES backup capacity

### 3. Assembly Line = Clear Ownership Boundary
- No shared assembly lines between DES and CSG
- Clean handoff points at assembly line level
- Easy to track accountability

### 4. Risk Assessment by Area

| Area | Risk Level | Reason |
|------|-----------|---------|
| FRONT UNIT | 🔴 HIGH | 100% CSG dependency, 25% complete |
| REAR UNIT | 🟡 MEDIUM | CSG portion only 13% complete |
| UNDERBODY | 🟢 LOW | DES has majority (69%), ahead of CSG |

---

## Recommendations

### 1. Dashboard Enhancement
- Show **supplier split** on main dashboard
- Highlight **CSG-dependent areas** (FRONT UNIT)
- Add **assembly line filter** to views

### 2. Progress Tracking
- Track **DES vs CSG progress** separately
- Alert if CSG falls >10% behind DES
- Weekly supplier comparison report

### 3. Risk Mitigation
- **FRONT UNIT:** Monitor CSG closely (single point of failure)
- **REAR UNIT:** Consider shifting some CSG lines to DES if they fall further behind

### 4. Data Validation
- Add **assembly line validation** during ingestion
- Flag any station appearing in both DES and CSG files (should never happen)
- Track **supplier assignment changes** over time

---

## Data Source Summary

**Correct Files for Each Area:**

### DES Internal
```
REAR UNIT:     03_Simulation/00_Simulation_Status/STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx
UNDERBODY:     03_Simulation/00_Simulation_Status/STLA-S_UNDERBODY_Simulation_Status_DES.xlsx
```

### CSG External
```
FRONT UNIT:    DesignOS/05_Status_Sheets/STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx
REAR UNIT:     DesignOS/05_Status_Sheets/STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx
UNDERBODY:     DesignOS/05_Status_Sheets/STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx
```

**Note:** There is NO DES file for FRONT UNIT because it's 100% CSG responsibility.

---

## Next Steps

1. ✅ **DONE:** Confirmed zero conflicts between DES and CSG
2. ⏳ **TODO:** Add `simulationSupplier` and `assemblyLine` fields to domain model
3. ⏳ **TODO:** Update ingestion to tag data by supplier
4. ⏳ **TODO:** Add supplier filter and breakdown to UI
5. ⏳ **TODO:** Create supplier comparison dashboard
6. ⏳ **TODO:** Set up alerts for CSG progress lag
