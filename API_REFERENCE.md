# SimPilot Domain & Ingestion API Reference

**For UI Development (Agent 2)**

This document defines the stable API boundary between the domain/ingestion layer (Agent 1) and the UI layer (Agent 2).

## Ownership

- **Agent 1 owns**: `src/domain/**`, `src/ingestion/**`, `tsconfig.json`
- **Agent 2 owns**: `src/app/**`, `src/ui/**`, `src/components/**`, `src/hooks/**` (legacy)

**Rule**: Agent 2 must ONLY import from the public APIs documented below. Do not import internal parser functions or utilities.

---

## 1. Ingestion API

### Main Entry Point

```typescript
import { ingestFiles } from '../ingestion/ingestionCoordinator'
import type { IngestFilesInput, IngestFilesResult } from '../ingestion/ingestionCoordinator'
```

#### `ingestFiles(input: IngestFilesInput): Promise<IngestFilesResult>`

Ingest Excel files and populate the core store.

**Input:**

```typescript
interface IngestFilesInput {
  simulationFiles: File[]   // Simulation Status Excel files
  equipmentFiles: File[]    // Robot lists, tool lists, etc.
}
```

**Output:**

```typescript
interface IngestFilesResult {
  projectsCount: number
  areasCount: number
  cellsCount: number
  robotsCount: number
  toolsCount: number
  warnings: IngestionWarning[]
}
```

**Behavior:**

- Validates that at least one `simulationFiles` is provided
- Parses files in parallel
- Links robots and tools to cells automatically
- Updates the `coreStore` with results
- Returns counts and warnings

**Example Usage:**

```typescript
// In DataLoaderPage.tsx
const handleLoadData = async () => {
  try {
    const result = await ingestFiles({
      simulationFiles: selectedSimFiles,
      equipmentFiles: selectedEquipFiles
    })

    console.log(`Loaded ${result.projectsCount} projects`)
    console.log(`Warnings: ${result.warnings.length}`)

    // Display result.warnings to user
  } catch (error) {
    console.error('Ingestion failed:', error)
  }
}
```

---

## 2. Domain Types

### Core Entities

```typescript
import type {
  Project,
  Area,
  Cell,
  Robot,
  Tool,
  IngestionWarning,
  ProjectStatus,
  CellStatus,
  SimulationStatus,
  ToolType,
  ToolMountType,
  SpotWeldSubType
} from '../domain/core'
```

#### `Project`

```typescript
interface Project {
  id: string
  name: string              // e.g. "STLA-S Rear Unit"
  customer: string          // e.g. "STLA-S"
  plant?: string
  programCode?: string
  manager?: string          // e.g. "Dale"
  status: ProjectStatus     // "Planning" | "Running" | "OnHold" | "Closed"
  startDate?: string
  sopDate?: string
}
```

#### `Area`

```typescript
interface Area {
  id: string
  projectId: string
  name: string              // e.g. "WHR LH", "Rear Rail LH"
  code?: string             // e.g. "BN_B05"
}
```

#### `Cell`

```typescript
interface Cell {
  id: string
  projectId: string
  areaId: string
  name: string              // human-friendly label
  code: string              // station id, e.g. "010"
  oemRef?: string
  status: CellStatus        // "NotStarted" | "InProgress" | "Blocked" | "ReadyForReview" | "Approved"
  assignedEngineer?: string
  lineCode?: string         // e.g. "BN_B05"
  plannedStart?: string
  plannedFinish?: string
  lastUpdated?: string
  simulation?: SimulationStatus
}
```

#### `SimulationStatus`

```typescript
interface SimulationStatus {
  percentComplete: number   // 0-100
  hasIssues: boolean
  metrics: Record<string, number | string>  // Stage metrics from Excel
  sourceFile: string        // Original Excel filename
  sheetName: string         // Sheet name
  rowIndex: number          // Row number in Excel
}
```

#### `Robot`

