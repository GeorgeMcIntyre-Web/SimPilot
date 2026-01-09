# Simulation Status - Complete Understanding

## 🎯 Purpose
Simulation Status files track the progress of robot simulation work through various milestones. Each robot at each station has a completion percentage for ~28 different simulation milestones.

## 📋 File Structure

### Example File
`FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx`

### Excel Sheets
- **SIMULATION** - Main status tracking (focus of this analysis)
- OVERVIEW - Summary
- MRS_OLP - MRS/OLP data
- DOCUMENTATION - Documentation tracking
- SAFETY_LAYOUT - Safety layouts
- APPLICATIONS - Application definitions
- DATA - Additional data
- Boardroom_Status - Executive view

## 🏗️ SIMULATION Sheet Data Model

### Row Structure
Each data row represents **one robot at one station** with its milestone completion status.

### Columns (32 total)

#### Identity Columns (4)
| Column | Description | Example |
|--------|-------------|---------|
| PERS. RESPONSIBLE | Person responsible for this robot | (varies) |
| STATION | Station identifier | `9B-100`, `9B-110` |
| ROBOT | Full robot identifier | `9B-100-03`, `9B-110-04` |
| APPLICATION | Robot application type | `SW`, `MH/SW`, `MH+AS`, `MH+PB` |

#### Milestone Columns (28)
Each milestone column contains a **percentage value (0-100)** or is empty:
- `100` = Milestone 100% complete
- `50` = Milestone 50% complete (if used)
- `undefined`/empty = Not started or not applicable

### Application Types
- **SW** - Spot Weld
- **MH/SW** - Material Handling + Spot Weld
- **MH+AS** - Material Handling + Assembly
- **MH+PB** - Material Handling + Push Button

## 📊 Milestone Categories (28 Total)

### 1. Stage 1 - Initial Setup (10 milestones)
1. ROBOT POSITION - STAGE 1
2. CORE CUBIC S CONFIGURED
3. DRESS PACK & FRYING PAN CONFIGURED - STAGE 1
4. ROBOT FLANGE PCD + ADAPTERS CHECKED
5. ALL EOAT PAYLOADS CHECKED
6. ROBOT TYPE CONFIRMED
7. ROBOT RISER CONFIRMED
8. TRACK LENGTH + CATRAC CONFIRMED
9. COLLISIONS CHECKED - STAGE 1
10. SPOT WELDS DISTRIBUTED + PROJECTED

### 2. Weld Gun Equipment (7 milestones)
11. REFERENCE WELD GUN SELECTED
12. REFERENCE WELD GUN COLLISION CHECK
13. WELD GUN FORCE CHECKED IN WIS7
14. WELD GUN PROPOSAL CREATED
15. FINAL WELD GUN COLLISION CHECK
16. FINAL WELD GUN APPROVED
17. WELD GUN EQUIPMENT PLACED AND CONFIRMED

### 3. Sealer Equipment (4 milestones)
18. SEALING DATA IMPORTED AND CHECKED
19. SEALER PROPOSAL CREATED AND SENT
20. SEALER GUN APPROVED
21. SEALER EQUIPMENT PLACED AND CONFIRMED

### 4. Gripper Equipment (3 milestones)
22. GRIPPER EQUIPMENT PROTOTYPE CREATED
23. FINAL GRIPPER COLLISION CHECK
24. GRIPPER DESIGN FINAL APPROVAL

### 5. Tool Change & Fixture (4 milestones)
25. TOOL CHANGE STANDS PLACED
26. FIXTURE EQUIPMENT PROTOTYPE CREATED
27. FINAL FIXTURE COLLISION CHECK
28. FIXTURE DESIGN FINAL APPROVAL

## 🔗 Relationship to Tool List

### Tool List Structure
V801 tool list entities have:
- **Area Name**: e.g., "9B"
- **Station**: e.g., "100", "110", "110-120" (can be range)
- **Equipment No**: FIDES mechanical identifier
- **Tooling Number RH/LH**: Electrical identifiers
- **Equipment Type**: Type of equipment

**Tool list does NOT have robot-level identifiers** - only station-level.

### Cross-Reference Strategy

#### Station-Level Linking
```
Simulation Status:
  STATION: "9B-100"
  ROBOT: "9B-100-03"

Parse to:
  Area: "9B"
  Station: "100"
  Robot: "03"

Match Tool List Entities:
  WHERE entity.areaName === "9B"
    AND entity.station === "100"
```

#### Station Range Handling
Tool list may have station ranges (e.g., "110-120"):
```
Simulation Robot: "9B-115-05"
  → Area: "9B", Station: "115"

Tool Entity Station: "110-120"
  → Parse range: 110 ≤ 115 ≤ 120 ✅ Match
```

