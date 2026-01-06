# Data Integrity Issues - SimPilot Ingestion System

## Executive Summary

This document identifies critical data integrity vulnerabilities in the SimPilot data ingestion system. The system lacks fundamental safeguards for duplicate detection, file versioning, referential integrity, and transaction management.

**Analysis Date**: 2026-01-06
**Severity**: 4 Critical, 3 High, 1 Medium

---

## Issues Overview

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | No Checksum/Hash Verification | Critical | Duplicate uploads undetected |
| 2 | No Schema Versioning | High | Template changes cause duplicates |
| 3 | Ambiguous Linking Logic | High | Orphaned assets accumulate |
| 4 | No Referential Integrity | Critical | Dangling references crash UI |
| 5 | No Transaction Rollback | Critical | Partial imports corrupt database |
| 6 | No Deduplication | Critical | Same file = duplicate data |
| 7 | Weak Data Validation | Medium | Invalid data accepted |
| 8 | No Conflict Resolution | High | Data loss on overwrites |

---

## 1. Checksum/Hash Verification

### Problem
- No file tracking mechanism exists
- No hash generation for uploaded files
- No duplicate file detection
- No tamper detection

### Impact
- Same file can be uploaded multiple times
- Creates duplicate entities with identical IDs
- No way to detect file modifications
- No data lineage tracking

### Location
- `src/ingestion/ingestionCoordinator.ts` (lines 237-364)

### Example Scenario
```
User uploads: "RobotList_FRONT_UNIT.xlsx" (50 robots)
System creates: 50 Robot entities

5 minutes later, user uploads SAME FILE again
System creates: 50 MORE robots with IDENTICAL IDs
Result: 100 robots in database (50 duplicates)
```

### Current Code
```typescript
export async function ingestFiles(input: IngestFilesInput) {
  const allFiles = [...input.simulationFiles, ...input.equipmentFiles]

  // NO HASH GENERATION
  // NO DUPLICATE DETECTION

  for (const file of allFiles) {
    const workbook = await readWorkbook(file)
    // Process immediately with no tracking
  }
}
```

### Recommended Fix
```typescript
interface FileTracker {
  hash: string           // SHA-256 of file content
  fileName: string
  uploadedAt: string
  processedEntities: string[]  // IDs created from this file
}

async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function detectDuplicateUpload(file: File, tracker: FileTracker[]): boolean {
  const hash = await generateFileHash(file)
  return tracker.some(t => t.hash === hash)
}
```

---

## 2. Schema Versioning

### Problem
- No version tracking for Excel templates
- Multiple header patterns supported but no versioning
- No backward compatibility checks
- No migration tracking

### Impact
- Different template versions create duplicate entities with different IDs
- Old and new templates can't be reconciled
- No way to detect schema evolution

### Location
- `src/ingestion/robotListParser.ts` (lines 32-45)
- `src/ingestion/sheetSniffer.ts`

### Example Scenario
```
Week 1: Template v1.0 with columns ["ROBOT", "AREA", "STATION"]
→ Generates IDs: "robot-FRONT-010-R01"

Week 3: Template v2.0 with columns ["ROBOTNUMBER", "ASSEMBLY LINE", "STATION NUMBER"]
→ Generates IDs: "robot-FRONT_UNIT-010-R01" (different format!)

User uploads mix of templates:
→ 100 robots from v1.0 + 100 robots from v2.0
→ System treats as 200 different entities
→ Actually 100 duplicates with different IDs
```

### Current Code
```typescript
const POSSIBLE_HEADERS = [
  ['ROBOT', 'AREA', 'STATION'],
  ['ROBOT ID', 'AREA', 'STATION'],
  ['ROBOTNUMBER', 'ASSEMBLY LINE', 'STATION NUMBER'],
  // Multiple patterns but NO VERSION METADATA
]
```