```typescript
interface Robot {
  id: string
  name: string              // e.g. "R01"
  oemModel?: string
  lineCode?: string
  areaName?: string
  stationCode?: string
  projectId?: string
  areaId?: string
  cellId?: string           // Linked cell (null if not linked)
  toolIds: string[]         // IDs of tools mounted on this robot
  sourceFile: string
  sheetName: string
  rowIndex: number
}
```

#### `Tool`

```typescript
interface Tool {
  id: string
  name: string
  toolType: ToolType        // "SPOT_WELD" | "SEALER" | "STUD_WELD" | "GRIPPER" | "OTHER"
  subType?: SpotWeldSubType // "PNEUMATIC" | "SERVO" | "UNKNOWN" (for SPOT_WELD only)
  oemModel?: string
  mountType: ToolMountType  // "ROBOT_MOUNTED" | "STAND_MOUNTED" | "HAND_TOOL" | "UNKNOWN"
  lineCode?: string
  areaName?: string
  stationCode?: string
  projectId?: string
  areaId?: string
  cellId?: string           // Linked cell (null if not linked)
  robotId?: string          // Linked robot (null if not mounted)
  reuseStatus?: string
  sourceFile: string
  sheetName: string
  rowIndex: number
}
```

#### `IngestionWarning`

```typescript
interface IngestionWarning {
  id: string
  fileName: string          // Source file that produced the warning
  message: string           // Human-readable warning message
}
```

---

## 3. Core Store Hooks

### Import

```typescript
import {
  useProjects,
  useProject,
  useAreas,
  useCells,
  useCell,
  useCellById,
  useRobots,
  useRobotsByCell,
  useTools,
  useToolsByCell,
  useWarnings,
  coreStore
} from '../domain/coreStore'
```

### Hooks Reference

#### `useProjects(): Project[]`

Returns all projects.

```typescript
const projects = useProjects()
// => [{ id: '...', name: 'STLA-S Rear Unit', ... }, ...]
```

#### `useProject(projectId: string): Project | undefined`

Returns a single project by ID.

```typescript
const project = useProject('proj-STLA-S-Rear-Unit')
// => { id: '...', name: 'STLA-S Rear Unit', ... } or undefined
```

#### `useAreas(projectId?: string): Area[]`

Returns areas, optionally filtered by project.

```typescript
const allAreas = useAreas()                    // All areas
const projectAreas = useAreas('proj-...')      // Areas for a project
```

#### `useCells(projectId?: string, areaId?: string): Cell[]`

Returns cells, optionally filtered by project or area.

```typescript
const allCells = useCells()                    // All cells
const projectCells = useCells('proj-...')      // Cells for a project
const areaCells = useCells(undefined, 'area-...')  // Cells for an area
```

#### `useCell(cellId: string): Cell | undefined`

Returns a single cell by ID.

```typescript
const cell = useCell('cell-123')
// => { id: 'cell-123', name: '...', simulation: {...}, ... }
```

#### `useCellById(cellId: string | undefined): Cell | undefined`

Same as `useCell`, but handles undefined cellId gracefully.

```typescript
const cell = useCellById(optionalCellId)
// => undefined if cellId is undefined, otherwise the cell
```

#### `useRobots(cellId?: string): Robot[]`

Returns robots, optionally filtered by cell.

```typescript
const allRobots = useRobots()                  // All robots
const cellRobots = useRobots('cell-123')       // Robots for a cell
```

#### `useRobotsByCell(cellId: string): Robot[]`

Returns robots for a specific cell.

```typescript
const robots = useRobotsByCell('cell-123')
// => [{ id: '...', name: 'R01', cellId: 'cell-123', ... }]
```

#### `useTools(cellId?: string): Tool[]`

Returns tools, optionally filtered by cell.

```typescript
const allTools = useTools()                    // All tools
const cellTools = useTools('cell-123')         // Tools for a cell
```

#### `useToolsByCell(cellId: string): Tool[]`

Returns tools for a specific cell.

```typescript
const tools = useToolsByCell('cell-123')
// => [{ id: '...', name: 'Gun-01', toolType: 'SPOT_WELD', ... }]
```

