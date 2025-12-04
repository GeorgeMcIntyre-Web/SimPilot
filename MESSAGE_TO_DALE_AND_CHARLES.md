# SimPilot Document Analysis - Summary for Dale & Charles

**Date:** December 4, 2025
**From:** George (with Claude assistance)
**Subject:** Document Analysis Complete - Need Clarification on Key Issues

---

## Executive Summary

We've completed a comprehensive analysis of all Excel documents for the STLA-S project. **Good news:** We successfully identified how DES and CSG work is divided with zero conflicts. **However,** we've identified several critical issues that need your input to resolve before we can confidently ingest all the data.

---

## Documents Analyzed

### ✅ Successfully Mapped (11 files)

**DES Internal:**
1. `STLA_S_ZAR Tool List.xlsx` - Master tool list (439 tools, 488 employees)
2. `STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx` - DES simulation work
3. `STLA-S_UNDERBODY_Simulation_Status_DES.xlsx` - DES simulation work
4. `Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx` - Master robot list (166 robots)
5. `J11006_TMS_STLA_S_BOTTOM_TRAY_Assemblies_List.xlsm`
6. `J11006_TMS_STLA_S_FRONT_UNIT_Assemblies_List.xlsm`
7. `J11006_TMS_STLA_S_REAR_UNIT_Assemblies_List.xlsm`
8. `J11006_TMS_STLA_S_UNDERBODY_Assemblies_List.xlsm`

**CSG External:**
9. `STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx`
10. `STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx`
11. `STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx`

**Reference Only (Skip):**
- `DesignOS/01_Equipment_List/Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx` - Confirmed as reference copy for CSG

---

## Key Finding: DES vs CSG Work Division ✅

**Zero conflicts detected!** DES and CSG work on completely separate assembly lines:

| Area | DES Owns | CSG Owns | Notes |
|------|----------|----------|-------|
| **FRONT UNIT** | None | AA, AD, AF, AK, AL, DD (100%) | Entirely CSG |
| **REAR UNIT** | BN, CL (51%) | CA, CM, CN (49%) | Split 50/50 |
| **UNDERBODY** | BA, BC, BP, BQ, BS (69%) | BR (31%) | Mostly DES |

**Totals:**
- DES: 66 station-robot combinations (40%)
- CSG: 100 station-robot combinations (60%)

This is clean and ready to ingest once other issues are resolved.

---

## Critical Issues Requiring Your Input

### 1. ~~**Simulation Status Row Count Mystery**~~ ✅ RESOLVED

**Original Problem:**
- Simulation Status sheets appeared to have **3,200+ rows** each
- Seemed like way too many rows for 166 robots

**RESOLUTION:**
- ✅ **99% of those rows are EMPTY!** Excel template has 3,200 blank rows but only 20-60 are filled
- **Actual data rows:**
  - REAR UNIT (DES): 26 rows
  - UNDERBODY (DES): 44 rows
  - FRONT UNIT (CSG): 60 rows
  - REAR UNIT (CSG): 25 rows
  - UNDERBODY (CSG): 21 rows
- **Total: 176 station-robot combinations** across all files
- This matches the ~170 robots in the Robot List ✅

**No issue here** - row counts are correct once we filter out empty padding rows.

---

### 1. 🔴 Safety & Layout at 0% (CRITICAL)

**Problem:**
All simulation status documents show:
- **Safety:** 0% complete across ALL areas (DES and CSG)
- **Layout:** 0% complete (except DES UNDERBODY at 41%)

**Questions:**
1. Is this accurate, or is Safety/Layout tracked elsewhere?
2. Are these different teams with separate tracking systems?
3. Should these metrics be weighted in our "overall completion" calculations?

**Impact:** Project dashboards will show higher completion than reality if Safety/Layout are critical path items.

**Please advise:** Are these figures accurate? Should we track Safety/Layout separately?

---

### 2. ~~**Tool ID Naming / Linking**~~ ✅ CLARIFIED

**Original Problem:**
- Three different naming systems across documents seemed to prevent linking

**CLARIFICATION:**
- **Tool List:** Tracks 3D designs (design department scope)
- **Simulation Status:** Tracks robots (simulation department scope, robot-by-robot)
- **Assemblies List:** Tracks tool lifecycle across all departments

**They connect via Station Number:**
- `BN010` (Assemblies) = Assembly Line `BN_B05`, Station `010` (Simulation)

**Remaining Question:**
- Are tools and robots **directly linked**, or are they **separate tracking systems** that both happen at the same station?
- Example: Does Robot R01 specifically use Tool GJR 10, or do we just track them independently?

**Please advise:** Should we link robots to specific tools, or track them separately? (See [DOCUMENT_SYSTEM_EXPLAINED.md](DOCUMENT_SYSTEM_EXPLAINED.md) for details)

---

### 3. 🟠 Design vs Simulation Timeline (HIGH)

