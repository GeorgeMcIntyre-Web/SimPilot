# Tool List Creation Workflow
## How Tool Lists are Actually Created (Not Assumptions)

**Date:** 2026-01-12
**Source:** User explanation of real-world process
**Purpose:** Document the actual workflow from quote to production

---

## Critical Understanding: It's All Manual from 2D Layouts

### Tool List Creation Process
> "The tooling list is created by a human looking at a 2D layout with the names on the layout."

**Key Points:**
- ❌ NOT automatically generated from CAD/simulation software
- ✅ Manual extraction from 2D layout drawings
- ✅ Human reads tool names from layout and types into Excel
- ⚠️  Prone to transcription errors (typos, missing tools, duplicates)

---

## Project Lifecycle: Quote → Production

### Phase 1: Quote Stage (Advance Engineering)

**Who:** Advance Engineering team
**Output:** Initial 2D layout for customer quote
**Purpose:** Estimate project scope and cost

```
Customer RFQ (Request for Quote) received
         ↓
Advance Engineering creates preliminary design:
  ├─→ 2D layout drawing showing cell arrangement
  ├─→ Tool placement marked on layout
  ├─→ Tool names labeled on drawing
  └─→ Robot positions indicated
         ↓
Quote created based on preliminary design
         ↓
Quote submitted to customer
```

**Layout Contents at Quote Stage:**
- Cell boundaries (stations)
- Robot locations (approximate)
- Major tool names (grippers, fixtures, weld guns)
- Part flow paths
- Safety zones

**Tool List at Quote Stage:**
- Basic list of required tools
- May be incomplete (known gaps)
- High-level tool descriptions
- Used for cost estimation only

---

### Phase 2: Job Awarded (Design Refinement)

**Who:** Same Advance Engineering team (or handed to project engineering)
**Output:** Refined 2D layout for production
**Purpose:** Finalize design before simulation work begins

```
Customer awards job
         ↓
Engineering reviews quote-stage layout:
  ├─→ "Tweak it and improve it"
  ├─→ Fix oversights from quote stage
  ├─→ Add tools missed in initial estimate
  ├─→ Refine tool specifications
  └─→ Correct errors found during review
         ↓
Updated 2D layout created
         ↓
Tool List manually transcribed from updated layout
         ↓
Tool List becomes master document for project
```

**What Gets Tweaked:**
1. **Add missed tools** - Quote stage often misses small fixtures
2. **Correct tool specs** - Better understanding of requirements
3. **Optimize layout** - Move things for better robot reach
4. **Fix oversights** - Errors caught during detailed review
5. **Update tool names** - Standardize naming conventions

---

## Manual Transcription Process

### Step-by-Step: Layout → Tool List

**Step 1: Open 2D Layout Drawing**
- PDF, CAD file, or printed drawing
- Shows cell layout with tool names labeled

**Step 2: Identify All Tools**
- Human scans layout visually
- Finds every tool name on drawing
- May use highlighter to mark as transcribed

**Step 3: Create Tool List Entry**
For each tool found:
```
Look at layout → Read tool name → Type into Excel

Example from layout:
  Drawing shows: "GUN-7K-100L-WG01" at Station 7K-100L
       ↓
  Excel entry:
    Tool ID: GUN-7K-100L-WG01
    Station: 7K-100L
    Type: Weld Gun
    Description: Spot welding gun for bodyside
```

**Step 4: Add Additional Info**
- Designer assignment (who will design this tool?)
- Due date (when needed for simulation?)
- Make/Buy decision (internal design or external supplier?)
- Priority (critical path item?)

**Step 5: Review for Completeness**
- Compare tool count to layout
- Check for missed tools (easy to overlook small items)
- Verify station assignments match layout

---

## Common Issues with Manual Process

### 1. Transcription Errors
**Problem:** Typos when reading from layout
```
Layout says: "GUN-7K-100L-WG01"
Human reads: "GUN-7K-100L-WG10"  ← transposed digits
```

**Impact:**
- Tool won't match robot assignment
- Designer can't find tool to design
- Simulator can't link tool to status tracking

**Solution Needed:**
- Validation rules in Excel template
- Cross-reference with station names
- Duplicate detection in SimPilot

---

### 2. Missed Tools
**Problem:** Small fixtures easy to overlook on busy layout

**Common Misses:**
- Small locating pins
- Clamps and fixtures
- Cable management brackets
- Safety sensors/switches

