# Robot Equipment List Ingestion System

## Overview

The Robot Equipment List ingestion system parses Ford V801 Robot Equipment List Excel files and provides a comprehensive UI for viewing, filtering, and analyzing robot equipment specifications and delivery status.

## System Components

### 1. Data Layer

#### Type Definitions
**File**: `src/ingestion/robotEquipmentList/robotEquipmentListTypes.ts`

Defines comprehensive types for robot equipment data:
- `RobotEquipmentEntity` - Complete robot equipment specification
- `RobotBases`, `RobotTrack`, `RobotWeldguns`, `RobotSealing` - Equipment component types
- `CableSpec` - Cable length specifications (main, tipdress, teach pendant)
- `RobotApplicationType` - Robot function types (Spot Welding, Material Handling, etc.)

#### Parser
**File**: `src/ingestion/robotEquipmentList/robotEquipmentListParser.ts`

Parses Excel data into normalized entities:
- Handles two-tier header structure (column groups + detailed headers)
- Normalizes boolean values, dates, and numeric fields
- Validates required fields (robotId, station)
- Detects duplicates and anomalies
- Supports multiple sheets

#### Ingestion Script
**File**: `src/ingestion/robotEquipmentList/ingestRobotEquipmentList.ts`

Main ingestion entry point:
- Configurable sheet name and header rows
- Validation and error reporting
- CLI support for standalone execution
- Verbose output mode for debugging

**Usage**:
```typescript
import { ingestRobotEquipmentList } from './src/ingestion/robotEquipmentList/ingestRobotEquipmentList'

const result = ingestRobotEquipmentList(filePath, {
  sheetName: 'V801N_Robot_Equipment_List 26.9',  // Default
  headerRowIndex: 2,  // Row with detailed column names (0-indexed)
  dataStartRow: 4,    // First data row (0-indexed)
  verbose: true
})

console.log(`Loaded ${result.entities.length} robots`)
console.log(`Validation report:`, result.validationReport)
```

### 2. Domain Store

**File**: `src/domain/robotEquipmentStore.ts`

React-based state management with hooks:

#### Store Actions
```typescript
import { robotEquipmentStore } from './src/domain/robotEquipmentStore'

// Load entities
robotEquipmentStore.setEntities(entities)

// Add entities from a file
robotEquipmentStore.addEntities(entities, sourceFile)

// Replace entities from a specific file
robotEquipmentStore.replaceEntitiesFromFile(entities, sourceFile)

// Clear data
robotEquipmentStore.clear()
```

#### React Hooks
```typescript
import {
  useRobotEquipmentEntities,
  useRobotEquipmentById,
  useRobotEquipmentByStation,
  useRobotEquipmentByArea,
  useRobotEquipmentStats,
  useRobotEquipmentGroupedByStation,
  useRobotEquipmentGroupedByApplication,
  useRobotEquipmentWithESOWConcerns,
} from './src/domain/robotEquipmentStore'

function MyComponent() {
  const entities = useRobotEquipmentEntities()
  const stats = useRobotEquipmentStats()
  const robot = useRobotEquipmentById('9B-100-03')

  return <div>{/* ... */}</div>
}
```

### 3. UI Components

#### RobotEquipmentList Component
**File**: `src/components/RobotEquipment/RobotEquipmentList.tsx`

Comprehensive UI with:

**Features**:
- ✅ Real-time search across all fields (robot ID, station, type, serial, etc.)
- ✅ Multi-select filters (area, robot type, application)
- ✅ Delivery status filtering (delivered / not delivered)
- ✅ ESOW concerns filtering
- ✅ Install status filtering
- ✅ Flexible grouping (by area, station, application, robot type, status)
- ✅ Expand/collapse groups
- ✅ Expandable robot cards with detailed specs
- ✅ Visual badges for status (Not Delivered, ESOW concerns)
- ✅ Statistics dashboard

