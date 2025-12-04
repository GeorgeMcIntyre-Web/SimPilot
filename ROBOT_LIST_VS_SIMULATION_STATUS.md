# Robot List vs Simulation Status - Row Count Analysis

**Date:** December 4, 2025

---

## The Mystery Explained

### Robot Equipment List
**File:** `Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`
**Sheet:** `STLA-S`

- **Claimed Total (in file):** 166 robots
- **Actual Data Rows:** ~170 rows (header at row 7, data starts row 8)
- **Total Rows in Excel:** 205 (including headers, empty rows, metadata)

**Structure:**
```
Row 1: STLA P1H / O1H (title)
Row 2: Plant Zaragoza
Row 3: (empty)
Row 4: (metadata row)
Row 5: "166" (claimed total) ← This is where "166" comes from
Row 6: Updated date
Row 7: HEADERS (Index | Position | Assembly line | Station | Robot...)
Row 8-177: ACTUAL ROBOT DATA (~170 rows)
Row 178-205: Empty/padding rows
```

**Sample Data:**
- Row 8: Front Rail LH | 1 | AL_B09 | 010 | R01
- Row 9: Front Rail LH | 2 | AL_B09 | 020 | R01
- Row 10: Front Rail LH | 3 | AL_B09 | 030 | R01

---

## Simulation Status Files
**These are MUCH larger!**

### Row Counts per File:

| File | Total Rows | Sheet Name |
|------|-----------|------------|
| STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx | **3,224** | SIMULATION |
| STLA-S_UNDERBODY_Simulation_Status_DES.xlsx | **3,242** | SIMULATION |
| STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx | **3,258** | SIMULATION |
| STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx | **3,223** | SIMULATION |
| STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx | **3,219** | SIMULATION |

**Average:** ~3,233 rows per Simulation Status sheet

---

## The Math Doesn't Add Up

### If Each Row = One Robot:
- Simulation sheets: 3,200+ rows
- Robot List: 170 rows
- **Problem:** Where did the extra 3,000+ "robots" come from?

### If Each Robot Has Multiple Rows:
- 3,200 rows ÷ 166 robots = **~19 rows per robot**
- **Question:** What are these 19 different things per robot?

---

## Hypothesis: What Could the 3,200 Rows Be?

### Theory 1: Multiple Tasks per Robot
Each robot might have separate rows for:
- Different weld spots (e.g., 50 weld points = 50 rows)
- Different simulation stages (Stage 1, Stage 2, etc.)
- Different validation checks
- **If true:** Need a `RobotTask` entity, not just `Robot`

### Theory 2: Includes All Equipment (Not Just Robots)
Rows might include:
- Robots (166)
- Weld Guns (~500?)
- Grippers (~300?)
- Fixtures (~500?)
- Other tools (~1,500?)
- **If true:** One row = one piece of equipment (any type)

### Theory 3: Duplicated/Versioned Data
- Multiple rows per robot for different scenarios
- Historical versions kept in same sheet
- **If true:** Need to filter to "current" version only

### Theory 4: Empty/Padding Rows
- Excel reports 3,200 rows but many are empty
- Similar to Robot List (205 declared, 170 actual)
- **If true:** Need to filter out empty rows during ingestion

---

## What We Need to Know

### Critical Question:
**What does ONE ROW in a Simulation Status sheet represent?**

Options:
- A) One robot installation
- B) One robot task/operation
- C) One weld spot/joint
- D) One piece of equipment (robot, gun, gripper, fixture, etc.)
- E) One simulation step/stage
- F) Something else?

### Follow-up Questions:
1. If we see "AL_B09 | 010 | R01" repeated 50 times, is that:
   - 50 different operations for the same robot?
   - 50 different weld spots?
   - Duplicate data to be filtered?

2. Should we expect the Simulation Status row count to match Robot List count?
   - If YES: We need to filter/deduplicate
   - If NO: We need a different data model (Robot → Tasks)

---

## Impact on Data Model

### Current Assumption (Might Be Wrong):
```typescript
interface Robot {
  id: string
  name: string
  station: string
  // One robot = one entity
}
```

### If Each Robot Has Many Tasks:
```typescript
interface Robot {
  id: string
  name: string
  station: string
  tasks: RobotTask[]  // ← Need this!
}

interface RobotTask {
  id: string
  robotId: string
  taskType: 'weld' | 'handling' | 'measurement'
  completionPercent: number
  // One row in Simulation Status = one task
}
```

### If Rows Include All Equipment:
```typescript
interface Equipment {
  id: string
  kind: 'Robot' | 'WeldGun' | 'Gripper' | 'Fixture'  // ← More types!
  station: string
  // One row = one piece of equipment
}
```

---

## Recommendation

**Before we ingest Simulation Status files,** we need Dale/Charles to clarify what each row represents.

**Worst case:** We ingest all 3,200 rows as separate "robots" and end up with nonsense data.

**Best case:** We understand the structure and build the right data model from the start.

---

## Visual Comparison

### Robot List (Simple):
```
Row 8:  AL_B09 | 010 | R01 | Robot Type: G3+ R210F | Payload: 210kg
Row 9:  AL_B09 | 020 | R01 | Robot Type: G3+ R165F | Payload: 165kg
Row 10: AL_B09 | 030 | R01 | Robot Type: G3+ R185L | Payload: 185kg
...
(~170 rows total)
```

### Simulation Status (Complex):
```
Row 5:  AL_B09 | 010 | R01 | HW | 80% | 0% | 50% | ... (69 columns!)
Row 6:  AL_B09 | 020 | R01 | HWW | 80% | 0% | 50% | ...
Row 7:  AL_B09 | 030 | R01 | H+W | 80% | 0% | 50% | ...
Row 8:  AL_B09 | 050 | R01 | H+W | 80% | 0% | 50% | ...
...
(3,200+ rows total! ← WHY SO MANY?)
```

---

## Next Step

**Get answer from Dale/Charles, then:**
1. Update domain model to match reality
2. Build correct ingestion logic
3. Test with sample data to verify

**Don't guess** - we could build the entire data model wrong if we misunderstand this!