**Impact:**
- Tool discovered late in project (delay!)
- Rush design needed
- Simulation already done without tool

**Solution Needed:**
- Tool count check (expected vs actual)
- Review checklist for common tool types
- Multiple person verification

---

### 3. Inconsistent Naming
**Problem:** No standardized naming on layouts

**Examples:**
```
Layout A: "WG-7K-100L-01"
Layout B: "7K-100L-WG01"
Layout C: "Gun_7K100L_1"

All mean the same tool!
```

**Impact:**
- Looks like 3 different tools
- Duplicate design work
- Confusion in tracking

**Solution Needed:**
- Standard naming convention document
- Auto-formatting in Excel template
- Naming validation on import

---

### 4. Quote Stage Oversights
**Problem:** Initial quote design incomplete

**Common Oversights:**
```
Quote Stage:
  - Forgot tool for loading part
  - Didn't account for cable management
  - Missed small fixtures for odd-shaped parts
  - Underestimated gripper complexity

Production Stage:
  - ADD: Part loader fixture
  - ADD: Cable retractor bracket
  - ADD: Support fixture for curved section
  - UPDATE: Gripper → servo gripper (more complex)
```

**Why This Happens:**
- Quote timeline is tight (days not weeks)
- Advance Engineering estimates quickly
- Can't predict every detail upfront
- Errors found during detailed design phase

**Impact:**
- Scope creep (more tools = more cost)
- Timeline delays (design extra tools)
- Budget overruns (unplanned tooling)

---

## Integration Points

### Layout → Tool List → Other Documents

```
┌─────────────────────────────────────────────────────────────┐
│                    2D LAYOUT DRAWING                         │
│  (Created by Advance Engineering)                            │
│                                                              │
│  Shows: Stations, Robots, Tools, Part Flow                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Manual transcription
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      TOOL LIST.xlsx                          │
│  (Manually typed by human reading layout)                    │
│                                                              │
│  Contains: Tool ID, Station, Type, Designer, Due Date        │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  ASSEMBLIES LIST         │  │  ROBOT EQUIPMENT LIST    │
│                          │  │                          │
│  Tool design progress    │  │  Gripper Payload column  │
│  Links to Tool List      │  │  Uses tool weight from   │
│  Designer tracks work    │  │  Tool List design        │
└──────────────────────────┘  └──────────────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  SIMULATION STATUS                           │
│                                                              │
│  Simulator uses tools and robots from lists above           │
│  Tracks programming completion                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tool List Column Breakdown

### Based on Manual Entry Process

**Essential Columns:**
1. **Tool ID** - Transcribed from layout (exact match required)
2. **Station** - Where tool is located (from layout)
3. **Tool Type** - Inferred or specified (Weld Gun, Gripper, Fixture)
4. **Description** - Human-readable purpose

**Assignment Columns:**
5. **Designer** - Who will design this tool
6. **Sim. Employee** - Which simulator needs this tool
7. **Team Leader** - Responsible manager

**Timeline Columns:**
8. **Due Date** - When tool needed for simulation
9. **Sim. Due Date** - When simulator needs it specifically
10. **Status** - Current progress

**Decision Columns:**
11. **Make/Buy** - Internal design or external supplier?
12. **Supplier** - If external, who provides it?

**Quality Columns:**
13. **Design Status** - % complete
14. **Review Status** - Approved for manufacture?

---

## Typical Tool Categories (from Layouts)

### 1. Weld Guns
**Layout Label Examples:**
- "WG-7K-100L-01"
- "Gun_Bodyside_LH"
- "SpotGun_Station100"

**Tool List Entry:**
- Type: Weld Gun
- Critical specs: Electrode force, throat depth
- Weight: ~40-60kg (impacts robot payload!)

---

### 2. Grippers
**Layout Label Examples:**
- "GRIP-7K-100L-PART1"
- "Gripper_DoorFrame"
- "MH_Gripper_RH"

**Tool List Entry:**
- Type: End Effector / Gripper
- Critical specs: Payload capacity, gripping points
- Weight: 20-80kg depending on complexity

---

### 3. Fixtures
**Layout Label Examples:**
- "FIX-7K-100L-LOC"
- "Nest_Station100"
- "PartHolder_7K"

**Tool List Entry:**
- Type: Fixture / Locator
- Critical specs: Part interface points, locking mechanism
- Weight: Varies widely (5-200kg)

---

### 4. Sensors/Safety
**Layout Label Examples:**
- "SENSOR-7K-100L"
- "LightCurtain_7K"
- "ProxSwitch_100L"

**Tool List Entry:**
- Type: Safety Device / Sensor
- Critical specs: Detection range, safety rating
- Often missed in quote stage!

---

## Quote vs Production Comparison

### Typical Evolution of Tool List

**Quote Stage:**
```
Tool List (30 tools estimated)
  - 20 weld guns
  - 8 grippers
  - 2 major fixtures

