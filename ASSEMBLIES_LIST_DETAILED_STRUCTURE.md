# Assemblies List - Detailed Structure Analysis
## Real-World Format from BMW J10735 A_List

**Date:** 2026-01-12
**Source:** Screenshots from actual BMW Assemblies List file
**Purpose:** Document the TRUE structure of Assemblies Lists (not assumptions)

---

## Critical Understanding

### What is the "A List"?
> "A list has the overall name and unit numbers of sub items we design."

**Purpose:**
1. **Assembly breakdown** - Main assemblies split into sub-components/units
2. **Design tracking** - Track design progress for each unit
3. **Simulation approval** - Used to approve simulation work
4. **Quality gates** - Multiple checkpoints beyond basic design stages
5. **Multi-purpose tracking** - "Other things have been added" (user doesn't know all purposes)

---

## Header Structure (Multi-Row Headers)

### Row 1: Category Headers
```
┌─────────────┬──────────────────────────────────┬─────────┬─────────────────────┬────────────────────────────┐
│ Quality     │                                  │ W/J MNF │ Drawings Issued     │ Engineering Quality Gate   │
│ Gate        │ Water Jet/Laser cut/Flamecut    │         │ to MNF              │                            │
└─────────────┴──────────────────────────────────┴─────────┴─────────────────────┴────────────────────────────┘
```

**Quality Gate Legend (top-left):**
- 🟡 0-30%: 1st stage concept
- 🟡 31-60%: 2nd staging
- 🟡 61-90%: Detailing
- 🟢 >95%: Checking/BMod (Base Model)
- Note: "If 55% - out for 3D model approval"

### Row 2: Specific Column Headers
```
Designer | Planned | Planned | Actual  | Actual | W/J On | W/J    | Planned | Planned | Actual   | Actual | Design  | Pin          | 3D Check | Gripper  | Comment
         | Deliv   | Week    | Deliv   | Week   | Hold   | Orders | Deliv   | Week    | Delivery | Week   | Status  | Verification |          | Payload  |
```

---

## Column Breakdown

### Section 1: Designer Assignment
**Column:** `Designer`
- **Type:** Dropdown selection
- **Purpose:** Assign designer responsible for this assembly/unit
- **Examples:** "Leenesahan N", "Lanoe G", "Buklebuweza Mcobe"
- **Visual:** Light blue background (dropdown field)

### Section 2: Water Jet/Laser Cut/Flamecut Manufacturing
**Purpose:** Track sheet metal cutting operations

**Columns:**
1. `Planned Delivery` - When cutting should be complete
2. `Planned Week` - Target week number
3. `Actual Delivery` - When cutting actually completed
4. `Actual Week` - Actual week completed

**Visual Indicators:**
- 🔴 Red cells: Behind schedule / not started
- 🟡 Yellow cells: In progress
- ⚪ White/empty: Not applicable or not started

### Section 3: W/J MNF (Water Jet Manufacturing)
**Purpose:** Track holds and orders for cutting operations

**Columns:**
1. `W/J On Hold` - Items waiting (blocked)
2. `W/J Orders` - Active orders placed

### Section 4: Drawings Issued to MNF (Manufacturing)
**Purpose:** Track when drawings released to manufacturing

**Columns:**
1. `Planned Delivery` - When drawings should be issued
2. `Planned Week` - Target week
3. `Actual Delivery` - When drawings actually issued
4. `Actual Week` - Actual week issued

**Visual Indicators:**
- 🔴 Red cells: Drawings not issued yet
- Progress tracked separately from physical manufacturing

### Section 5: Engineering Quality Gate
**Purpose:** Design verification and approval checkpoints

**Columns:**
1. `Design Status` - Overall design completion %
   - Examples: "75%", "20%"
   - 🟡 Yellow background: In progress

2. `Pin Verification` - Connection points verified
   - Critical for robot gripper/tool interfaces

3. `3D Check` - 3D model validation complete
   - Clash detection, clearance checks

4. `Gripper Payload` - Tool weight specification
   - Critical for robot selection (links to Robot Equipment List!)

5. `Comment` - Free text notes

---

## Quality Gate Progression

### Stage Definitions (from legend)
```
Stage 1: 0-30%   → Concept
Stage 2: 31-60%  → 2nd Staging (basic design)
Stage 3: 61-90%  → Detailing (refinement)
Stage 4: >95%    → Checking/BMod (final approval)

Special: 55% → "Out for 3D model approval" (external review gate)
```

### Progression Through Gates
```
1. Designer assigned
   ↓
2. Concept design (0-30%)
   ↓
3. 2nd staging (31-60%)
   │
   ├─→ At 55%: Send for 3D model approval
   │
   ↓
4. Detailing (61-90%)
   ↓
5. Checking/BMod (>95%)
   ↓
6. Drawings issued to manufacturing
   ↓
7. W/J orders placed (if sheet metal needed)
   ↓
8. Pin verification complete
   ↓
9. 3D check passed
   ↓
10. Gripper payload confirmed
   ↓
COMPLETE: Ready for simulation approval
```

---

## Data Examples from Screenshots

### Example 1: Designer "Lanoe G" (Multiple units)
```
Designer: Lanoe G
Design Status: 75% (repeated for ~12 rows)
Visual: Yellow cells in "Actual Delivery" columns
Status: Behind schedule on manufacturing, but design 75% complete
```

**Interpretation:**
- Design work is 75% done
- Manufacturing delivery dates are missed (red cells)
- Waiting on manufacturing to catch up

### Example 2: Designer "Buklebuweza Mcobe"
```
Designer: Buklebuweza Mcobe
Design Status: 20% (repeated for ~7 rows)
Visual: Red cells in manufacturing columns, 20% design complete
Status: Early stage design, manufacturing not yet started
```

**Interpretation:**
- Only 20% through concept phase
- Too early for manufacturing (appropriately red)
- Normal for early project phase

---

## Color Coding System

### Red Cells 🔴
- **Meaning:** Behind schedule, not started, or blocked
- **Action needed:** Expedite or investigate delay
- **Appears in:** Delivery columns, manufacturing tracking

### Yellow Cells 🟡
- **Meaning:** In progress, on track
- **Status:** Normal progression
- **Appears in:** Design status (75%), actual week columns

### White/Empty Cells ⚪
- **Meaning:** Not applicable, future task, or not tracked
- **Status:** Normal if not yet relevant
- **Appears in:** Future planned dates, optional fields

---

## Assembly Hierarchy

### Main Assembly → Sub-Units Structure
Based on "overall name and unit numbers of sub items":

```
Example Structure:
Main Assembly: "Front Structure"
  ├─→ Unit 1: "Front Rail LH"
  ├─→ Unit 2: "Front Rail RH"
  ├─→ Unit 3: "Shock Tower LH"
  ├─→ Unit 4: "Shock Tower RH"
  └─→ Unit 5: "Cross Member"

Each unit gets its own row in the A_List with:
  - Designer assignment
  - Individual progress tracking
  - Manufacturing delivery dates
  - Quality gate checkpoints
```

**Why this matters:**
- Large assemblies broken into manageable design units
- Each designer can own specific units
- Progress tracked at unit level, rolled up to assembly level
- Simulation team waits for all units to reach approval threshold

---

## Integration with Other Files

### Links to Robot Equipment List
**Gripper Payload column:**
- Designer specifies tool weight
- Simulator uses this to select robot model
- Robot Equipment List populated with robot meeting payload requirement

**Workflow:**
```
A_List: Gripper weighs 45kg
   ↓
Simulator: Need robot with >45kg payload (add safety margin → 60kg)
   ↓
Robot Equipment List: Order MXP410X (70kg payload)
```

### Links to Simulation Status
**"Used to approve simulation":**
- Simulation work cannot begin until design reaches threshold (e.g., >55%)
- A_List gates must be green before simulator starts
- Simulation Status tracks programming work AFTER design approved

**Gate Sequence:**
```
A_List: Design 75% → 3D Check passed → Pin verification complete
   ↓
   [DESIGN APPROVED FOR SIMULATION]
   ↓
Simulation Status: Rough programming begins → 20% complete
```

---

## Unknown Columns/Purposes

### User Noted: "A few more that I don't know about"
**Implications:**
- Assemblies List has grown over time
- Columns added for specific customer/project needs
- Not all users understand all tracking columns
- Need for column mapping documentation per customer

**Questions to Investigate:**
1. What is "BMod" in "Checking/BMod"? (Base Model?)
2. Are there standard vs custom columns per project?
3. Who adds the "other things" columns?
4. What triggers the 55% approval gate specifically?
5. How is "Quality Gate NA" (seen in screenshot) used?

---

## Parsing Challenges

### Multi-Row Headers
- **Challenge:** Row 1 is category, Row 2 is actual column names
- **Solution:** Parser needs to detect and merge multi-row headers
- **Current issue:** Likely only reading Row 2, missing category context

### Repeated Column Names
- **Challenge:** Multiple "Planned Week", "Actual Week" columns
- **Solution:** Prefix with section name: "WaterJet: Planned Week", "Drawings: Planned Week"
- **Implementation:** Context-aware column naming in parser

### Percentage Values
- **Challenge:** "75%", "20%" need parsing as numeric
- **Current solution:** `parsePercent()` function handles this ✓
- **Visual coding:** Yellow/red backgrounds don't parse (need actual cell value)

### Missing Data vs NA
- **Challenge:** Empty cells vs "NA" vs "N/A" vs blank
- **Distinction:**
  - Empty = Not started
  - NA = Not applicable
  - Blank = Data not entered yet

---

## Data Quality Patterns

### From Screenshots:
1. **Repeated values** - Same designer, same percentage across multiple rows
   - Indicates: Batch of related units at same stage

2. **Red blocks** - Contiguous red cells in manufacturing columns
   - Indicates: Systematic delay, not isolated issue

3. **No entries** - Empty designer column at top
   - Indicates: Unassigned work or placeholder rows

---

## Recommended Parser Improvements

### 1. Multi-Row Header Detection
```typescript
function detectMultiRowHeaders(rows: CellValue[][]): {
  categoryRow: number,
  columnRow: number,
  mergedHeaders: string[]
} {
  // Look for category row (broader labels)
  // Look for column row (specific labels)
  // Merge: "Water Jet/Laser cut/Flamecut: Planned Delivery"
}
```

### 2. Designer Extraction
```typescript
// Current: Might parse as data row
// Needed: Identify designer column, extract designer names
// Use: Link tools to designers for Engineer dashboard view
```

### 3. Quality Gate Mapping
```typescript
// Map percentage to stage name:
const getQualityStage = (percent: number) => {
  if (percent >= 95) return "Checking/BMod"
  if (percent >= 61) return "Detailing"
  if (percent >= 31) return "2nd Staging"
  if (percent >= 0) return "Concept"
  return "Not Started"
}
```

### 4. Visual Indicator Parsing
```typescript
// Cell formatting (red/yellow/green) doesn't transfer to parsed data
// Need alternative: Parse actual vs planned dates, calculate status
// If (actualWeek > plannedWeek) → Behind schedule (red equivalent)
```

---

## Next Steps

### Questions for User:
1. ✅ What does "BMod" mean in "Checking/BMod"?
2. ⚠️  What is the 55% approval gate specifically? (3D model approval - who approves?)
3. ⚠️  Are there more columns to the right not shown in screenshots?
4. ⚠️  How do designers update this - weekly, daily, on-demand?
5. ⚠️  Who creates the main assembly breakdown initially?

### Implementation Priorities:
1. **High:** Multi-row header detection and merging
2. **High:** Designer column extraction
3. **Medium:** Quality stage calculation from percentage
4. **Medium:** Link gripper payload to robot selection
5. **Low:** Visual formatting interpretation (color coding)

---

## Document Status
**Status:** In Progress - Based on user screenshots
**Last Updated:** 2026-01-12
**Next:** Validate column names and purposes with user
**Missing:** Right-side columns not visible in screenshots