### Recommended Fix
```typescript
interface SchemaVersion {
  version: string          // "v1.0", "v2.0"
  detectedAt: string
  columnMappings: Record<string, string>
  transformRules: ColumnTransform[]
}

interface ColumnTransform {
  fromVersion: string
  toVersion: string
  fieldMapping: Record<string, string>
  dataTransform?: (oldValue: any) => any
}
```

---

## 3. Linking Logic

### Problem
- When multiple assets match a cell, system picks first one arbitrarily
- No deterministic tie-breaking logic
- Orphaned assets not tracked or reported
- Silent failures when links cannot be established

### Impact
- Wrong assets linked to cells
- Other valid assets become orphaned
- No warnings about ambiguous matches
- Orphaned records accumulate over time

### Location
- `src/ingestion/unifiedAssetLinker.ts` (lines 116-143)
- `src/ingestion/relationshipLinker.ts` (lines 145-171)

### Example Scenario
```
Station "REAR UNIT|10" has 3 assets:
  - Robot "R01"
  - Robot "R02"
  - Glue Gun "GJR-10"

Linking process:
  1. Finds 3 candidates
  2. Filters to 2 robots
  3. Returns robots[0] ARBITRARILY
  4. R02 becomes ORPHANED (no warning!)
  5. GJR-10 becomes ORPHANED

Result: Cell linked to wrong robot, other assets lost
```

### Current Code
```typescript
function pickBestAssetForCell(ctx: MatchContext): Asset | null {
  if (ctx.candidates.length === 1) {
    return ctx.candidates[0]  // OK
  }

  const robots = ctx.candidates.filter(asset =>
    (asset as Robot).kind === 'ROBOT'
  )

  if (robots.length > 1) {
    return robots[0]  // FIRST MATCH - NO TIE-BREAKING LOGIC
  }

  return ctx.candidates[0]  // ARBITRARY CHOICE
}
```

### Recommended Fix
```typescript
function pickBestAssetForCell(ctx: MatchContext): Asset | null {
  if (ctx.candidates.length === 1) {
    return ctx.candidates[0]
  }

  // Log ambiguous match
  ctx.warnings.push({
    type: 'AMBIGUOUS_LINK',
    message: `Multiple assets found for cell ${ctx.cell.id}: ${ctx.candidates.map(a => a.id).join(', ')}`,
    candidates: ctx.candidates
  })

  // Deterministic tie-breaking:
  // 1. Prefer exact caption match
  // 2. Prefer robots over tools
  // 3. Prefer lower sequence number
  // 4. Alphabetical by ID

  return sortedCandidates[0]
}

// Track orphans
function findOrphanedAssets(assets: Asset[]): Asset[] {
  return assets.filter(a => !a.cellId && !a.robotId)
}
```

---

## 4. Referential Integrity

### Problem
- No validation that foreign keys exist
- No constraint enforcement
- No cascade operations
- Dangling references accepted

### Impact
- Cells reference non-existent projects/areas
- Robots reference non-existent cells
- UI crashes trying to render related data
- Database in inconsistent state

### Location
- `src/domain/coreStore.ts` (lines 119-146)

### Example Scenario
```
Upload File 1: Creates Project "STLA-S" (id: "proj-STLA-S")
Upload File 2: Creates 50 Cells with projectId: "proj-STLA-S"

User clears data and uploads File 2 only:
  - projects: [] (empty)
  - cells: [50 cells with projectId: "proj-STLA-S"]

All 50 cells have dangling projectId references
UI crashes trying to render project.name
```

### Current Code
```typescript
setData(data: {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  robots: Robot[]
  tools: Tool[]
}): void {
  // NO VALIDATION OF REFERENCES
  // No check for:
  // - cells[i].projectId exists in projects
  // - cells[i].areaId exists in areas
  // - robots[i].cellId exists in cells

  storeState = {
    projects: [...data.projects],
    areas: [...data.areas],
    cells: [...data.cells],
    assets: [...data.robots, ...data.tools],  // BLIND MERGE
  }
}
```

