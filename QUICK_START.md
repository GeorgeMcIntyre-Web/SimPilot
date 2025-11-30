# SimPilot Quick Start Guide

## Using the Excel Ingestion System

### 1. Start the Development Server

```bash
npm run dev
```

The app will start on `http://localhost:5174/` (or 5173 if available)

### 2. Open the Data Loader

Navigate to: `http://localhost:5174/data-loader`

Or click **"Data Loader"** in the left sidebar

### 3. Load Excel Files

The Data Loader page accepts two types of files:

#### Simulation Status Files

These contain project, area, and cell data with simulation progress metrics.

Example files:
- `user_data/d/OneDrive_1_2025-11-29/00_Simulation_Status/STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`
- `user_data/d/OneDrive_1_2025-11-29/00_Simulation_Status/STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`

#### Equipment Files

These contain robot lists and tool/weld gun lists.

Example files:
- `user_data/d/OneDrive_1_2025-11-29/01_Equipment_List/Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`
- `user_data/d/OneDrive_1_2025-11-29/01_Equipment_List/GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx`

### 4. Upload and Parse

1. Click "Choose Files" in each section
2. Select the Excel files from your filesystem
3. Files will be auto-classified (SimulationStatus, RobotList, ToolList)
4. Click **"Parse & Load Data"**

The system will:
- Parse all files in parallel
- Extract domain entities (Projects, Areas, Cells, Robots, Tools)
- Link entities intelligently (robots/tools → cells)
- Update the core store
- Display summary counts and warnings

### 5. Expected Results

After successful ingestion:

✅ **2 Projects** (STLA-S Rear Unit, STLA-S Underbody)
✅ **10+ Areas** (manufacturing areas)
✅ **100+ Cells** (simulation work units)
✅ **Robots** (if robot list was loaded)
✅ **Tools** (weld guns with pneumatic/servo classification)

### 6. Navigate the App

With data loaded, you can now:

- **Dashboard** (`/dashboard`): View project health metrics
- **Projects** (`/projects`): Browse loaded projects
- **Project Detail** (`/projects/:id`): See areas and cells for a project
- **Cell Detail** (`/cells/:id`): View simulation metrics and linked equipment
- **Tools** (`/tools`): Browse and filter tools

## API Reference for UI Development

The ingestion system exposes a clean API for UI consumption.

### Main Ingestion Function

```typescript
import { ingestFiles, IngestFilesInput, IngestFilesResult } from '@/ingestion/ingestionCoordinator'

// Call this from your DataLoaderPage component:
const result = await ingestFiles({
  simulationFiles: [file1, file2],  // File[] from input
  equipmentFiles: [file3, file4]     // File[] from input
})

// result contains:
// {
//   projectsCount: number
//   areasCount: number
//   cellsCount: number
//   robotsCount: number
//   toolsCount: number
//   warnings: IngestionWarning[]
// }
```

### Accessing Data in Components

```typescript
import {
  useProjects,
  useAreas,
  useCells,
  useCellById,
  useRobots,
  useRobotsByCell,
  useTools,
  useToolsByCell,
  useWarnings
} from '@/domain/coreStore'

// In your component:
function MyComponent() {
  const projects = useProjects()               // All projects
  const areas = useAreas(projectId)            // Areas for a project
  const cells = useCells(projectId, areaId)    // Cells filtered by project/area
  const cell = useCellById(cellId)             // Single cell by ID
  const robots = useRobotsByCell(cellId)       // Robots for a cell
  const tools = useToolsByCell(cellId)         // Tools for a cell
  const warnings = useWarnings()               // Ingestion warnings

  // ... render logic
}
```

### Domain Types

```typescript
import {
  Project,
  Area,
  Cell,
  Robot,
  Tool,
  IngestionWarning,
  ProjectStatus,
  CellStatus,
  ToolType,
  SpotWeldSubType
} from '@/domain/core'
```

## Development Workflow

### Making Changes to Parsers

1. Edit files in `src/ingestion/`
2. Save (Vite hot-reloads automatically)
3. Refresh Data Loader page
4. Re-upload files to test changes

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm test
```

## Debugging Tips

### Browser Console

All parsing happens client-side. Check browser console (F12) for errors.

### React DevTools

Install React DevTools to inspect:
- Component tree
- Hook values in DataLoaderPage
- coreStore state

### Source Maps

The dev server includes source maps:
- Set breakpoints in TypeScript files
- Step through `ingestFiles()` function
- Inspect intermediate parsing results

## Common Issues

### "At least one Simulation Status file is required"

**Cause**: You uploaded only equipment files without simulation files.

**Solution**: Upload at least one Simulation Status file (contains Projects/Areas/Cells).

### "Could not find header row"

**Cause**: Excel file structure changed.

**Solution**: Check `EXCEL_STRUCTURE_ANALYSIS.md` and update the parser.

### Robots/Tools not linked to cells

**Cause**: Station codes don't match between files.

**Solution**: Check the warnings panel - linking failures are reported with details.

### No data appears after ingestion

**Cause**: Parser failed silently or UI not using coreStore hooks.

**Solution**:
1. Open browser console to check for errors
2. Verify UI components import from `@/domain/coreStore`
3. Check warnings panel for clues

## Architecture Overview

```
UI Layer (Agent 2)
  └── src/app/routes/DataLoaderPage.tsx
      └── calls ingestFiles()
          ↓
Domain Layer (Agent 1)
  ├── src/ingestion/ingestionCoordinator.ts   (orchestrates parsing)
  ├── src/ingestion/simulationStatusParser.ts (parses projects/cells)
  ├── src/ingestion/robotListParser.ts        (parses robots)
  ├── src/ingestion/toolListParser.ts         (parses tools)
  └── src/ingestion/applyIngestedData.ts      (links entities)
      ↓
  └── src/domain/coreStore.ts                 (stores entities)
      ↓
UI Layer (Agent 2)
  └── Components use hooks:
      useProjects(), useCells(), useRobots(), etc.
```

## File Structure

```
src/
├── domain/
│   ├── core.ts                    # Domain types (Project, Cell, Robot, Tool)
│   └── coreStore.ts               # Store + hooks (useProjects, useCells, etc.)
├── ingestion/
│   ├── ingestionCoordinator.ts    # Main API: ingestFiles()
│   ├── excelUtils.ts              # Excel reading utilities
│   ├── simulationStatusParser.ts  # Parse simulation status files
│   ├── robotListParser.ts         # Parse robot lists
│   ├── toolListParser.ts          # Parse tool lists
│   └── applyIngestedData.ts       # Link entities
└── app/                            # UI layer (Agent 2 responsibility)
    └── routes/
        └── DataLoaderPage.tsx     # Upload UI
```

---

**Need Help?**

- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Architecture details
- [API_REFERENCE.md](API_REFERENCE.md) - Complete API docs for Agent 2
- [EXCEL_STRUCTURE_ANALYSIS.md](EXCEL_STRUCTURE_ANALYSIS.md) - File format specs
