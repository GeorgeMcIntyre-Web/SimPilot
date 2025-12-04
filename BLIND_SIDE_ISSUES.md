# Blind Side Items - Critical Issues That Will Catch Us Out

**Analysis Date:** December 4, 2025
**Analyst:** Claude (SimPilot Document Review)

---

## 🚨 CRITICAL - Will Break Immediately

### 1. ~~**DES vs CSG Duplicate/Conflict Data**~~ ✅ RESOLVED

**Original Problem:**
- Both DES and CSG have simulation status for **THE SAME AREAS** (FRONT, REAR, UNDERBODY)
- Appeared to create duplicate/conflicting data

**RESOLUTION (Dec 4, 2025):**
- ✅ **ZERO CONFLICTS DETECTED** - DES and CSG work on completely different assembly lines
- Ownership is split by **assembly line designation** (e.g., BN_B05 vs CM_B05)
- No stations are tracked by both suppliers

**Actual Ownership:**
- **FRONT UNIT:** 100% CSG (assembly lines: AA, AD, AF, AK, AL, DD)
- **REAR UNIT:** 51% DES (BN, CL) | 49% CSG (CA, CM, CN)
- **UNDERBODY:** 69% DES (BA, BC, BP, BQ, BS) | 31% CSG (BR)

**Actions Required:**
- Add a `simulationSupplier: 'DES' | 'CSG'` field to domain model ✅
- Add `assemblyLine` field to track line ownership ✅
- Tag all ingested data with supplier source ✅
- Show supplier breakdown in UI (not conflict, but work distribution) ✅

**See:** [STATION_OWNERSHIP_MAP.md](STATION_OWNERSHIP_MAP.md) for full analysis

---

### 2. ~~**Robot Count Mismatch: 166 Robots vs 3,200+ Rows**~~ ✅ RESOLVED

**Original Problem:**
- Robot Equipment List says **166 robots total**
- Simulation Status sheets appeared to have **3,200+ rows each**
- Seemed like ~20 rows per robot (3,200 ÷ 166 ≈ 19.3)

**RESOLUTION (Dec 4, 2025):**
- ✅ **99% of those 3,200 rows are EMPTY!** Excel template padding
- **Actual data rows in Simulation Status files:**
  - REAR UNIT (DES): 26 rows
  - UNDERBODY (DES): 44 rows
  - FRONT UNIT (CSG): 60 rows
  - REAR UNIT (CSG): 25 rows
  - UNDERBODY (CSG): 21 rows
- **Total: 176 station-robot combinations** (matches ~170 robots in Robot List)

**Actions Required:**
- Filter out empty rows during ingestion ✅
- Use fill rate threshold (>5% filled = real data) ✅

---

### 3. **Tool Number Naming Convention Chaos**

**Problem:**
- **Tool List** uses IDs like: `8X-070R-8E1_GEO END EFFECTOR_C`
- **Assemblies List** uses IDs like: `BN010 GJR 10`
- **Simulation Status** uses codes like: `HW`, `W`, `H+W`, `HWW`
- **No clear mapping** between these three systems

**Impact:**
- Cannot link a tool from Assemblies List → Simulation Status → Tool List
- **Orphaned data** - design progress can't be matched to simulation progress
- **Duplicate tools** if we treat different IDs as different tools

**Real-World Example:**
- Tool List: "BN010 GJR 10" (from Board Labels sheet)
- Assemblies List: "BN010 GJR 10" (matched! ✅)
- Simulation Status: Station "BN_B05, 010, R01" with application "HW"
  - Is this the same tool? Hard to tell.

**Recommendation:**
- Build a **tool ID normalization** function
- Create a **mapping table** between naming schemes
- Use **station + robot number** as secondary join key
- Flag tools that can't be matched across systems

---

### 4. **Assembly Design Progress vs Simulation Timeline Conflict**

**Problem:**
- Assemblies List shows **60-70% "Not Started"** for FRONT/BOTTOM TRAY
- But Simulation Status shows **25-48% complete** for same areas
- **Design should come before simulation** logically