### Recommended Fix
```typescript
interface IntegrityErrors {
  danglingProjectRefs: string[]
  danglingAreaRefs: string[]
  danglingCellRefs: string[]
  orphanedAssets: string[]
}

function validateReferentialIntegrity(data: IngestedData): IntegrityErrors {
  const errors: IntegrityErrors = {
    danglingProjectRefs: [],
    danglingAreaRefs: [],
    danglingCellRefs: [],
    orphanedAssets: []
  }

  // Check all area.projectId exists
  for (const area of data.areas) {
    if (!data.projects.find(p => p.id === area.projectId)) {
      errors.danglingProjectRefs.push(area.id)
    }
  }

  // Check all cell.areaId exists
  for (const cell of data.cells) {
    if (!data.areas.find(a => a.id === cell.areaId)) {
      errors.danglingAreaRefs.push(cell.id)
    }
  }

  // Check all robot.cellId exists
  for (const robot of data.robots) {
    if (robot.cellId && !data.cells.find(c => c.id === robot.cellId)) {
      errors.danglingCellRefs.push(robot.id)
    }
  }

  return errors
}

// Before committing:
const integrityErrors = validateReferentialIntegrity(data)
if (hasErrors(integrityErrors)) {
  throw new IntegrityError('Referential integrity violations detected', integrityErrors)
}
```

---

## 5. Transaction Rollback

### Problem
- No transaction support
- No rollback mechanism if import fails midway
- No atomic operations
- Partial data committed on errors

### Impact
- Incomplete data committed to store
- Database left in corrupted state
- No way to recover from partial imports
- Users cannot undo failed operations

### Location
- `src/ingestion/applyIngestedData.ts` (lines 39-135)
- `src/ingestion/ingestionCoordinator.ts` (lines 237-476)

### Example Scenario
```
User uploads 3 files:
  1. SimStatus.xlsx → Parses successfully (100 cells created)
  2. RobotList.xlsx → Parses successfully (50 robots created)
  3. ToolList.xlsx → CRASHES (corrupted Excel file)

Result:
  - Store has 100 cells and 50 robots
  - NO TOOLS (missing equipment)
  - Data is INCOMPLETE and INCONSISTENT
  - NO ROLLBACK MECHANISM
  - User cannot undo this state
```

### Current Code
```typescript
export function applyIngestedData(data: IngestedData): ApplyResult {
  const projects: Project[] = []
  const cells: Cell[] = []
  const robots: Robot[] = []

  if (data.simulation) {
    projects.push(...data.simulation.projects)  // MUTATES
    cells.push(...data.simulation.cells)        // MUTATES
  }

  if (data.robots) {
    robots.push(...data.robots.robots)  // MUTATES
  }

  // Link assets - CAN FAIL MIDWAY
  linkRobotsToCells(robots, cells, areas, projects, warnings)

  // NO TRY-CATCH, NO ROLLBACK IF LINKING FAILS

  return { projects, cells, robots, tools, warnings }
}
```

### Recommended Fix
```typescript
interface StoreSnapshot {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  assets: Asset[]
  timestamp: string
}

class IngestionTransaction {
  private snapshot: StoreSnapshot | null = null
  private operations: Operation[] = []

  begin() {
    this.snapshot = coreStore.createSnapshot()
  }

  addProjects(projects: Project[]) {
    this.operations.push({ type: 'ADD_PROJECTS', data: projects })
  }

  addCells(cells: Cell[]) {
    this.operations.push({ type: 'ADD_CELLS', data: cells })
  }

  validate() {
    // Validate referential integrity
    // Validate business rules
    // Return errors if any
  }

  commit() {
    if (!this.validate()) {
      throw new Error('Validation failed')
    }

    // Apply all operations atomically
    for (const op of this.operations) {
      applyOperation(op)
    }

    coreStore.notifySubscribers()
  }

  rollback() {
    if (this.snapshot) {
      coreStore.loadSnapshot(this.snapshot)
    }
    this.operations = []
  }
}

// Usage:
const tx = new IngestionTransaction()
tx.begin()

try {
  const simResult = await parseSimulationStatus(...)
  tx.addProjects(simResult.projects)
  tx.addCells(simResult.cells)

  const robotResult = await parseRobotList(...)
  tx.addRobots(robotResult.robots)

  tx.commit()  // All or nothing
} catch (error) {
  tx.rollback()  // Restore previous state
  throw error
}
```

