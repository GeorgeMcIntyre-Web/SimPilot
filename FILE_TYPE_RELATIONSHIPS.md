# Excel File Type Relationships
## Visual Guide to Data Flows and Entity Connections

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         PROJECT                                  │
│  (e.g., BMW J10735, Ford V801, STLA-S J11006)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ contains
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          AREAS                                   │
│  (e.g., "7K", "9B", "CD_PILLAR", "FRONT_UNIT")                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ contains
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        STATIONS                                  │
│  (e.g., "7K-100L-1N", "9B-100", "ST010")                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│        ROBOTS             │   │         TOOLS             │
│                           │   │                           │
│ Source: Robot List        │   │ Source: Tool List         │
│         Equipment List    │   │         Assemblies List   │
│                           │   │                           │
│ - Robot ID                │   │ - Tool ID                 │
│ - Model/Type              │   │ - Description             │
│ - Serial Number           │   │ - Design Progress         │
│ - Person Responsible      │   │ - Designer                │
└───────────────────────────┘   └───────────────────────────┘
                │                           │
                │                           │
                │      ┌────────────────────┘
                │      │
                ▼      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SIMULATION STATUS                             │
│                                                                  │
│  Source: Simulation Status Files                                │
│                                                                  │
│  - Tracks Robot programming milestones                          │
│  - Multiple percentage columns (stages)                         │
│  - Links Robot → Station → Area → Project                       │
│  - Updated by simulation engineers                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Type → Entity Mapping

### 1. Robot Lists / Equipment Lists
**Creates Entities:**
- ✅ Projects (derived from filename)
- ✅ Areas (from Area column or derived from Station)
- ✅ Robots (primary entity)
- ⚠️  Stations (referenced, not always fully defined)

**Entity Details:**
```
Robot Entity:
  - id: generated from area + robot number
  - model: Robot Type/Model
  - serialNumber: Serial # or F#
  - stationId: links to Station
  - assignedPerson: Person Responsible
  - metadata: PLC Name, Safety Zone, Bundle, etc.
```

---

### 2. Tool Lists
**Creates Entities:**
- ✅ Projects (derived from filename)
- ✅ Areas (from Area/Sub Area Name)
- ✅ Tools (primary entity)
- ✅ Stations (links tools to stations)

**Entity Details:**
```
Tool Entity:
  - id: Tool ID / Equipment ID
  - type: inferred from Tool ID pattern or description
  - description: Tool Name / Description
  - stationId: links to Station
  - assignedDesigner: Designer / Sim. Employee
  - progress: status/stage information
  - dueDate: Due Date / Sim. Due Date
  - metadata: Team Leader, etc.
```

---

### 3. Simulation Status Files
**Creates Entities:**
- ✅ Projects (derived from filename)
- ✅ Areas (from AREA column or derived)
- ✅ Cells (Station + Area + Line combination)
- ✅ SimulationStatus (attached to Cells)

**Entity Details:**
```
Cell Entity:
  - id: generated from area + station
  - projectId: links to Project
  - areaId: links to Area
  - stationId: canonical station identifier
  - lineCode: Assembly Line (optional)
  - assignedEngineer: Person Responsible
  - simulation: {
      percentComplete: average of all stages
      hasIssues: boolean (if stages lagging)
      metrics: {
        "Concept": 95,
        "Rough Programming": 80,
        "Fine Programming": 60,
        "MRS_OLP: Validation": 45,
        ...
      }
      sourceFile: filename
      sheetName: sheet parsed from
    }
```

**Special Handling:**
- **Multi-sheet files**: Metrics prefixed with sheet name (e.g., "MRS_OLP: Validation")
- **Vacuum parsing**: All percentage columns captured dynamically
- **Area derivation**: Extracts from station codes if AREA column missing

---

### 4. Assemblies Lists
**Creates Entities:**
- ✅ Projects (derived from filename)
- ✅ Areas (from Area column)
- ✅ Tools (primary entity)
- ⚠️  Stations (referenced)

**Entity Details:**
```
Tool Entity (from Assemblies):
  - id: Tool Number
  - description: Description / Part Name
  - type: "assembly" or "fixture"
  - stationId: links to Station
  - progressMetrics: {
      "1st Stage": 100,
      "2nd Stage": 75,
      "Detailing": 50,
      "Checking": 0,
      "Issued": 0
    }
  - metadata: Job Number, Customer, dates
```

---

## Data Flow Through System

