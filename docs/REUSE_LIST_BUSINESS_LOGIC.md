# Reuse List Business Logic Analysis

## Executive Summary

The "Reuse Lists" are **equipment inventory/pool management** documents that track:
1. **What equipment is AVAILABLE for reuse** from previous projects
2. **Where that equipment came from** (old project/line/station)
3. **Where it's being allocated to** (new project/line/station)

**Critical Distinction**: These are NOT lists of "already reused equipment" - they are **allocation plans** for retrofit jobs.

---

## Business Context: Automotive Line Retrofitting Process

### The Line Builder Process

As an **Automotive Line Builder** performing retrofit jobs:

1. **Job Intake**: New project comes in (e.g., STLA-S Underbody)
2. **Equipment Assessment**: Determine what equipment is needed:
   - Robots
   - Weld guns
   - Risers
   - Tip dressers
   - Grippers
   - Fixtures

3. **Sourcing Decision** (for each asset):
   ```
   ┌─────────────────────────────────────┐
   │   Can we REUSE from previous job?  │
   │                                     │
   │   ✓ Check global reuse pool        │
   │   ✓ Check compatibility             │
   │   ✓ Check availability              │
   │   ✓ Check condition                 │
   └─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
       YES                     NO
        │                       │
        ▼                       ▼
   Mark as REUSE          Mark as NEW_BUY
   (Free Issue)           or MAKE
        │                       │
        ▼                       │
   Allocate from          Order/Fabricate
   reuse pool                  │
        │                       │
        └───────────┬───────────┘
                    ▼
            Install on new line
   ```

4. **Equipment Allocation**:
   - **REUSE (Free Issue)**: Equipment from reuse pool, no new purchase
   - **NEW_BUY**: Equipment ordered from supplier
   - **MAKE**: Equipment fabricated in-house

---

## Reuse List Structure Analysis

### 1. GLOBAL_ZA_REUSE_LIST_RISERS.xlsx

**Purpose**: Tracks robot risers available for reuse across all ZA (South Africa) projects.

**Key Columns**:
| Column | Purpose | Business Meaning |
|--------|---------|------------------|
| `Proyect` | Source project | Where this riser came from (e.g., P1MX) |
| `Area` | Source area | Original area (e.g., Framing) |
| `Location` | Original location | Old line + station (e.g., Linie 3_LD_010_R01) |
| `Brand` | Part number | Riser part number (e.g., Ka000292S) |
| `Height` | Riser type | Physical description (e.g., Baseplate) |
| `Standard` | Standard type | OV, Standard, etc. |
| `Type` | Classification | Additional classification |
| `Project STLA/P1H/O1H/LPM` | **NEW PROJECT** | **Where it's being allocated to** |
| `New Line` | **NEW LINE** | **Target line for reuse** |
| `New station` | **NEW STATION** | **Target station for reuse** |
| `Coments` | Notes | Additional info |

**Business Logic**:
- If `Project STLA/P1H/O1H/LPM` is **empty** → Available for allocation
- If `Project STLA/P1H/O1H/LPM` is **filled** → Allocated/planned for reuse
- If `New Line` and `New station` are **filled** → Specific allocation confirmed

**Example Row Interpretation**:
```
Proyect: P1MX
Area: Framing
Location: Linie 3_LD_010_R01
Brand: Ka000292S
Height: Baseplate
Project STLA: <empty>
New Line: <empty>
New station: <empty>
```
→ **Available riser** from P1MX Framing that CAN be reused but is NOT YET allocated.

---

### 2. GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx

**Purpose**: Tracks tip dressers available for reuse.

**Key Columns**:
| Column | Purpose | Business Meaning |
|--------|---------|------------------|
| `ROBOT` | Source robot | Original robot using this tip dresser |
| `WELDING GUNS` | Associated guns | Which guns use this dresser |
| `TIP DRESSER` | Dresser ID | Equipment identifier |
| `Project STLA/P1H/O1H/LPM` | **NEW PROJECT** | **Where it's being allocated to** |
| `New Sector` | **NEW SECTOR** | **Target sector** |
| `New Line` | **NEW LINE** | **Target line** |
| `New station` | **NEW STATION** | **Target station** |
| `Robot Standard (Confirm)` | Confirmation | Robot compatibility confirmed |