Missing:
  - Small locating fixtures
  - Cable management
  - Spare tooling
```

**Production Stage (After Review):**
```
Tool List (42 tools actual)
  - 20 weld guns ✓ (same as quote)
  - 8 grippers ✓ (same as quote)
  - 2 major fixtures ✓ (same as quote)
  - 6 locating fixtures (ADDED - missed in quote)
  - 4 cable brackets (ADDED - not considered)
  - 2 spare tools (ADDED - customer requirement)

Total: +12 tools (40% increase!)
```

**Why the Increase:**
1. Quote focused on major tools only
2. Detailed design reveals need for supports
3. Customer adds requirements after quote
4. Safety additions during review
5. Redundancy/spares discovered as needed

---

## Implications for SimPilot

### Data Quality Challenges

**Root Cause: Manual Process**
- Human transcription = human error
- No validation at creation time
- Errors discovered late (during simulation)

**What SimPilot Can Help With:**

1. **Import Validation**
   ```
   Check on import:
   ├─→ Tool ID format valid? (regex pattern match)
   ├─→ Station exists in Robot Equipment List?
   ├─→ Duplicate tool IDs?
   └─→ Required columns present?
   ```

2. **Cross-Reference Validation**
   ```
   Compare across files:
   ├─→ Every tool has station assignment?
   ├─→ Every station has robot assignment?
   ├─→ Tool weight matches gripper payload?
   └─→ Designer assigned to tool?
   ```

3. **Change Tracking**
   ```
   Version comparison:
   ├─→ New tools added since last import?
   ├─→ Tools removed? (why?)
   ├─→ Station assignments changed?
   └─→ Alert: +12 tools added (review needed)
   ```

4. **Missing Tool Detection**
   ```
   Smart alerts:
   ├─→ Station has robot but no tools assigned
   ├─→ Designer has no tools (workload issue?)
   ├─→ Tool assigned but no progress (30+ days)
   └─→ Gripper weight unknown (blocks robot selection)
   ```

---

## Recommended Improvements

### Short Term (Template/Process)

1. **Excel Template with Validation**
   ```
   Tool ID column:
   ├─→ Dropdown for tool type prefix (WG-, GRIP-, FIX-)
   ├─→ Station dropdown (from Robot Equipment List)
   └─→ Auto-format: "WG-7K-100L-01" pattern enforced
   ```

2. **Layout Review Checklist**
   ```
   Before transcribing to Tool List:
   □ All stations have at least 1 tool?
   □ Cable management tools included?
   □ Safety devices listed?
   □ Spare tooling considered?
   □ Small fixtures identified?
   ```

3. **Dual Person Verification**
   ```
   Process:
   Person A: Transcribes from layout
   Person B: Verifies against layout
   Reduces transcription errors by ~80%
   ```

---

### Medium Term (Software Support)

1. **Layout Parser (Future)**
   ```
   Someday: OCR/AI reads 2D layout PDF
   Extracts tool labels automatically
   Reduces manual transcription
   Still needs human verification!
   ```

2. **Template Generator**
   ```
   SimPilot feature:
   User inputs: Project name, number of stations
   Output: Pre-filled Tool List template
   Columns: Tool ID, Station, Type, Designer
   ```

3. **Quote vs Production Tracking**
   ```
   SimPilot tracks:
   Original quote estimate: 30 tools
   Current tool count: 42 tools
   Delta: +12 tools (40% scope increase)
   Alert PM: Scope creep detected
   ```

---

## Document Status
**Status:** Complete - Based on user explanation
**Last Updated:** 2026-01-12
**Key Insight:** Tool Lists are manually transcribed from 2D layouts, making them error-prone but essential as master document for project tooling.

**Critical Takeaway:** The 2D layout is the "source of truth" but it's locked in a drawing. The Tool List Excel is the "working copy" that gets updated, tracked, and used by everyone. Any errors in transcription propagate through entire project!