**Possible Explanations:**
1. Simulation is using **preliminary/rough designs** (risky!)
2. Assemblies List is **out of date** (last updated dates differ)
3. Only **some tools** need detailed design before simulation
4. Different **tool types** have different workflows

**Impact:**
- If simulation proceeds without design:
  - **Rework risk** when design changes
  - **Wasted simulation effort**
  - **Schedule slippage** not visible in current tracking

**Recommendation:**
- Add a **design-simulation dependency check**
- Flag robots being simulated with <50% design completion
- Show **design lag** as a risk metric on dashboard

---

### 5. **Zero Progress on Safety and Layout (0% Complete)**

**Problem:**
- **ALL simulation status documents** show:
  - Safety: **0% complete**
  - Layout: **0% complete** (except DES UNDERBODY at 41%)
- These are **critical for commissioning**

**Impact:**
- Project appears more complete than it actually is
- **Safety approvals** could gate the entire launch
- **Layout conflicts** discovered late → expensive rework

**Questions:**
1. Are Safety/Layout different teams with separate tracking?
2. Is 0% accurate, or just not being updated in the Excel files?
3. What's the **critical path** dependency on these items?

**Recommendation:**
- **Escalate** 0% safety immediately to project leadership
- Add a **commissioning readiness** metric that weights safety heavily
- Create separate dashboard for **non-simulation deliverables**

---

## ⚠️ HIGH RISK - Will Cause Data Quality Issues

### 6. **Percentage Values Stored as Decimals vs Whole Numbers**

**Problem:**
- Some sheets use: `0.67` for 67%
- Others use: `67` for 67%
- Excel sometimes displays `67` but stores `0.67`

**Impact:**
- Charts will show **0.67% instead of 67%**
- Metrics calculations will be wrong by 100x
- **User confusion** when percentages don't make sense

**Current Codebase:**
- `src/ingestion/dataQualityScoring.ts` has percentage handling
- Unclear if normalization happens consistently

**Recommendation:**
- Add **percentage normalization** in Excel ingestion:
  ```typescript
  function normalizePercentage(value: number): number {
    if (value > 1) return value / 100  // Already a whole number
    return value                        // Already decimal
  }
  ```

---

### 7. **Date Formats: Excel Serial Dates vs Strings**

**Problem:**
- Dates stored as: `45989` (Excel serial date)
- Also stored as: `2025/11/26` (string)
- Also stored as: `25.11.2025sam` (weird format with "sam")

**Impact:**
- Date parsing failures → `Invalid Date`
- Timeline calculations broken
- **Due date alerts** won't fire

**Current Codebase:**
- `excelUtils.ts` has cell normalization
- May not handle all date formats

**Recommendation:**
- Use a robust date parser (date-fns or moment)
- Try multiple formats in order:
  1. Excel serial number (e.g., 45989)
  2. ISO 8601 (yyyy-MM-dd)
  3. European format (dd.MM.yyyy)
  4. US format (MM/dd/yyyy)
- Log unparseable dates as warnings

---

### 8. **Empty/Template Sheets in Production Files**

**Problem:**
- Many files have sheets named:
  - "Sheet1" (empty)
  - "Q_List" (template, not real data)
  - "Legend", "MACRO", "CheckingLog" (metadata)
- Current sniffer has skip patterns, but might not catch all

**Impact:**
- Ingestion errors if we try to parse templates
- **Performance** - wasting time on empty sheets
- **Confusing warnings** about "failed to parse Q_List"

**Current Codebase:**
- `sheetSniffer.ts` has `SKIP_PATTERNS` and `METADATA_PATTERNS`
- Should catch most, but may need tuning

**Recommendation:**
- Expand skip patterns to include:
  - "Template", "Example", "Sample"
  - Sheets with <10 rows of data
  - Sheets with >80% empty cells
- Add **sheet quality pre-filter** before parsing

---

### 9. **Inconsistent Station Number Formats**