**Business Logic**: Same as risers - tracks OLD location → NEW allocation.

---

### 3. GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx (Weld Guns)

**Purpose**: Tracks TMS weld guns available for reuse.

**Sheet: "Welding guns"** (main data)

**Key Columns**:
| Column | Purpose | Business Meaning |
|--------|---------|------------------|
| `Plant` | Source plant | Where gun came from |
| `Area` | Source area | Original area |
| `Zone/Subzone` | Source zone | Original zone |
| `Station` | Source station | Original station |
| `Device Name` | Gun ID | Equipment identifier |
| `Application robot` | Robot using gun | Which robot had this gun |
| `Model` | Gun model | Physical model |
| `Serial Number Complete WG` | Serial | Unique identifier |
| `Standard` | Gun standard | Type classification |
| `STLA/P1H/O1H/LPM` | **NEW PROJECT** | **Where it's being allocated to** |
| `Sector` | **NEW SECTOR** | **Target sector** |
| `Line` | **NEW LINE** | **Target line** |
| `Station3` | **NEW STATION** | **Target station** |
| `Coment` | Notes | Additional info |

**Business Logic**:
- Tracks OLD (Plant/Area/Zone/Station) → NEW (STLA/Sector/Line/Station3) allocation
- If NEW columns empty → available
- If NEW columns filled → allocated/planned

---

### 4. FEB Underbody TMS REUSE_LIST_ROBOTS_DES - R01.xlsx

**Purpose**: Specific reuse list for February Underbody TMS robots (DES = DesignOS).

**Expected Structure**: Similar to other reuse lists but focused on robots specifically for this project phase.

---

## Sourcing Classification Rules (CORRECTED)

### Current Implementation (from Phase 0)
```typescript
export function inferSourcing(input: {
  isOnReuseList: boolean
  cellText?: string | null
  rawTags: string[]
  lifecycleHint?: string | null
}): EquipmentSourcing
```

### ❌ **Problem with Current Logic**

Our current logic says:
> "If asset appears in reuse list → `REUSE`"