#### `useWarnings(): string[]`

Returns ingestion warnings.

**Note**: Returns `string[]` for backward compatibility. Use `IngestFilesResult.warnings` for structured warnings.

```typescript
const warnings = useWarnings()
// => ['[file.xlsx] Row 10 skipped', ...]
```

### Store Actions

For advanced use cases (e.g., clearing data):

```typescript
import { coreStore } from '../domain/coreStore'

// Clear all data
coreStore.clear()

// Get current snapshot
const state = coreStore.getState()
// => { projects: [...], areas: [...], cells: [...], ... }
```

---

## 4. Usage Patterns

### Loading Data

```typescript
// DataLoaderPage.tsx
import { ingestFiles } from '../ingestion/ingestionCoordinator'
import type { IngestFilesInput, IngestFilesResult } from '../ingestion/ingestionCoordinator'

const handleLoad = async () => {
  const result: IngestFilesResult = await ingestFiles({
    simulationFiles: selectedSimFiles,
    equipmentFiles: selectedEquipFiles
  })

  setProjectCount(result.projectsCount)
  setWarnings(result.warnings)
}
```

### Displaying Projects

```typescript
// ProjectsPage.tsx
import { useProjects, useCells } from '../domain/coreStore'
import type { Project } from '../domain/core'

function ProjectsPage() {
  const projects = useProjects()
  const cells = useCells()

  return (
    <div>
      {projects.map(project => {
        const projectCells = cells.filter(c => c.projectId === project.id)
        return (
          <div key={project.id}>
            <h2>{project.name}</h2>
            <p>Cells: {projectCells.length}</p>
          </div>
        )
      })}
    </div>
  )
}
```

### Cell Detail with Equipment

```typescript
// CellDetailPage.tsx
import { useCellById, useRobotsByCell, useToolsByCell } from '../domain/coreStore'

function CellDetailPage({ cellId }: { cellId: string }) {
  const cell = useCellById(cellId)
  const robots = useRobotsByCell(cellId)
  const tools = useToolsByCell(cellId)

  if (!cell) return <div>Cell not found</div>

  return (
    <div>
      <h1>{cell.name}</h1>
      <p>Status: {cell.status}</p>
      {cell.simulation && (
        <div>
          <p>Completion: {cell.simulation.percentComplete}%</p>
          <p>Source: {cell.simulation.sourceFile}:{cell.simulation.rowIndex}</p>
        </div>
      )}

      <h2>Robots ({robots.length})</h2>
      {robots.map(robot => (
        <div key={robot.id}>{robot.name}</div>
      ))}

      <h2>Tools ({tools.length})</h2>
      {tools.map(tool => (
        <div key={tool.id}>
          {tool.name} ({tool.toolType})
        </div>
      ))}
    </div>
  )
}
```

### Filtering Tools

```typescript
// ToolsPage.tsx
import { useTools } from '../domain/coreStore'
import type { ToolType, SpotWeldSubType } from '../domain/core'

function ToolsPage() {
  const allTools = useTools()

  const [filterType, setFilterType] = useState<ToolType | 'ALL'>('ALL')
  const [filterSubType, setFilterSubType] = useState<SpotWeldSubType | undefined>()

  const filteredTools = allTools.filter(tool => {
    if (filterType !== 'ALL' && tool.toolType !== filterType) return false
    if (filterSubType && tool.subType !== filterSubType) return false
    return true
  })

  return (
    <div>
      <select onChange={e => setFilterType(e.target.value as ToolType)}>
        <option value="ALL">All Types</option>
        <option value="SPOT_WELD">Spot Weld</option>
        <option value="SEALER">Sealer</option>
        <option value="GRIPPER">Gripper</option>
      </select>

      {filterType === 'SPOT_WELD' && (
        <select onChange={e => setFilterSubType(e.target.value as SpotWeldSubType)}>
          <option value="">All</option>
          <option value="PNEUMATIC">Pneumatic</option>
          <option value="SERVO">Servo</option>
        </select>
      )}

      {filteredTools.map(tool => (
        <div key={tool.id}>{tool.name}</div>
      ))}
    </div>
  )
}
```