**Problem:**
- Station numbers appear as:
  - `010` (zero-padded)
  - `10` (not padded)
  - `FU 1` (with prefix)
  - `BC_B04, 007` (assembly line + station)

**Impact:**
- Station "010" and "10" treated as **different stations**
- **Join failures** when linking data across files
- **Duplicate station** entries in the database

**Recommendation:**
- Normalize station IDs during ingestion:
  ```typescript
  function normalizeStationId(raw: string): string {
    // Extract numeric part
    const match = raw.match(/\d+/)
    if (!match) return raw
    // Pad to 3 digits
    return match[0].padStart(3, '0')
  }
  ```

---

### 10. **Application Code Ambiguity (H, W, HW, H+W, HWW)**

**Problem:**
- Same concept represented multiple ways:
  - `HW` vs `H+W` (are these the same?)
  - `HWW` vs `H+W+W` (handling + 2 weld guns?)
  - `H` vs `HD` (handling vs handling with dresser?)

**Impact:**
- Application type grouping is inconsistent
- **Reporting errors** - can't get accurate counts
- **Robot capability** not properly categorized

**Recommendation:**
- Create an **application code normalization** table:
  ```typescript
  const APP_CODE_MAPPINGS = {
    'H+W': 'HW',
    'W+H': 'HW',
    'H + W': 'HW',
    // etc.
  }
  ```

---

## ⚠️ MEDIUM RISK - Will Cause UX/Business Issues

### 11. **Employee Assignment Gaps**

**Problem:**
- Tool List has 488 employees
- But many tools show `null` or empty for "Sim. Employee"
- Some show employee codes like `AA009` instead of names

**Impact:**
- **Workload balancing** reports will be wrong
- Can't identify **overloaded engineers**
- Can't send **notifications** to responsible parties

**Recommendation:**
- Add **employee ID → name lookup** from EmployeeList sheet
- Flag **unassigned tools** as a data quality issue
- Show "Unassigned" count prominently on dashboard

---

### 12. **Supplier Data Not Linked to Tools**

**Problem:**
- Tool List has 876 suppliers
- But unclear which tools are assigned to which suppliers
- SupplierList sheet is just ID + Name

**Impact:**
- Can't track **external supplier progress**
- Can't identify **supplier bottlenecks**
- Can't filter by "all CSG tools" or "all DEZMECH tools"

**Recommendation:**
- Find the **tool → supplier mapping** column
  - Might be in "Sourcing" or "Supplier" field
- Create a `Supplier` entity in domain model
- Add `supplierId` to `Tool` entity

---

### 13. **Change Tracking Data Ignored**

**Problem:**
- Robot List has "Change Index" sheet with 37 changes
- Tool List has "Change Index" with 126 changes
- **We're not ingesting this data**

**Impact:**
- Can't show **revision history**
- Can't identify **recently changed items** (risky!)
- Can't audit **who changed what**

**Recommendation:**
- Add a `ChangeLog` entity
- Parse Change Index sheets
- Show "Last Modified" date on tool/robot cards
- **Flag items changed in last 7 days** as "volatile"

---

### 14. **Multi-Language Data (English + German + ?)**

**Problem:**
- Some fields have mixed languages:
  - "aktualisiert am: 25.11.2025sam" (German)
  - English column headers
  - Possibly Spanish ("proyect" typo or Spanish?)

**Impact:**
- **Search won't work** if user searches English but data is German
- **Sorting** might be weird with mixed character sets
- **Date parsing** fails on German month names

**Recommendation:**
- Add **language detection** to string fields
- Normalize to English for internal storage
- Support **multi-language display** in UI if needed

---

### 15. **Reuse Equipment Allocation Conflicts**

**Problem:**
- Multiple "Reuse List" files (Risers, Tip Dressers, Weld Guns, Robots)
- These track **old equipment being reused** on new lines
- Possible conflicts:
  - Same equipment allocated to **multiple new stations**
  - Equipment marked "AVAILABLE" but actually in use

**Impact:**
- **Double-booking** of reuse equipment
- **Schedule conflicts** when equipment doesn't arrive
- **Cost estimates wrong** if we assume reuse but can't get equipment