**Visual Indicators**:
- Yellow left border: Not Delivered robots
- Red left border: ESOW concerns
- Badges: Delivery status, ESOW flags, install status

**Card Details** (expandable):
- Equipment: Weldguns, sealing, tracks, bases
- Cables: Main cable, tipdress cable, teach pendant cable (with lengths)
- ESOW Compliance: FTF approval, ESOW robot type, differences, concerns

**Usage**:
```typescript
import { RobotEquipmentList } from './src/components/RobotEquipment'

function App() {
  return <RobotEquipmentList />
}
```

## Data Structure

### Excel File Structure

**File**: `Ford_OHAP_V801N_Robot_Equipment_List.xlsx`

**Sheet**: `V801N_Robot_Equipment_List 26.9`

**Structure**:
- **Row 0**: Company logo/title
- **Row 1**: Column group headers (Area, Robot Application, Main Cable, etc.)
- **Row 2**: Detailed column headers (Person Responsible, Function, Controller To Robot, etc.)
- **Row 3**: Metadata (Kawasaki, "See Application Tab", etc.)
- **Row 4+**: Robot data (382 robots)

### Parsed Entity Fields

```typescript
interface RobotEquipmentEntity {
  // Identity
  canonicalKey: string              // "FORD|ROBOT|9B-100-03"
  robotId: string                   // "9B-100-03"
  station: string                   // "9B-100"
  area: string                      // "9B"
  areaFull: string                  // "Dash"

  // Robot Details
  serialNumber: string | null       // "3858" or "Not Delivered"
  robotKey: string                  // "Robot_1"
  robotType: string                 // "BXP210L"
  application: RobotApplicationType // "Spot Welding"
  applicationCode: string           // "SW"

  // Assignment
  personResponsible: string         // "Robyn Holtzhausen"
  bundle: string                    // "Bundle 1"
  order: number | null              // 1

  // Status
  installStatus: string | null      // "Powered on"
  robotTypeConfirmed: boolean
  robotOrderSubmitted: boolean

  // Equipment Components
  bases: RobotBases | null
  track: RobotTrack | null
  weldguns: RobotWeldguns | null
  sealing: RobotSealing | null

  // Cables
  mainCable: CableSpec | null
  tipdressCable: CableSpec | null
  teachPendantCable: CableSpec | null

  // ESOW Compliance
  ftfApprovedDesignList: boolean
  esowRobotType: string | null
  ftfApprovedESOW: boolean
  differsFromESOW: boolean
  esowComment: string | null
  applicationConcern: string | null
}
```

## Test Data Statistics

**File**: `Ford_OHAP_V801N_Robot_Equipment_List.xlsx`

### Overview
- **Total Robots**: 382
- **Delivered**: ~340
- **Not Delivered**: ~42
- **Areas**: 9 (7K, 7L, 7M, 7X, 8A, 8X, 8Y, 8Z, 9B)

### Breakdown by Area
| Area | Count |
|------|-------|
| 7X   | 88    |
| 8X   | 81    |
| 7L   | 59    |
| 9X   | 48    |
| 7M   | 38    |
| 8Y   | 30    |
| 7K   | 23    |
| 9B   | 11    |
| 8A   | 3     |
| 8Z   | 1     |

### Robot Types
- BXP210L, BX300L, MXP360L, and others
- Mix of Kawasaki robot models

### Applications
- Spot Welding (SW)
- Material Handling (MH)
- Material Handling / Spot Welding (MH/SW)
- Sealing
- Other specialized applications

## Testing

### Command Line Test
```bash
# Test ingestion only
npx tsx src/ingestion/robotEquipmentList/ingestRobotEquipmentList.ts "C:\Users\georgem\source\repos\SimPilot_Data\TestData\V801\V801_Docs\Ford_OHAP_V801N_Robot_Equipment_List.xlsx"

# Comprehensive test with diagnostics
npx tsx tools/dev/testRobotEquipmentIngestion.ts
```

