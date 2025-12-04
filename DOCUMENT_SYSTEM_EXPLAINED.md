# Document System Explained - How Everything Connects

**Date:** December 4, 2025
**Based on:** User clarification

---

## The Three Document Types - What They Actually Do

### 1. Tool List (3D Design Department)
**Owner:** 3D Design Department
**Purpose:** Track ALL tools designed internally by DES

**What it contains:**
- Every tool/fixture/gripper designed in-house
- Assigned designers/engineers (488 employees)
- Due dates for design completion
- Suppliers for parts/materials (876 suppliers)

**Example Row:**
```
Tool: 8X-070R-8E1_GEO END EFFECTOR_C
Station: FU 1
Designer: Werner Hamel (AA009)
Status: In 3D Design
Due Date: 2025-12-01
```

---

### 2. Simulation Status (Simulation Department)
**Owner:** Simulation Department (DES Internal + CSG External)
**Purpose:** Track simulation progress **robot-by-robot**

**Granularity:** One row = One robot at one station

**What it contains:**
- Each robot's simulation completion %
- Application type (H=Handling, W=Welding, HW=Both)
- Progress metrics (Robot Sim %, Joining %, Gripper %, Safety %, etc.)

**Example Row:**
```
Area: WHR LH
Assembly Line: BN_B05
Station: 010
Robot: R01
Application: HW (Handling + Welding)
Robot Simulation: 50% complete
Joining: 74% complete
Safety: 0% complete
```

**Key Point:** This is **robot-focused**, not tool-focused!

---

### 3. Assemblies List (Overall Tool Status)
**Owner:** Project Management / Integration
**Purpose:** Track each tool through the entire lifecycle

**Granularity:** One row = One tool (e.g., one fixture, one gripper)

**What it tracks:**
- Design status (Not Started → 1st Stage → 2nd Stage → Detailing → Checking → Issued)
- Simulation status
- Manufacturing status

**Example Row:**
```
Tool: BN010 GJR 10
Design Status: 2nd Stage (60% complete)
Simulation Status: In Progress
Checking: Not Started
Issued: No
```

**Key Point:** This is **tool-focused** and shows the handoff between departments!

---

## How They Should Connect

### The Hierarchy:

```
STATION (e.g., BN_B05 Station 010)
  ├── Has multiple TOOLS (fixtures, grippers, etc.)
  │   ├── Tool 1: BN010 GJR 10 (from Assemblies List)
  │   │   └── Design Status: 2nd Stage (from Tool List)
  │   ├── Tool 2: BN010 GJR 11 (from Assemblies List)
  │   └── Tool 3: BN010 EGR 01 (from Assemblies List)
  │
  └── Has multiple ROBOTS (one per operation)
      ├── Robot R01: Handling + Welding (from Simulation Status)
      └── Robot R02: Welding only (from Simulation Status)
```

### The Connection:

**Common Key: Station Number**

1. **Assemblies List** → Tool `BN010 GJR 10`
   - Station: BN010

2. **Simulation Status** → Robot at `BN_B05 / 010 / R01`
   - Assembly Line: BN_B05
   - Station: 010

3. **Tool List** → Tool designed for `Station FU 1`
   - Station: FU 1

**Mapping Rule:**
- `BN010` (Assemblies) = `BN_B05 station 010` (Simulation)
- Parse: First 2 chars = assembly line prefix, rest = station number

---

## The Issue You're Asking About

> "Simulation status list is done robot-by-robot. Is this the best grouping, or do we have an oversight?"

### Current Situation:
- **Simulation Status:** One row per robot
  - Station BN_B05/010 might have R01, R02, R03 (3 rows)
  - Each robot tracked separately

- **Assemblies List:** One row per tool
  - Station BN010 might have GJR 10, GJR 11, EGR 01 (3 rows)
  - Each tool tracked separately

### The Mismatch:

**At Station BN_B05/010:**
- **Simulation Status shows:** 2 robots (R01, R02)
- **Assemblies List shows:** 5 tools (GJR 10, GJR 11, GJR 12, EGR 01, EGR 02)

**How do they connect?**
- Robot R01 uses which tools? GJR 10? Or GJR 11?
- Tool GJR 10 is used by which robot? R01? Or R02?

---

## Questions for Review

### 1. Is Robot-by-Robot the Right Grouping for Simulation?

**Current:**
```
Row 1: Station 010, Robot R01, HW application → 50% complete
Row 2: Station 010, Robot R02, W application → 30% complete
```

**Alternative A: Tool-by-Tool Grouping?**
```
Row 1: Station 010, Tool GJR 10 → 50% complete
Row 2: Station 010, Tool GJR 11 → 30% complete
```