---

## 6. Deduplication

### Problem
- Only projects deduplicated by name
- Areas and cells NOT deduplicated
- Same file uploaded twice creates duplicates
- ID collisions not detected

### Impact
- Duplicate areas with identical IDs
- Duplicate cells with identical IDs
- Database bloat
- Inconsistent data

### Location
- `src/ingestion/applyIngestedData.ts` (lines 51-67)

### Example Scenario
```
Upload 1: "STLA_S_FRONT_UNIT.xlsx"
  - Creates Area "FRONT UNIT" (id: "proj-STLA-S-area-FRONT-UNIT")
  - Creates 50 Cells

Upload 2: SAME FILE (accidental duplicate)
  - Deduplicates Project "STLA-S" ✓
  - Creates ANOTHER Area "FRONT UNIT" (SAME ID!) ✗
  - Creates 50 MORE Cells ✗

Result:
  - 1 Project (deduplicated)
  - 2 Areas with IDENTICAL IDs (ID COLLISION)
  - 100 Cells (50 duplicates)
```

### Current Code
```typescript
if (data.simulation) {
  const projectMap = new Map<string, Project>()

  for (const project of data.simulation.projects) {
    const key = `${project.customer}:${project.name}`
    if (!projectMap.has(key)) {
      projectMap.set(key, project)
    }
    // If duplicate, keep first (assumes identical - NOT VALIDATED)
  }

  projects.push(...projectMap.values())
  areas.push(...data.simulation.areas)   // NO DEDUP
  cells.push(...data.simulation.cells)   // NO DEDUP
}
```

### Recommended Fix
```typescript
interface DuplicateReport<T> {
  exactDuplicates: { existing: T; incoming: T }[]
  idCollisions: { existing: T; incoming: T }[]
  semanticDuplicates: { existing: T; incoming: T }[]
}

function detectDuplicateEntities<T extends { id: string }>(
  existing: T[],
  incoming: T[]
): DuplicateReport<T> {
  const report: DuplicateReport<T> = {
    exactDuplicates: [],
    idCollisions: [],
    semanticDuplicates: []
  }

  for (const newEntity of incoming) {
    const existingEntity = existing.find(e => e.id === newEntity.id)

    if (existingEntity) {
      if (isDeepEqual(existingEntity, newEntity)) {
        report.exactDuplicates.push({ existing: existingEntity, incoming: newEntity })
      } else {
        report.idCollisions.push({ existing: existingEntity, incoming: newEntity })
      }
    }
  }

  return report
}

// Usage:
const areaDuplicates = detectDuplicateEntities(existingAreas, incomingAreas)

if (areaDuplicates.idCollisions.length > 0) {
  throw new Error(`ID collisions detected: ${areaDuplicates.idCollisions.length} areas`)
}

// Skip exact duplicates
const uniqueAreas = incomingAreas.filter(area =>
  !areaDuplicates.exactDuplicates.some(d => d.incoming.id === area.id)
)
```

---

## 7. Data Validation

### Problem
- Only validates array structure, not content
- No required field enforcement
- No data type validation
- No business rule validation

### Impact
- Invalid data accepted (empty names, percentages >100, invalid dates)
- Null reference errors in UI
- Inconsistent data types
- Business logic violations

### Location
- `src/domain/coreStore.ts` (lines 73-101)
- `src/ingestion/normalizers.ts`

### Example Issues
```typescript
// These all pass validation but are invalid:
project = { id: "", name: "", customer: "" }  // Empty required fields
cell = { percentComplete: 150 }  // Invalid percentage
cell = { plannedStart: "not-a-date" }  // Invalid date format
robot = { stationNumber: "ABC" }  // Should be numeric
```

