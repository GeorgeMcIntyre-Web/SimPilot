# Simulation Status Integration Notes

## Two Simulation Status Systems

SimPilot now has **two different simulation status systems** that serve different purposes:

### 1. Existing: Project/Area/Cell Simulation Status
**Location**: `src/ingestion/simulationStatusParser.ts`

**Purpose**: Creates the hierarchical Project → Area → Cell structure for the main SimPilot UI

**Data Model**:
```typescript
Project {
  areas: Area[]
}

Area {
  cells: Cell[]
}

Cell {
  stationId: string
  simulationStatus: {
    firstStageCompletion?: number
    finalDeliverablesCompletion?: number
  }
}
```

**Usage**: Main data loader, powers the existing SimPilot hierarchy navigation

**Ingestion**: `parseSimulationStatus()` called by `ingestionCoordinator.ts`

---

### 2. New: Robot-Level Milestone Tracking
**Location**: `src/ingestion/simulationStatus/` (new module)

**Purpose**: Track detailed milestone completion for each robot at each station

**Data Model**:
```typescript
SimulationStatusEntity {
  canonicalKey: "FORD|SIM|9B-100|R03"
  robotFullId: "9B-100-03"
  milestones: {
    robotPositionStage1: 100,
    coreCubicSConfigured: 100,
    // ... 28 milestones total
  }
  overallCompletion: 82,
  linkedToolingEntityKeys: ["FORD|016ZF-1001-100-"]
}
```

**Usage**: Robot detail views, milestone tracking, tooling cross-reference

**Ingestion**: `ingestSimulationStatusFile()` called independently

**Store**: `simulationStatusStore` with 13 React hooks

---

## Integration Strategy

### Co-existence Approach
Both systems should coexist as they serve different needs:

1. **Existing parser** → Continues to power the main Project/Area/Cell hierarchy
2. **New parser** → Adds robot-level milestone detail and tooling cross-reference

### Where They Connect

**Shared Identifier**: Station
- Existing: `Cell.stationId`
- New: `SimulationStatusEntity.stationFull` (e.g., "9B-100")

**Linking**:
```typescript
// Get cell from existing system
const cell = findCellByStationId("9B-100")

// Get robots at that station from new system
const robots = useSimulationStatusByStation("9B", "100")

// Show: Cell has 2 robots with 28 milestones each
```

### UI Strategy

**Option 1: Separate Pages** (Recommended for now)
- Keep existing hierarchy navigation unchanged
- Add new "Simulation Status Detail" page for robot-level views
- Link from station detail → robot detail

**Option 2: Enhanced Cell Detail**
- Extend existing cell detail page
- Add "Robots" tab showing milestone breakdown
- Requires more integration work

**Option 3: Unified Model** (Future)
- Merge both models into single entity
- Requires refactoring existing code
- Not recommended for now

---

## Current State

### ✅ Completed
- New simulation status parser (robot-level milestones)
- Store with React hooks
- Station-level linking to tool entities
- Full test coverage
- Documentation

### 🚧 Not Yet Done
- UI integration (no pages using new system yet)
- Connection to existing ingestion coordinator
- Clear documentation for users

### 📝 Recommended Next Steps

**Quick Win - Standalone Page**:
1. Create `/simulation-status` route
2. Show list of all robots with completion %
3. Click robot → show milestone breakdown
4. Show linked tooling for each robot

**Advantages**:
- No changes to existing code
- Easy to understand separation
- Can be developed independently
- Users can opt-in to use it

**Implementation**:
```typescript
// New route: src/app/routes/SimulationStatusPage.tsx
function SimulationStatusPage() {
  const stats = useSimulationStatusStats()
  const byStation = useSimulationStatusGroupedByStation()

  return (
    <div>
      <h1>Robot Simulation Status</h1>
      <p>Total Robots: {stats.totalRobots}</p>
      <p>Average Completion: {stats.averageCompletion}%</p>

      {/* List all robots grouped by station */}
      {Array.from(byStation.entries()).map(([stationKey, robots]) => (
        <StationCard key={stationKey} robots={robots} />
      ))}
    </div>
  )
}
```

---

## File Organization

### Existing Simulation Status
```
src/ingestion/
  simulationStatusParser.ts       # Project/Area/Cell parser
  ingestionCoordinator.ts          # Calls parseSimulationStatus()
```

### New Simulation Status (Milestone Tracking)
```
src/ingestion/simulationStatus/
  simulationStatusTypes.ts         # Types and interfaces
  simulationStatusParser.ts        # Parser logic
  simulationStatusIngestion.ts     # Ingestion API
  index.ts                         # Public exports

src/domain/
  simulationStatusStore.ts         # React store and hooks
```

### No Conflicts
The new module uses a different namespace and doesn't interfere with existing code.

---

## Developer Guidance

### When to use which system?

**Use Existing System when**:
- Building Project/Area/Cell hierarchy views
- Need overall station completion metrics
- Working with existing SimPilot pages

**Use New System when**:
- Need robot-specific milestone data
- Tracking individual milestone completion
- Cross-referencing robots to tooling
- Building robot detail views

### How to load both?

```typescript
// Load existing hierarchy (ingestionCoordinator)
const hierarchyResult = await ingestFiles({
  simulationFiles: [file],
  equipmentFiles: []
})

// Load robot milestone data (new system)
const workbook = XLSX.read(buffer)
const milestoneResult = await ingestAndStoreSimulationStatus(
  workbook,
  fileName,
  'SIMULATION'
)

// Both are now available
const cell = coreStore.getState().cells[0]  // Existing
const robots = useSimulationStatusByStation("9B", "100")  // New
```

---

## Migration Path (Future)

If we want to unify these systems in the future:

1. **Phase 1**: Use both systems independently (current state)
2. **Phase 2**: Add cross-links (Cell → SimulationStatusEntity references)
3. **Phase 3**: Deprecate duplicate data in Cell.simulationStatus
4. **Phase 4**: Use SimulationStatusEntity as single source of truth

**Not recommended for now** - both systems work well independently.

---

## Summary

- ✅ **Two simulation status systems coexist peacefully**
- ✅ **Existing system unchanged** - no breaking changes
- ✅ **New system ready to use** - fully tested and documented
- 🚧 **UI needed** - no pages using new system yet
- 📝 **Recommended**: Create standalone simulation status page

**Status**: Backend complete, awaiting UI integration decision