**Alternative B: Station-by-Station Grouping?**
```
Row 1: Station 010 → Overall 40% complete
  - Robot R01: 50%
  - Robot R02: 30%
```

**Your Answer Needed:**
- ✅ Keep robot-by-robot (current system is fine)
- 🔄 Change to tool-by-tool (so it matches Assemblies List)
- 🔄 Change to station-by-station (rolled up view)
- ⚠️ There's a missing link (need robot-to-tool mapping)

---

### 2. How Do Robots Map to Tools?

**Scenario:**
- Station BN010 has Tools: GJR 10, GJR 11, EGR 01
- Station BN_B05/010 has Robots: R01 (HW), R02 (W)

**Questions:**
1. Does Robot R01 use Tool GJR 10?
2. Does Robot R02 use Tool GJR 11?
3. Or does each robot use ALL the tools at that station?
4. Or is there no direct robot→tool mapping?

**Your Answer Needed:**
- Option A: "Robot R01 at station 010 uses all tools at station 010"
- Option B: "There's a mapping table somewhere (where?)"
- Option C: "Robots and tools are separate - no direct link"
- Option D: "Application code tells you: HW robots use handling tools, W robots use welding tools"

---

### 3. What's the Intended Workflow?

**Ideal workflow (what we think):**
```
1. TOOL LIST: Design department creates tool "BN010 GJR 10"
2. ASSEMBLIES LIST: Tool moves to "1st Stage Design" status
3. ASSEMBLIES LIST: Tool moves to "Simulation" status
4. SIMULATION STATUS: Simulation department works on robots at Station 010
5. ASSEMBLIES LIST: Tool moves to "Issued" status
6. Manufacturing can begin
```

**Questions:**
- Is this correct?
- When Assemblies List says "Simulation: In Progress", which Simulation Status row(s) does it refer to?
- Do we need to link them, or are they separate tracking systems?

---

## Proposed Data Model (Based on Understanding)

### Option A: Independent Tracking (No Links)
```typescript
// Track tools separately from robots
interface Tool {
  id: string
  name: string  // e.g., "BN010 GJR 10"
  station: string
  designStatus: 'Not Started' | '1st Stage' | '2nd Stage' | 'Detailing' | 'Checking' | 'Issued'
  designer: string
}

interface Robot {
  id: string
  station: string
  application: 'H' | 'W' | 'HW'
  simulationProgress: number
}

// NO link between Tool and Robot
```

### Option B: Linked via Station (Loose Coupling)
```typescript
interface Station {
  id: string
  assemblyLine: string
  stationNumber: string
  tools: Tool[]     // All tools at this station
  robots: Robot[]   // All robots at this station
}

// Tools and robots know about each other via shared station
```

### Option C: Direct Mapping (Tight Coupling)
```typescript
interface Robot {
  id: string
  station: string
  application: 'H' | 'W' | 'HW'
  usesTools: string[]  // Tool IDs this robot uses
}

interface Tool {
  id: string
  station: string
  usedByRobots: string[]  // Robot IDs that use this tool
}

// Need a mapping table to populate these
```

---

## What We Need from You

### Critical Question:
**Do robots and tools need to be linked, or are they separate tracking systems?**

**If separate:**
- We track tools independently (Assemblies List + Tool List)
- We track robots independently (Simulation Status)
- Both happen at same stations, but no direct connection
- ✅ Easy to implement

**If linked:**
- We need to know: Which robots use which tools?
- Need a mapping rule or reference table
- ⚠️ More complex, but enables cross-department views

### Practical Test:
**Can you answer this question with current data?**

> "Tool BN010 GJR 10 is at 60% design completion. Which robot simulation(s) need to wait for this tool?"

- ✅ YES → Tools and robots are linked, show us how
- ❌ NO → They're separate systems, we track them independently

---

## Recommendation

Based on your description, I think:

**Tools (Assemblies List + Tool List) and Robots (Simulation Status) are SEPARATE tracking systems that happen to work at the same stations.**

**Data Model:**
```typescript
interface Station {
  id: string
  name: string
  assemblyLine: string

  // Tool tracking (from Assemblies List)
  tools: Tool[]

  // Robot tracking (from Simulation Status)
  robots: Robot[]

  // They're both "at" this station but not directly linked
}
```

**UI Views:**
- Station view shows: "5 tools, 2 robots at this station"
- Tool detail shows: Design progress, assigned designer
- Robot detail shows: Simulation progress, application type
- No "which robot uses which tool" link (because it doesn't exist)

**Is this correct?**

---

## Next Step

Please confirm:
1. ✅ Tools and robots are separate tracking (no direct link)
2. 🔄 Tools and robots ARE linked (show us how)
3. ❓ Not sure - need to ask [person who knows]