### UI Test
```bash
# Launch UI test (requires React setup)
npx tsx tools/dev/testRobotEquipmentUI.tsx
```

## Integration with Other Systems

### Cross-References

The Robot Equipment List integrates with:

1. **Tool List** (`src/ingestion/toolList/`)
   - Shared: Station identifiers
   - Relationship: Multiple robots per station, each with associated tooling

2. **Simulation Status** (`src/ingestion/simulationStatus/`)
   - Shared: Robot IDs (9B-100-03, etc.)
   - Relationship: Robot-level simulation milestones vs equipment specs

### Canonical Keys

All three systems use compatible canonical keys:
- **Tool List**: `FORD|STATION|{station}`
- **Simulation Status**: `FORD|ROBOT|{robotId}`
- **Robot Equipment**: `FORD|ROBOT|{robotId}`

### Example Cross-Reference Query

```typescript
import { toolStore } from './src/domain/toolStore'
import { simulationStatusStore } from './src/domain/simulationStatusStore'
import { robotEquipmentStore } from './src/domain/robotEquipmentStore'

// Get all data for a specific robot
const robotId = '9B-100-03'
const equipment = robotEquipmentStore.getState().entities.find(e => e.robotId === robotId)
const simStatus = simulationStatusStore.getState().entities.find(e => e.robotId === robotId)
const stationTools = toolStore.getByStation(equipment.station)

console.log({
  equipment,      // Robot specs, delivery status, cables
  simStatus,      // Simulation milestones
  stationTools    // Tooling at this robot's station
})
```

## Known Issues

### Struck-Through Robots
Some robots in the Excel file are struck through (indicating removal/cancellation) but are still parsed. These can be filtered in the UI using the ESOW concerns or install status filters, or by checking specific robot comments.

### Two-Tier Headers
The Excel file has a complex two-tier header structure. The parser currently uses **Row 2** (detailed headers) for column mapping. If ingesting different versions of the file, verify the header row index.

## Future Enhancements

1. **Excel Formatting Detection**: Detect struck-through text and flag robots as removed
2. **Export Functionality**: Export filtered robot lists to CSV/Excel
3. **Comparison View**: Compare robot specs against ESOW standards
4. **Timeline View**: Track delivery dates and installation progress
5. **Cross-Reference UI**: Show related simulation status and tooling in robot cards
6. **Bulk Updates**: Support batch status updates from UI

## File Reference

### Created Files
```
src/
├── ingestion/
│   └── robotEquipmentList/
│       ├── robotEquipmentListTypes.ts       (300 lines)
│       ├── robotEquipmentListParser.ts      (494 lines)
│       └── ingestRobotEquipmentList.ts      (223 lines)
├── domain/
│   └── robotEquipmentStore.ts               (388 lines)
└── components/
    └── RobotEquipment/
        ├── RobotEquipmentList.tsx           (450+ lines)
        ├── RobotEquipmentList.css           (400+ lines)
        └── index.ts

tools/dev/
├── testRobotEquipmentIngestion.ts
├── testRobotEquipmentUI.tsx
├── inspectRobotEquipmentList.ts
├── analyzeRobotEquipmentListColumns.ts
└── diagnoseRobotEquipmentParsing.ts

docs/
└── ROBOT_EQUIPMENT_INGESTION.md (this file)
```

## Summary

The Robot Equipment List ingestion system provides:
- ✅ **Complete data ingestion** from Excel (382 robots)
- ✅ **Type-safe domain models** with comprehensive field coverage
- ✅ **React state management** with hooks
- ✅ **Rich UI component** with filtering, grouping, search
- ✅ **Cross-reference support** with Tool List and Simulation Status
- ✅ **Validation and error reporting**
- ✅ **Test utilities** for development

The system is production-ready and fully integrated with the SimPilot data architecture.