### Linking Logic

**All tooling at a station is potentially used by all robots at that station.**

```typescript
// For each simulation status robot
const robot = {
  station: "9B-100",
  robotId: "9B-100-03",
  application: "SW"
}

// Parse station
const [area, stationNum] = robot.station.split('-')  // ["9B", "100"]

// Find all tool entities at this station
const toolingAtStation = toolEntities.filter(entity =>
  entity.areaName === area &&
  (entity.station === stationNum || stationInRange(stationNum, entity.station))
)

// Link simulation status to these tool entities
// Result: Robot 9B-100-03 uses all tooling at station 9B-100
```

### Application Type Context
Application type can help validate correct tooling:
- **SW** robots → Should have Spot Weld guns
- **MH/SW** robots → Should have Material Handling + Spot Weld equipment
- **Sealer** milestones → Robot uses sealer guns
- **Gripper** milestones → Robot uses grippers

## 📊 Sample Data (From Test File)

### Coverage
- **File**: `FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx`
- **Actual Stations**: 9B-100, 9B-110, 9B-120, 9B-130, 9B-140, 9B-150 (6 stations)
- **Robots**: 11 unique robots
- **Data Rows**: 13 (includes one designation/header row)

### Station Distribution
| Station | Robots |
|---------|--------|
| 9B-100 | 9B-100-03, 9B-100-06 |
| 9B-110 | 9B-110-03, 9B-110-04 |
| 9B-120 | 9B-120-02, 9B-120-05, 9B-120-08 |
| 9B-130 | 9B-130-03, 9B-130-07 |
| 9B-140 | 9B-140-05 |
| 9B-150 | 9B-150-07 |

### Sample Robot Status
**Robot**: 9B-100-03 (SW application)
- ROBOT POSITION - STAGE 1: 100%
- CORE CUBIC S CONFIGURED: 100%
- ROBOT FLANGE PCD + ADAPTERS CHECKED: 100%
- ALL EOAT PAYLOADS CHECKED: 100%
- ROBOT TYPE CONFIRMED: 100%
- ROBOT RISER CONFIRMED: 100%
- COLLISIONS CHECKED - STAGE 1: 100%
- SPOT WELDS DISTRIBUTED + PROJECTED: 100%
- (Many other milestones at 100% or empty)

## 💾 Proposed Data Model

### SimulationStatusEntity
```typescript
interface SimulationStatusEntity {
  // Identity
  canonicalKey: string                    // "FORD|SIM|9B-100|R03"
  entityType: "SIMULATION_STATUS"

  // Identifiers parsed from STATION and ROBOT columns
  area: string                            // "9B"
  station: string                         // "100"
  stationFull: string                     // "9B-100"
  robot: string                           // "03"
  robotFullId: string                     // "9B-100-03"

  // Metadata
  application: string                     // "SW", "MH/SW", etc.
  responsiblePerson: string               // PERS. RESPONSIBLE

  // Milestones (percentage 0-100, or null if not applicable)
  milestones: {
    robotPositionStage1: number | null
    coreCubicSConfigured: number | null
    dressPackFryingPanStage1: number | null
    robotFlangePcdAdaptersChecked: number | null
    allEoatPayloadsChecked: number | null
    robotTypeConfirmed: number | null
    robotRiserConfirmed: number | null
    trackLengthCatracConfirmed: number | null
    collisionsCheckedStage1: number | null
    spotWeldsDistributedProjected: number | null
    referenceWeldGunSelected: number | null
    referenceWeldGunCollisionCheck: number | null
    weldGunForceCheckedWis7: number | null
    weldGunProposalCreated: number | null
    finalWeldGunCollisionCheck: number | null
    finalWeldGunApproved: number | null
    weldGunEquipmentPlacedConfirmed: number | null
    sealingDataImportedChecked: number | null
    sealerProposalCreatedSent: number | null
    sealerGunApproved: number | null
    sealerEquipmentPlacedConfirmed: number | null
    gripperEquipmentPrototypeCreated: number | null
    finalGripperCollisionCheck: number | null
    gripperDesignFinalApproval: number | null
    toolChangeStandsPlaced: number | null
    fixtureEquipmentPrototypeCreated: number | null
    finalFixtureCollisionCheck: number | null
    fixtureDesignFinalApproval: number | null
  }

  // Cross-references
  linkedToolingEntityKeys: string[]       // Canonical keys of tool entities at this station

  // Source tracking
  source: {
    file: string
    sheet: string
    row: number
  }

  // Raw data
  raw: any
}
```