### Current Code
```typescript
function validateSetDataInput(data: unknown): void {
  // ONLY validates structure, NOT content
  const requiredArrayFields = ['projects', 'areas', 'cells', 'robots', 'tools']
  for (const field of requiredArrayFields) {
    if (!Array.isArray(d[field])) {
      throw new Error(`${field} must be an array`)
    }
  }

  // NO VALIDATION OF:
  // - Required fields within entities
  // - Data type consistency
  // - Value ranges
  // - Business rules
}
```

### Recommended Fix
```typescript
interface ValidationError {
  entity: string
  field: string
  value: any
  message: string
}

function validateProject(project: Project): ValidationError[] {
  const errors: ValidationError[] = []

  if (!project.id || project.id.trim() === '') {
    errors.push({ entity: 'Project', field: 'id', value: project.id, message: 'Project ID is required' })
  }

  if (!project.name || project.name.trim() === '') {
    errors.push({ entity: 'Project', field: 'name', value: project.name, message: 'Project name is required' })
  }

  if (!project.customer || project.customer.trim() === '') {
    errors.push({ entity: 'Project', field: 'customer', value: project.customer, message: 'Customer is required' })
  }

  if (!['Planning', 'Running', 'OnHold', 'Closed'].includes(project.status)) {
    errors.push({ entity: 'Project', field: 'status', value: project.status, message: 'Invalid project status' })
  }

  return errors
}

function validateCell(cell: Cell): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate percentComplete is 0-100
  if (cell.simulation?.percentComplete !== undefined) {
    const pct = cell.simulation.percentComplete
    if (typeof pct !== 'number' || pct < 0 || pct > 100) {
      errors.push({
        entity: 'Cell',
        field: 'simulation.percentComplete',
        value: pct,
        message: `Invalid percentage: ${pct}. Must be 0-100.`
      })
    }
  }

  // Validate dates are ISO format
  if (cell.plannedStart && !isValidISODate(cell.plannedStart)) {
    errors.push({
      entity: 'Cell',
      field: 'plannedStart',
      value: cell.plannedStart,
      message: `Invalid date format`
    })
  }

  return errors
}

function validateBusinessRules(data: ApplyResult): ValidationError[] {
  const errors: ValidationError[] = []

  // Rule: Every cell must belong to an area
  for (const cell of data.cells) {
    if (!data.areas.find(a => a.id === cell.areaId)) {
      errors.push({
        entity: 'Cell',
        field: 'areaId',
        value: cell.areaId,
        message: `Cell references non-existent area: ${cell.areaId}`
      })
    }
  }

  return errors
}
```

---

## 8. Conflict Resolution

### Problem
- Multiple files blindly merged
- Last file wins on ID conflicts
- No conflict detection
- No user choice on conflicts
- Data silently overwritten

### Impact
- Data from earlier files lost
- No warning about conflicts
- Users unaware of data loss
- Cannot control merge behavior

### Location
- `src/ingestion/ingestionCoordinator.ts` (lines 310-350)
- `src/ingestion/versionComparison.ts`

### Example Scenario
```
File 1: "RobotList_v1.xlsx"
  Robot R01:
    - oemModel: "FANUC R-2000iC"
    - sourcing: "REUSE"

File 2: "RobotList_v2.xlsx" (updated specs)
  Robot R01:
    - oemModel: "KUKA KR 500"
    - sourcing: "NEW_BUY"

System:
  1. Creates robot "robot-BN_010_R01" from File 1
  2. Creates robot "robot-BN_010_R01" from File 2 (SAME ID)
  3. Map.set() OVERWRITES first with second
  4. File 1 data LOST
  5. NO WARNING
  6. NO USER CHOICE
```

### Current Code
```typescript
for (const file of allFiles) {
  if (kind === 'SimulationStatus') {
    const result = await parseSimulationStatus(workbook, file.name)

    if (!ingestedData.simulation) {
      ingestedData.simulation = result
    } else {
      // BLIND APPEND - no deduplication
      ingestedData.simulation.projects.push(...result.projects)
      ingestedData.simulation.areas.push(...result.areas)
      ingestedData.simulation.cells.push(...result.cells)
    }
  }
}
```