**Recommendation:**
- Add **reuse allocation validation**
- Flag equipment allocated to >1 station
- Cross-check with "IN_USE" status

---

## 📊 DATA QUALITY - Will Cause Confusion

### 16. **Progress Metrics Don't Sum to 100%**

**Problem:**
- Simulation Status "DATA" sheet shows:
  - Completion: 67%
  - Outstanding: 33%
  - ✅ Sums to 100% (good!)
- But some individual metrics are off:
  - Might have rounding errors or missing categories

**Impact:**
- Users confused when progress bars don't match totals
- **Trust issues** with the application

**Recommendation:**
- Validate that Completion + Outstanding = 100% during ingestion
- Log warnings for anomalies
- **Recalculate** metrics from raw data instead of trusting Excel

---

### 17. **Inconsistent "Not Applicable" Values**

**Problem:**
- Missing data represented as:
  - Empty cell
  - `null`
  - `-` (hyphen)
  - `N/A`
  - `TBC` (to be confirmed)
  - `0` (sometimes means "not started", sometimes "zero")

**Impact:**
- **Analytics broken** - can't distinguish "zero" from "unknown"
- **Averages skewed** if we include zeros that should be nulls

**Recommendation:**
- Normalize all "not applicable" values to `null`
- Treat these as equivalent:
  - Empty, `-`, `N/A`, `TBC`, `TBD`, `???`
- **Don't treat `0` as N/A** - it might be a real zero

---

### 18. **File Versioning and Freshness**

**Problem:**
- File names include dates/versions:
  - `Rev05_20251126` (November 26, 2025)
  - But Tool List doesn't show when it was last updated
- **How do we know which file is current?**

**Impact:**
- User uploads an **old version** → data goes backwards in time
- **Conflicting data** from different file versions
- Can't show "last updated" timestamp reliably

**Recommendation:**
- Parse version/date from filename
- Show **file version** in UI: "Data from Robot List Rev05 (Nov 26, 2025)"
- Warn user if uploading older version than currently loaded
- Store `fileVersion` and `uploadedAt` metadata

---

### 19. **Hidden Rows/Columns in Excel**

**Problem:**
- Excel files might have **hidden rows** or **hidden columns**
- These might contain:
  - Formulas or calculations
  - Draft data not meant for production
  - Deleted/archived records

**Impact:**
- If we skip hidden rows → might miss important data
- If we include hidden rows → might get junk data

**Current Codebase:**
- `xlsx` library includes hidden rows by default
- Unclear if we're filtering them