### Linking in Application Store
```typescript
interface ApplicationState {
  toolEntities: ToolEntity[]              // From tool list ingestion
  simulationStatusEntities: SimulationStatusEntity[]  // From sim status ingestion

  // Computed relationships
  toolingByStation: Map<string, ToolEntity[]>  // Key: "9B|100"
  robotsByStation: Map<string, SimulationStatusEntity[]>  // Key: "9B|100"
}
```

## 🎬 Ingestion Strategy

### Step 1: Parse SIMULATION Sheet
1. Find header row (look for "STATION", "ROBOT")
2. Extract identity columns: PERS. RESPONSIBLE, STATION, ROBOT, APPLICATION
3. Extract all 28 milestone columns
4. Parse each data row into SimulationStatusEntity

### Step 2: Parse Station and Robot IDs
```typescript
function parseSimulationStation(station: string): { area: string, station: string } {
  // "9B-100" → { area: "9B", station: "100" }
  const [area, stationNum] = station.split('-')
  return { area, station: stationNum }
}

function parseSimulationRobot(robotId: string): { area: string, station: string, robot: string } {
  // "9B-100-03" → { area: "9B", station: "100", robot: "03" }
  const parts = robotId.split('-')
  return { area: parts[0], station: parts[1], robot: parts[2] }
}
```

### Step 3: Link to Tool Entities
```typescript
function linkSimulationToTooling(
  simEntity: SimulationStatusEntity,
  toolEntities: ToolEntity[]
): string[] {
  const linkedKeys: string[] = []

  for (const toolEntity of toolEntities) {
    // Match by area
    if (toolEntity.areaName !== simEntity.area) continue

    // Match by station (handle ranges)
    if (!stationMatches(simEntity.station, toolEntity.stationGroup)) continue

    // This tool entity is used at this station
    linkedKeys.push(toolEntity.canonicalKey)
  }

  return linkedKeys
}

function stationMatches(simStation: string, toolStation: string): boolean {
  // Handle exact match: "100" === "100"
  if (simStation === toolStation) return true

  // Handle range: "115" in "110-120"
  if (toolStation.includes('-')) {
    const [start, end] = toolStation.split('-').map(Number)
    const simNum = Number(simStation)
    return simNum >= start && simNum <= end
  }

  return false
}
```

### Step 4: Store Entities
```typescript
// Add to application store
addSimulationStatusEntities(entities: SimulationStatusEntity[]): void {
  this.simulationStatusEntities.push(...entities)

  // Update computed indexes
  this.rebuildStationIndexes()
}

rebuildStationIndexes(): void {
  this.robotsByStation.clear()

  for (const simEntity of this.simulationStatusEntities) {
    const key = `${simEntity.area}|${simEntity.station}`
    if (!this.robotsByStation.has(key)) {
      this.robotsByStation.set(key, [])
    }
    this.robotsByStation.get(key)!.push(simEntity)
  }
}
```

## 🎯 Use Cases

### 1. View Station Status
"Show me all robots at station 9B-100 and their simulation progress"
```typescript
const stationKey = "9B|100"
const robots = store.robotsByStation.get(stationKey)
const tooling = store.toolingByStation.get(stationKey)

// Display:
// - 2 robots at this station
// - 15 tool entities used by these robots
// - Avg completion: 85%
```

### 2. View Robot Details
"Show me robot 9B-100-03 and what tooling it uses"
```typescript
const robot = store.simulationStatusEntities.find(e => e.robotFullId === "9B-100-03")
const tooling = robot.linkedToolingEntityKeys.map(key =>
  store.toolEntities.find(e => e.canonicalKey === key)
)

// Display:
// - Robot 9B-100-03 (SW application)
// - Uses 15 tools at station 9B-100
// - Simulation progress: 85% complete
// - Milestone breakdown...
```

### 3. Equipment Validation
"Which robots use tooling 016ZF-1001-100-?"
```typescript
const toolKey = "FORD|016ZF-1001-100-"
const tool = store.toolEntities.find(e => e.canonicalKey === toolKey)

// Find all robots at this station
const stationKey = `${tool.areaName}|${tool.stationAtomic}`
const robots = store.robotsByStation.get(stationKey)

// Display:
// - Tool 016ZF-1001-100- used at station 9B-100
// - Used by 2 robots: 9B-100-03, 9B-100-06
// - Both robots have "Weld Gun Equipment Placed" milestone at 100%
```

## 📝 Next Steps

1. **Design Simulation Status Schema**: Create parser similar to tool list schemas
2. **Implement Station Range Matching**: Handle tool list station ranges in linking logic
3. **Test with Sample File**: Parse the V801 DASH 9B file and verify entity count
4. **Design UI Components**: Create views for station status and robot details
5. **Handle Multiple Files**: Strategy for ingesting multiple simulation status files

---

**Analysis Date**: 2026-01-09
**Status**: Complete understanding achieved ✅
**Ready for**: Schema design and implementation