---

## 5. Using ingestFiles with Remotely Downloaded Files

The `ingestFiles` API is **storage-agnostic** and works with File objects from any source, including files downloaded from cloud storage (SharePoint, OneDrive, S3, Google Drive, etc.) or HTTP endpoints.

### Creating Files from Downloaded Blobs

When you download a file from a remote source, you typically get a `Blob`. You can convert this to a `File` object and pass it to `ingestFiles`:

```typescript
// Example 1: Download from an HTTP API
const blob = await fetch('https://api.example.com/data.xlsx')
  .then(response => response.blob())

const file = new File([blob], 'Simulation_Status.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
})

await ingestFiles({
  simulationFiles: [file],
  equipmentFiles: []
})
```

```typescript
// Example 2: Download from Microsoft Graph API (SharePoint/OneDrive)
// NOTE: This code belongs in the UI layer, not the domain layer

import { Client } from '@microsoft/microsoft-graph-client'

const graphClient = getAuthenticatedGraphClient() // Your auth logic

// Download file from SharePoint
const blob = await graphClient
  .api(`/sites/{siteId}/drive/items/{itemId}/content`)
  .get()

// Convert to File object
const file = new File([blob], 'STLA-S_Simulation_Status.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  lastModified: Date.now()
})

// Pass to ingestion API (same as local files!)
const result = await ingestFiles({
  simulationFiles: [file],
  equipmentFiles: [],
  fileSources: { 'STLA-S_Simulation_Status.xlsx': 'remote' } // Optional metadata
})
```

### Optional File Source Tracking

The `fileSources` field is optional and can be used for diagnostics or logging:

```typescript
await ingestFiles({
  simulationFiles: [localFile, remoteFile],
  equipmentFiles: [],
  fileSources: {
    'local-data.xlsx': 'local',      // Uploaded from disk
    'cloud-data.xlsx': 'remote'      // Downloaded from SharePoint
  }
})
```

### Key Benefits

- **No vendor lock-in**: Domain layer is independent of any cloud provider
- **Identical behavior**: Files from any source are processed the same way
- **Easy testing**: Create Files from Blobs in tests to simulate downloads
- **Future-proof**: Add new cloud providers without changing domain code

### Architecture Notes

For more details on how cloud storage integration works while keeping the domain layer agnostic, see [MS_INTEGRATION_NOTES.md](docs/MS_INTEGRATION_NOTES.md).

**Key principle**: Authentication and file downloading happen in the **UI layer**. The domain layer only receives File objects—it doesn't care where they came from.

---

## 6. Important Notes

### Do NOT Import

❌ **Do not import** internal parsers or utilities:

```typescript
// DON'T DO THIS:
import { parseSimulationStatus } from '../ingestion/simulationStatusParser'
import { findHeaderRow } from '../ingestion/excelUtils'
```

Instead, use `ingestFiles()` which orchestrates everything.

### TypeScript Paths

If using path aliases in `tsconfig.json`, you can import as:

```typescript
import { ingestFiles } from '@/ingestion/ingestionCoordinator'
import { useProjects } from '@/domain/coreStore'
import type { Project } from '@/domain/core'
```

### Reactivity

All hooks use React's `useState` and `useEffect` internally. When `ingestFiles()` updates the store, all components using hooks will re-render automatically.

### Data Persistence

Currently, data is **in-memory only** and cleared on page refresh. Future: add localStorage or backend sync.

---

## 7. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2025-11-30 | Added optional `fileSources` field to `IngestFilesInput`. Added documentation for remote file usage. |
| 1.0.0 | 2025-11-30 | Initial stable API. `ingestFiles()` signature finalized. All hooks defined. |

---

**Questions?**

- Check [QUICK_START.md](QUICK_START.md) for usage examples
- Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for architecture
- Domain/Ingestion issues: Agent 1 responsibility
- UI/Component issues: Agent 2 responsibility