### Recommended Fix
```typescript
enum MergeStrategy {
  KEEP_FIRST,      // Keep existing, ignore new
  KEEP_LAST,       // Overwrite with new
  MERGE_FIELDS,    // Intelligently merge non-conflicting fields
  USER_CHOICE      // Prompt user to choose
}

interface MergeConflict<T> {
  existingEntity: T
  incomingEntity: T
  conflictingFields: {
    field: string
    existingValue: any
    incomingValue: any
  }[]
}

function mergeEntities<T extends { id: string }>(
  existing: T[],
  incoming: T[],
  strategy: MergeStrategy
): {
  merged: T[]
  conflicts: MergeConflict<T>[]
} {
  const conflicts: MergeConflict<T>[] = []
  const merged: T[] = [...existing]

  for (const newEntity of incoming) {
    const existingEntity = merged.find(e => e.id === newEntity.id)

    if (!existingEntity) {
      merged.push(newEntity)  // No conflict
    } else {
      const conflictingFields = detectFieldConflicts(existingEntity, newEntity)

      if (conflictingFields.length > 0) {
        conflicts.push({
          existingEntity,
          incomingEntity: newEntity,
          conflictingFields
        })

        // Apply strategy
        switch (strategy) {
          case MergeStrategy.KEEP_FIRST:
            // Do nothing, keep existing
            break
          case MergeStrategy.KEEP_LAST:
            Object.assign(existingEntity, newEntity)
            break
          case MergeStrategy.MERGE_FIELDS:
            mergeNonConflictingFields(existingEntity, newEntity, conflictingFields)
            break
          case MergeStrategy.USER_CHOICE:
            // Queue for user review
            break
        }
      }
    }
  }

  return { merged, conflicts }
}

// Usage:
const { merged: mergedRobots, conflicts } = mergeEntities(
  existingRobots,
  incomingRobots,
  MergeStrategy.USER_CHOICE
)

if (conflicts.length > 0) {
  // Show UI for user to resolve conflicts
  const resolved = await showConflictResolutionDialog(conflicts)
  applyResolutions(mergedRobots, resolved)
}
```

---

## Severity Ranking

### 🔴 Critical (Fix Immediately)
1. **Transaction Rollback** - Partial imports corrupt database
2. **Deduplication** - Duplicate uploads create duplicate data
3. **Referential Integrity** - Dangling references crash UI
4. **Checksum/Hash** - Can't detect duplicate uploads

### 🟡 High (Fix Soon)
5. **Conflict Resolution** - Data loss on overwrites
6. **Linking Logic** - Orphaned assets accumulate
7. **Schema Versioning** - Template changes cause duplicates

### 🟢 Medium (Plan to Fix)
8. **Data Validation** - Invalid data accepted

---

## Implementation Priorities

### Priority 1 (This Week)
- [ ] Add file SHA-256 hash tracking
- [ ] Implement transaction wrapper with rollback
- [ ] Add foreign key validation before commit
- [ ] Add entity-level deduplication

### Priority 2 (Next Sprint)
- [ ] Add schema version to Excel templates
- [ ] Improve linking with deterministic tie-breaking
- [ ] Add conflict resolution UI
- [ ] Add business rule validation

### Priority 3 (Future)
- [ ] Implement orphan tracking and cleanup UI
- [ ] Add cascade delete operations
- [ ] Implement concurrency control
- [ ] Add audit log for data changes

---

## Related Documentation

- Technical Debt: `TECH_DEBT.md`
- Architecture: Review in PR #26
- Ingestion System: `src/ingestion/`
- Data Store: `src/domain/coreStore.ts`

---

**Document Version**: 1.0
**Last Updated**: 2026-01-06
**Next Review**: After Priority 1 fixes implemented