### Import Flow
```
1. User uploads Excel file
   │
   ▼
2. Sheet Sniffer detects file type
   │
   ├─→ ROBOT_SPECS → robotEquipmentListParser.ts
   ├─→ IN_HOUSE_TOOLING → toolListParser.ts
   ├─→ SIMULATION_STATUS → simulationStatusParser.ts
   └─→ ASSEMBLIES_LIST → assembliesListParser.ts
   │
   ▼
3. Parser extracts entities
   │
   ├─→ Projects
   ├─→ Areas
   ├─→ Cells (Stations)
   ├─→ Robots
   └─→ Tools
   │
   ▼
4. Entities stored in IndexedDB
   │
   ├─→ Current version (active data)
   └─→ Snapshot saved (version tracking)
   │
   ▼
5. Dashboard displays data
   │
   ├─→ Project view
   ├─→ Readiness board
   ├─→ Engineers view
   └─→ Tools bottlenecks
```

---

## Cross-File Relationships

### How Files Reference Each Other

**Station ID** is the primary linking key:
```
Robot Equipment List:     Station "7K-100L-1N"
                               │
                               ├─→ Robot "7K-100L-01"
                               └─→ Robot "7K-100L-03"
                                     │
Simulation Status:         Station "7K-100L-1N"
                               │
                               └─→ Robot "7K-100L-01" (status: 85% complete)
                                     │
Tool List:                  Station "7K-100L"
                               │
                               └─→ Tool "Fixture-7K-100L-GUN1"
```

**Area Code** groups stations:
```
Area "7K" (Bodysides Left)
  ├─→ Station "7K-100L-1N"
  ├─→ Station "7K-110L-T1"
  ├─→ Station "7K-120L-2N"
  └─→ ...
```

**Project** is top-level:
```
Project "Ford V801" (customer: Ford)
  ├─→ Area "7K" (Bodysides LH)
  ├─→ Area "7L" (Bodysides LH cont.)
  ├─→ Area "7M" (Bodysides LH)
  ├─→ Area "9B" (Dash)
  └─→ ...
```

---

## User Personas and File Usage

### Simulation Engineer
**Primary Files:**
- ✅ Simulation Status (main focus - updates weekly)
- ⚠️  Robot Equipment List (reference only)

**Workflow:**
1. Opens Simulation Status file
2. Updates percentage columns for assigned robots
3. Saves and imports to SimPilot
4. Views progress on Readiness Board

---

### Design Engineer
**Primary Files:**
- ✅ Assemblies List (main focus - updates as design progresses)
- ✅ Tool List (reference and tracking)

**Workflow:**
1. Opens Assemblies List
2. Updates design stage percentages
3. Marks tools as "Issued" when complete
4. Imports to SimPilot for coordination with simulation team

---

### Project Manager
**Primary Files:**
- ✅ Robot Equipment List (ownership and tracking)
- ⚠️  All status files (read-only monitoring)

**Workflow:**
1. Reviews Robot Equipment List for delivery tracking
2. Updates person responsible assignments
3. Monitors overall progress via SimPilot dashboard
4. Uses Version History to track changes

---

## File Update Patterns

### Weekly Updates (Typical)
```
Monday:     Simulation engineers update status files
Tuesday:    Design team updates assemblies progress
Wednesday:  PM reviews and assigns new tasks
Thursday:   Engineers update based on PM feedback
Friday:     Final status update before weekly review
```

### Milestone Updates (Major Changes)
```
Phase Gate Review:
  - All files updated to reflect milestone completion
  - Version snapshot created in SimPilot
  - Comparison shows progress since last gate
```

---

## Integration Points

### Where Files Must Match

**Robot IDs must be consistent:**
- Robot Equipment List: `"7K-100L-01"`
- Simulation Status: `"7K-100L-01"` ← must match exactly

**Station IDs must be consistent:**
- All files: `"7K-100L-1N"` or `"7K-100L"` (with/without suffix)
- Parser normalizes to canonical form

**Area Codes must be consistent:**
- Derived from Station ID: `"7K-100L-1N"` → Area `"7K"`
- Or explicitly in AREA column

---

## Data Quality Considerations

### Common Issues

**Duplicate Entries:**
- Same robot appears multiple times (different sheets)
- Solution: Last imported wins, or merge by key

**Inconsistent Naming:**
- `"7K-100L-1N"` vs `"7K-100L-N1"` vs `"7K100L1N"`
- Solution: Normalizer functions standardize format

**Missing Links:**
- Tool references robot that doesn't exist in Robot List
- Solution: Allow orphaned entities, flag in data health view

**Version Conflicts:**
- User imports old version after newer version
- Solution: Version comparison shows differences, user decides

---

## Next Steps

### Questions to Validate with User:
1. ✅ Are these file type relationships correct?
2. ⚠️  Are there other file types we're missing?
3. ⚠️  How do users coordinate updates across multiple files?
4. ⚠️  What happens when station IDs are renamed?
5. ⚠️  Are there standard templates or can users customize columns?

### Deep Dive Needed:
- [ ] BMW-specific column names and formats
- [ ] Ford V801 MRS_OLP sheet details
- [ ] STLA-S naming conventions
- [ ] Stage/milestone name standardization across customers
- [ ] Tool ID patterns and conventions

---

**Document Status:** Draft
**Last Updated:** 2026-01-12