**This is INCORRECT** because:
- **ALL equipment in reuse lists is REUSE** (that's the point of the list)
- But the business question is: **"Has it been ALLOCATED yet?"**

### ✅ **Corrected Business Logic**

**Three States for Reuse List Equipment**:

1. **`REUSE` + `AVAILABLE`**
   - Equipment is in reuse pool
   - NOT YET allocated to new project
   - Columns: `Project STLA` / `New Line` / `New station` are **EMPTY**
   - **UI Treatment**: Show as "Available for Reuse" (green)

2. **`REUSE` + `ALLOCATED`**
   - Equipment is in reuse pool
   - HAS BEEN allocated to new project
   - Columns: `Project STLA` / `New Line` / `New station` are **FILLED**
   - **UI Treatment**: Show as "Allocated Reuse" (blue) with target location

3. **`REUSE` + `IN_USE` (on new line)**
   - Equipment from reuse pool
   - Now installed and operational on new line
   - Appears in **Simulation Status** for new line
   - **UI Treatment**: Show as "Reused (Active)" (solid green)

### ✅ **Corrected Type System**

```typescript
// NEW: Allocation status for reuse equipment
export type ReuseAllocationStatus =
  | 'AVAILABLE'      // In pool, not allocated
  | 'ALLOCATED'      // Planned for specific new line
  | 'IN_USE'         // Installed on new line
  | 'RESERVED'       // Reserved but not allocated
  | 'UNKNOWN'

// EXTENDED: Asset sourcing includes allocation
export interface ExcelIngestedAsset extends UnifiedAsset {
  // ... existing fields ...

  // NEW: Reuse allocation tracking
  reuseAllocationStatus?: ReuseAllocationStatus

  // OLD location (from reuse list)
  oldProject?: string | null
  oldLine?: string | null
  oldStation?: string | null
  oldArea?: string | null

  // NEW/TARGET location (from reuse list)
  targetProject?: string | null   // "Project STLA/P1H/O1H/LPM"
  targetLine?: string | null       // "New Line"
  targetStation?: string | null    // "New station"
  targetSector?: string | null     // "New Sector"
}
```

### ✅ **Corrected Inference Logic**

```typescript
export function inferReuseAllocation(input: {
  targetProject?: string | null
  targetLine?: string | null
  targetStation?: string | null
  isInSimulationStatus: boolean
}): ReuseAllocationStatus {
  // Already installed and operational
  if (input.isInSimulationStatus) {
    return 'IN_USE'
  }

  // Has target allocation
  if (input.targetProject || input.targetLine || input.targetStation) {
    const hasAnyTarget = [
      input.targetProject,
      input.targetLine,
      input.targetStation
    ].some(val => val !== null && val !== undefined && val.trim().length > 0)

    if (hasAnyTarget) {
      return 'ALLOCATED'
    }
  }

  // In pool, available
  return 'AVAILABLE'
}
```

---

## Cross-Workbook Linking Strategy (CORRECTED)

### Scenario 1: Riser Allocation Process

**Step 1**: Riser appears in `GLOBAL_ZA_REUSE_LIST_RISERS.xlsx`:
```
Proyect: P1MX
Location: Linie 3_LD_010_R01
Brand: Ka000292S
Project STLA: <empty>
New Line: <empty>
New station: <empty>
```
→ **Status**: `REUSE` + `AVAILABLE`

**Step 2**: Planner allocates it to STLA-S project:
```
Proyect: P1MX
Location: Linie 3_LD_010_R01
Brand: Ka000292S
Project STLA: STLA-S
New Line: BN_B05
New station: 010
```
→ **Status**: `REUSE` + `ALLOCATED`

**Step 3**: Riser installed, appears in `STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`:
```
AREA: Underbody
ASSEMBLY LINE: BN_B05
STATION: 010
ROBOT: R01
APPLICATION: SW
```
→ **Status**: `REUSE` + `IN_USE`

### Linking Logic

```typescript
// Match reuse list asset to simulation status
function linkReuseToSimulation(
  reuseAsset: ExcelIngestedAsset,
  simAssets: ExcelIngestedAsset[]
): ExcelIngestedAsset | null {

  // Only link if reuse asset has target allocation
  if (!reuseAsset.targetLine || !reuseAsset.targetStation) {
    return null
  }

  // Find matching simulation status asset
  for (const simAsset of simAssets) {
    const lineMatch = normalize(simAsset.assemblyLine) === normalize(reuseAsset.targetLine)
    const stationMatch = normalize(simAsset.station) === normalize(reuseAsset.targetStation)

    if (lineMatch && stationMatch) {
      // MATCH! This reuse asset is now IN_USE
      return simAsset
    }
  }

  return null
}
```

---

## Retrofit Job Workflow (Complete Picture)

### Phase 1: Planning (Project Kickoff)
```
Simulation Manager receives new project: STLA-S Underbody

Tasks:
1. Review equipment requirements from engineering
2. Search REUSE LISTS for compatible equipment
3. Mark equipment as ALLOCATED in reuse lists
   - Fill "Project STLA" column
   - Fill "New Line" / "New station" columns
4. Identify gaps → Mark as NEW_BUY or MAKE
```

### Phase 2: Simulation (Pre-Production)
```
Simulation Engineer works in Process Simulate

Tasks:
1. Create simulation using ALLOCATED reuse equipment
2. Verify compatibility, reach, cycle time
3. Update SIMULATION STATUS sheets:
   - Mark equipment as assigned to stations
   - Track simulation completion %
4. If reuse doesn't work → Switch to NEW_BUY
```

### Phase 3: Installation (Production)
```
Site team installs equipment on physical line

Tasks:
1. Pull equipment from reuse pool (or receive new)
2. Install at target station
3. Commission and test
4. Update SIMULATION STATUS to 100% complete
```

---

## UI Implications

### Equipment Status Badge Colors

```typescript
// For assets from REUSE LISTS
if (asset.sourcing === 'REUSE') {
  switch (asset.reuseAllocationStatus) {
    case 'AVAILABLE':
      return { color: 'green', text: 'Available for Reuse', icon: '♻️' }
    case 'ALLOCATED':
      return { color: 'blue', text: `Allocated to ${asset.targetLine}`, icon: '📌' }
    case 'IN_USE':
      return { color: 'green', text: `Reused (Active)`, icon: '✅' }
    case 'RESERVED':
      return { color: 'yellow', text: 'Reserved', icon: '🔒' }
  }
}

// For assets from SIMULATION STATUS (not in reuse list)
if (asset.sourcing === 'NEW_BUY') {
  return { color: 'purple', text: 'New Equipment', icon: '🆕' }
}

if (asset.sourcing === 'UNKNOWN') {
  return { color: 'gray', text: 'To Be Confirmed', icon: '❓' }
}
```

### Reuse Pool Dashboard View

```
╔═══════════════════════════════════════════════════════════╗
║          REUSE EQUIPMENT POOL - UNDERBODY                 ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📊 Summary:                                              ║
║    • 234 Risers Available                                 ║
║    • 156 Tip Dressers Available                          ║
║    • 89 Weld Guns Available                              ║
║    • 45 Risers Allocated to STLA-S                       ║
║    • 23 Tip Dressers Allocated to STLA-S                 ║
║                                                           ║
║  🔍 Filter:                                               ║
║    [Available] [Allocated] [All]                         ║
║    [STLA-S] [P1MX] [All Projects]                        ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  Equipment | Source | Target | Status                    ║
╠═══════════════════════════════════════════════════════════╣
║  Ka000292S | P1MX   | ---    | ♻️ Available              ║
║  Ka000293S | P1MX   | STLA-S | 📌 Allocated BN_B05:010  ║
║  TMS-WG-45 | P1H    | STLA-S | ✅ In Use BN_B05:020     ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Action Items for Implementation

### ✅ Phase 0 (Complete)
- Type system aligned
- Workbook registry
- Sheet sniffer

### ✅ Phase 1 (Complete)
- Excel discovery script

### 🔄 Phase 2 (IN PROGRESS - NEEDS CORRECTION)

**Must update**:
1. `ExcelIngestedAsset` interface:
   - Add `reuseAllocationStatus`
   - Add `oldProject`, `oldLine`, `oldStation`
   - Add `targetProject`, `targetLine`, `targetStation`

2. Reuse list parsers:
   - Parse OLD location columns
   - Parse NEW/TARGET allocation columns
   - Infer allocation status

3. Sourcing logic:
   - Change from simple `isOnReuseList → REUSE`
   - To `isOnReuseList → REUSE + calculate allocation status`

4. Cross-workbook linking:
   - Match reuse list targets to simulation status actuals
   - Detect when ALLOCATED equipment becomes IN_USE

### 📋 Phase 3 (Pending)
- UI components showing allocation status
- Reuse pool dashboard
- Allocation workflow tools

---

## Key Takeaways

1. **Reuse lists are INVENTORY**, not history
2. **"Reuse" has 3 sub-states**: Available, Allocated, In Use
3. **OLD columns** = where equipment came from
4. **NEW columns** = where it's going (or blank if available)
5. **Linking** = matching reuse list targets to simulation status actuals

**The entire retrofit process is about MOVING equipment from OLD projects to NEW projects.**

---

## Questions for Simulation Manager (Dale)

Before proceeding with parser implementation:

1. ✅ **Confirmed**: Reuse lists track available equipment + allocations?
2. ❓ **Question**: If `Project STLA` is filled but equipment NOT in Simulation Status yet, is that "Allocated" or different status?
3. ❓ **Question**: Do you want UI to show "Available Pool" separately from "Allocated" reuse?
4. ❓ **Question**: Should we track who allocated equipment (user/date)?
5. ❓ **Question**: Is there a "Reserved" status (equipment held for potential use)?

---

**Document Version**: 1.0
**Date**: December 2, 2025
**Author**: Claude Code (with business logic from Simulation Manager)