**Problem:**
- **Assemblies Lists** show 60-70% "Not Started" for FRONT/BOTTOM TRAY design
- **Simulation Status** shows 25-48% simulation work already complete for same areas

**Questions:**
1. Does simulation use preliminary/rough designs?
2. Are the Assemblies Lists out of date?
3. Is there a dependency: "Design must be X% done before simulation starts"?

**Impact:** Risk of simulation rework if design changes significantly after simulation is complete.

**Please advise:** Is this timeline mismatch a concern, or is this the normal workflow?

---

### 4. 🟡 Percentage Format Inconsistency (MEDIUM)

**Problem:**
- Some sheets store 67% as `0.67` (decimal)
- Others store 67% as `67` (whole number)
- Excel sometimes displays one but stores the other

**Questions:**
1. Should we normalize all percentages to decimals (0-1 range)?
2. Or normalize to whole numbers (0-100 range)?

**Impact:** Charts could show "0.67%" instead of "67%" if we get this wrong.

**Please advise:** What's the preferred format for percentages?

---

### 5. 🟡 Date Format Variations (MEDIUM)

**Problem:**
Dates appear in multiple formats:
- Excel serial: `45989`
- European: `25.11.2025sam` (with "sam" suffix?)
- Slashes: `2025/11/26`

**Questions:**
1. What does the "sam" suffix mean in dates?
2. Should we standardize to ISO format (yyyy-MM-dd)?

**Impact:** Due date alerts won't work if dates can't be parsed correctly.

**Please advise:** Are all date formats valid, or should we flag unusual ones?

---

## Documents We're NOT Sure About

### Missing or Unclear:

1. **FRONT UNIT DES Status:** We have no DES simulation status for FRONT UNIT (only CSG). Is this intentional because FRONT UNIT is 100% CSG?

2. **Reuse Equipment Lists:** We found references to:
   - `GLOBAL_ZA_REUSE_LIST_RISERS.xlsx`
   - `GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx`
   - `GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx`
   - `P1MX_Reuse Equipment -STLA-S_2025_10_29_REV00.xlsm`

   **Question:** Should we ingest these reuse lists? Are they relevant for tracking current project status?

3. **Employee/Supplier Assignment:** Tool List has 488 employees and 876 suppliers, but many tools show blank assignments.

   **Question:** Should we flag unassigned tools as data quality issues?

---

## What We Need From You

### Primary Questions (Must Answer):

1. **Safety/Layout:** Is 0% accurate, or are these tracked elsewhere?
2. **Robot-Tool linking:** Do robots link to specific tools, or track separately by station?
3. **Design timeline:** Is the simulation/design mismatch a concern?

### Secondary Questions (Nice to Have):

4. Which documents should be our "source of truth" if data conflicts?
5. Should we ingest reuse equipment lists?
6. Are the CSG files the latest versions? (They're in a DesignOS folder)
7. File update frequency: How often are these documents updated?

---

## Recommended Data Sources (Our Proposal)

Based on analysis, we recommend ingesting:

### ✅ Definite YES:
- Tool List (master reference)
- All Assemblies Lists (design progress)
- All Simulation Status files - DES and CSG (tagged by supplier)
- Master Robot List from `03_Simulation` folder

### ❌ Definite NO:
- Robot List in `DesignOS` folder (confirmed as reference copy)

### ❓ Need Your Input:
- Reuse equipment lists
- Change Index sheets (revision history)
- Employee/Supplier metadata

---

## Next Steps

Once you provide guidance on the critical issues above, we can:

1. **Finalize ingestion strategy** with clear rules for each document type
2. **Build tool ID normalization** tables if needed
3. **Add supplier tagging** to all data (DES vs CSG)
4. **Create validation rules** to catch data quality issues during import
5. **Design dashboard views** that accurately reflect project status

---

## Supporting Documentation

Full analysis available in:
- `DOCUMENT_ANALYSIS_SUMMARY.md` - Complete document breakdown
- `STATION_OWNERSHIP_MAP.md` - DES vs CSG assembly line mapping
- `BLIND_SIDE_ISSUES.md` - All 25 issues identified (6 critical, 10 high, 9 medium)
- `station_ownership_analysis.json` - Raw data from analysis

---

## Summary

**Good News:**
- ✅ DES/CSG work clearly separated by assembly line - no conflicts
- ✅ Schema-agnostic import system is ready and robust
- ✅ All document structures understood

**Blockers:**
- 🔴 Need confirmation on Safety/Layout 0% figures
- 🟠 Need robot-tool linking strategy clarification
- 🟡 Need clarity on date/percentage formats

**Request:**
Please review the 5 questions above and provide guidance so we can proceed with confidence. We want to make sure SimPilot displays accurate, trustworthy data from day one.

---

**Thanks,**
**George**

*Analysis completed with AI assistance (Claude) - full audit trail available in repo*