**Recommendation:**
- Check if row/column is hidden using Excel metadata
- **Skip hidden rows** by default (they're usually drafts)
- Add a **debug mode** to show hidden data if needed

---

### 20. **Merged Cells in Headers**

**Problem:**
- Excel files use **merged cells** for visual formatting
- Example: "ROBOT SIMULATION" merged across 10 columns
- This creates ambiguous header rows

**Impact:**
- Header detection picks up the **merged cell label** instead of actual column names
- **Wrong column mapping** → data goes to wrong fields

**Current Codebase:**
- `findBestHeaderRow()` looks for strong keywords
- Might pick the merged cell row as "header"

**Recommendation:**
- Detect merged cells using Excel metadata
- **Unmerge** cells before processing:
  - Repeat merged cell value across all cells in range
- Or: Skip rows that are >50% merged cells

---

## 🔍 TESTING - Will Be Hard to Catch

### 21. **Edge Cases in Column Matching**

**Problem:**
- Field matcher uses scoring algorithm (15+ points to match)
- Edge cases:
  - Two fields both score 15 points → **ambiguous match**
  - No fields score >15 → **no match** (column ignored)
  - Typos in headers → might not match

**Impact:**
- **Silent data loss** - columns don't match, data not imported
- **Wrong mappings** - "Robot ID" matched to "Robot Type"

**Recommendation:**
- Add **match confidence levels**:
  - High (50+ points): ✅ Confident
  - Medium (30-49): ⚠️ Review
  - Low (15-29): 🚨 Uncertain
- Show **unmatched columns** to user for manual mapping
- Log **ambiguous matches** for review

---

### 22. **Unicode and Special Characters**

**Problem:**
- Tool names might include:
  - Accented characters: `é`, `ñ`, `ü`
  - Special symbols: `°`, `ø`, `±`
  - Trademark symbols: `®`, `™`
- Excel encoding issues (UTF-8 vs Windows-1252)

**Impact:**
- **Search broken** if characters don't match
- **Display issues** - weird symbols like `Ã©` instead of `é`
- **Database issues** if using wrong encoding

**Recommendation:**
- Ensure **UTF-8 encoding** throughout the pipeline
- Normalize Unicode (NFC form)
- Test with **real data** that has accents

---

### 23. **Formula Cells vs Raw Values**

**Problem:**
- Excel cells might contain **formulas** like `=SUM(A1:A10)`
- `xlsx` library can return:
  - The formula itself
  - The calculated value
  - An error (if formula is invalid)

**Impact:**
- If we get the formula → parser breaks trying to parse "=SUM(...)"
- If we get the value → we don't know it's calculated (might change)

**Current Codebase:**
- Need to check if we're reading **formula values** or **raw values**

**Recommendation:**
- Always read **calculated values** (what Excel displays)
- Log a warning if >10% of cells are formulas
- Consider flagging calculated fields in UI

---

### 24. **Large File Performance**

**Problem:**
- Simulation Status files are **3,200+ rows × 69 columns**
- Robot List is **205 rows × 90 columns**
- Assemblies Lists up to **1,016 rows**

**Impact:**
- **Browser memory** issues if loading all at once
- **UI freezes** during parsing (blocking main thread)
- **Slow initial load** time

**Current Codebase:**
- Ingestion runs in main thread (blocking)
- No streaming or chunking

**Recommendation:**
- Move parsing to **Web Worker** (non-blocking)
- Add **progress indicator** during ingestion
- Consider **lazy loading** - only parse visible sheets
- Set **row limits** for initial import (e.g., first 1000 rows for testing)

---

### 25. **Data Freshness and Staleness**

**Problem:**
- User uploads files on Monday
- Files get updated on server on Tuesday
- **User's local data is now stale**

**Impact:**
- User makes decisions based on **outdated data**
- **Conflicts** when trying to sync back to server
- No way to know data is stale

**Recommendation:**
- Track `lastSyncedAt` timestamp
- Show **staleness warning** if >24 hours old
- Add a **refresh** button to re-download from MS365
- Consider **auto-refresh** every N minutes

---

## 🎯 SUMMARY - Top 5 "Will Catch Us Out" Issues

| Rank | Issue | Risk | Difficulty to Fix |
|------|-------|------|-------------------|
| 1 | **DES vs CSG duplicate data** | 🔴 CRITICAL | 🔴 Hard - need business rules |
| 2 | **166 robots vs 3,200 rows mismatch** | 🔴 CRITICAL | 🟡 Medium - need data model change |
| 3 | **0% Safety/Layout progress** | 🔴 CRITICAL | 🟢 Easy - but needs escalation |
| 4 | **Tool ID naming chaos** | 🟠 HIGH | 🔴 Hard - need normalization rules |
| 5 | **Design vs Simulation timeline conflict** | 🟠 HIGH | 🟡 Medium - need dependency tracking |

---

## Recommended Next Steps

1. **Immediate (This Week):**
   - Clarify DES vs CSG data ownership model
   - Investigate the 166 vs 3,200 row count mystery
   - Escalate 0% Safety completion

2. **Short Term (Next Sprint):**
   - Build tool ID normalization
   - Add design-simulation dependency checks
   - Implement percentage/date normalization

3. **Medium Term (Next Month):**
   - Add reuse equipment allocation validation
   - Build multi-language support
   - Move parsing to Web Worker for performance

4. **Ongoing:**
   - Log all unmatched columns for manual review
   - Track data quality metrics per file
   - Build automated tests for edge cases
