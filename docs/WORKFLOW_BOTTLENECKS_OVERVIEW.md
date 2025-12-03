# Workflow Bottlenecks Overview

## Purpose

The Workflow Bottlenecks system is a generic bottleneck detection and analysis framework for tracking progress blockers across the DESIGN → SIMULATION → MANUFACTURE pipeline. It supports multiple asset kinds (tooling, weld guns, robot cells, fixtures) and provides a unified approach to identifying and prioritizing workflow bottlenecks.

## Architecture

### Core Components

1. **Workflow Types** ([src/domain/workflowTypes.ts](../src/domain/workflowTypes.ts))
   - Defines the core type system for workflow items and bottleneck statuses
   - Supports multiple workflow item kinds: `TOOLING`, `WELD_GUN`, `ROBOT_CELL`, `FIXTURE`, `OTHER`
   - Tracks workflow stages: `DESIGN`, `SIMULATION`, `MANUFACTURE`, `EXTERNAL_SUPPLIER`, `UNKNOWN`

2. **Bottleneck Analysis Engine** ([src/domain/workflowBottleneckLinker.ts](../src/domain/workflowBottleneckLinker.ts))
   - Core bottleneck detection logic that analyzes workflow items
   - Implements 12 bottleneck detection rules (see Rules section below)
   - Computes severity scores (0-130, higher = worse) for prioritization

3. **Selectors** ([src/domain/simPilotSelectors.ts](../src/domain/simPilotSelectors.ts))
   - Pure functions for querying bottleneck data from store state
   - Supports filtering by context key, stage, reason, and item kind
   - Provides aggregated statistics (by severity, stage, reason, kind)

4. **Dashboard Panel** ([src/features/dashboard/DashboardBottlenecksPanel.tsx](../src/features/dashboard/DashboardBottlenecksPanel.tsx))
   - UI component showing worst bottlenecks on dashboard
   - Interactive filtering by stage and reason
   - Links to simulation page for detailed investigation

## Input/Output Specifications

### Input: WorkflowItem

```typescript
interface WorkflowItem {
  id: string                           // Unique workflow item ID
  kind: WorkflowItemKind               // TOOLING | WELD_GUN | ROBOT_CELL | FIXTURE | OTHER
  simulationContextKey: string         // Program|Plant|Unit|Line|Station
  name: string                         // Human-readable name
  itemNumber?: string                  // Item number (tooling #, gun ID, etc.)
  equipmentNumber?: string             // Equipment number if applicable
  handedness?: 'LH' | 'RH' | 'PAIR' | 'NA'

  // Stage status snapshots
  designStageStatus: StageStatusSnapshot
  simulationStageStatus: StageStatusSnapshot
  manufactureStageStatus: StageStatusSnapshot

  // Additional context
  externalSupplierName?: string        // External supplier if applicable
  isReuse?: boolean                    // Is this a reuse item?
  hasAssets?: boolean                  // Has physical assets allocated?
  metadata?: Record<string, unknown>   // Additional metadata
}

interface StageStatusSnapshot {
  stage: WorkflowStage                 // Which stage this represents
  status: WorkflowStatus               // NOT_STARTED | IN_PROGRESS | BLOCKED | APPROVED | COMPLETE | ...
  percentComplete: number | null       // Progress percentage (0-100)
  owner?: string                       // Person responsible
  note?: string                        // Additional notes
  updatedAt?: string                   // Last update timestamp
}
```

### Output: WorkflowBottleneckStatus

```typescript
interface WorkflowBottleneckStatus {
  workflowItemId: string               // ID of the workflow item
  kind: WorkflowItemKind               // Kind of item
  simulationContextKey: string         // Simulation context
  itemNumber?: string                  // Item number

  // Bottleneck analysis results
  dominantStage: WorkflowStage         // Which stage has the bottleneck
  bottleneckReason: WorkflowBottleneckReason  // Specific reason (see below)
  severity: BottleneckSeverity         // CRITICAL | HIGH | MEDIUM | LOW | OK
  severityScore: number                // Numeric score 0-130 (higher = worse)

  // Context snapshots
  designStage: StageStatusSnapshot
  simulationStage: StageStatusSnapshot
  manufactureStage: StageStatusSnapshot

  blockingItemIds: string[]            // IDs of items blocking this one (future feature)
  workflowItem?: WorkflowItem          // Optional reference to full item
}
```

### Bottleneck Reasons

| Reason | Severity | Description |
|--------|----------|-------------|
| `DESIGN_BLOCKED` | HIGH | Design stage is blocked by upstream dependency |
| `DESIGN_NOT_DETAILED` | HIGH | Design incomplete/missing detail |
| `SIM_BLOCKED` | HIGH | Simulation blocked by upstream dependency |
| `SIM_CHANGES_REQUESTED` | HIGH | Simulation rejected, changes requested |
| `SIM_NOT_STARTED` | MEDIUM | Simulation not started despite design complete |
| `SIM_BEHIND_DESIGN` | MEDIUM | Simulation lagging behind design (< 25% progress) |
| `MANUFACTURE_CONSTRAINT` | MEDIUM | Manufacturing resource/tooling constraint |
| `SUPPLIER_DELAY` | MEDIUM | External supplier behind schedule |
| `BUILD_AHEAD_OF_SIM` | CRITICAL | Manufacturing started before sim approval |
| `MISSING_ASSETS` | LOW | Physical assets not allocated |
| `MISSING_REUSE` | LOW | Reuse allocation not planned |
| `DATA_GAP` | LOW | Missing required data |
| `DEPENDENCY_BLOCKED` | CRITICAL | Blocked by another workflow item |
| `OK` | OK | No bottleneck detected |
| `UNKNOWN` | LOW | Unknown status |

## Bottleneck Detection Rules

The engine applies these rules in sequence (first match wins):

1. **Design Blocked** - Design status is `BLOCKED`
2. **Design Not Detailed** - Design incomplete and simulation not started
3. **Simulation Blocked** - Simulation status is `BLOCKED`
4. **Simulation Changes Requested** - Simulation status is `CHANGES_REQUESTED`
5. **Simulation Not Started** - Design complete but simulation not started
6. **Simulation Behind Design** - Design complete but simulation < 25% progress
7. **Build Ahead of Sim** - Manufacturing started without simulation approval (CRITICAL)
8. **Missing Assets** - Simulation approved but no physical assets allocated
9. **Missing Reuse** - Has assets but reuse plan not defined
10. **Supplier Delay** - External supplier item with manufacturing < 50% progress
11. **Manufacturing Constraint** - Manufacturing status is `BLOCKED`
12. **OK** - All stages complete/approved

## How Dashboard Panel Consumes Bottlenecks

### Data Flow

```
SimPilot Store
  └─> WorkflowBottleneckSnapshot
       └─> selectWorstBottlenecks(state, limit)
            └─> DashboardBottlenecksPanel
                 ├─> Filter by stage (ALL | DESIGN | SIMULATION | MANUFACTURE)
                 ├─> Filter by reason
                 ├─> Display top 10 filtered bottlenecks
                 └─> Link to simulation page for details
```

### Key Selectors Used by Dashboard

```typescript
// Get worst N bottlenecks sorted by severity
selectWorstWorkflowBottlenecks(state, limit = 5): WorkflowBottleneckStatus[]

// Filter by simulation context (station)
selectWorkflowBottlenecksByContextKey(state, contextKey): WorkflowBottleneckStatus[]

// Filter by workflow item kind
selectWorkflowBottlenecksByKind(state, kind): WorkflowBottleneckStatus[]

// Filter by dominant stage
selectWorkflowBottlenecksByStage(state, stage): WorkflowBottleneckStatus[]

// Filter by bottleneck reason
selectWorkflowBottlenecksByReason(state, reason): WorkflowBottleneckStatus[]

// Get aggregate statistics
selectWorkflowBottleneckStats(state): {
  total: number
  bySeverity: Record<BottleneckSeverity, number>
  byStage: Record<WorkflowStage, number>
  byReason: Record<WorkflowBottleneckReason, number>
  byKind: Record<WorkflowItemKind, number>
}
```

## Test Commands

```bash
# Run core bottleneck engine tests
npm test -- --run src/domain/__tests__/workflowBottleneckLinker.test.ts

# Run all domain/crossRef tests (includes bottleneck tests)
npm test -- --run src/domain/crossRef/__tests__/

# Run dashboard bottleneck tests
npm test -- --run src/features/dashboard/__tests__/useBottleneckOverview.test.ts

# Run all tests
npm test -- --run
```

## Migration Status

### Current State (Phase 1)

- ✅ Generic workflow bottleneck engine implemented and tested
- ✅ Generic selectors available in `simPilotSelectors.ts`
- ✅ Dashboard panel uses legacy tooling-specific selectors (temporary)
- ⏸️ UI components (StationCard, SimulationDetailDrawer, AssetsPage) use legacy bottleneck integration (commented out)

### Future Migration (Phase 2)

The system is designed to support multiple workflow item kinds, but the dashboard currently shows only tooling-specific bottlenecks via legacy selectors. Future work:

1. Migrate dashboard panel to use `selectWorstWorkflowBottlenecks` instead of `selectWorstBottlenecks`
2. Re-enable bottleneck integration in UI components using generic workflow system
3. Add weld gun, robot cell, and fixture workflow items to bottleneck analysis
4. Implement dependency tracking (`blockingItemIds`)

## Empty State Handling

The dashboard panel handles three states:

1. **Loading** - Shows spinner while data loads
2. **Empty Snapshot** - No data loaded yet, prompts user to load snapshot
3. **No Bottlenecks** - Data loaded but no bottlenecks detected (filter issue or genuinely clean)

Empty state copy is clear and actionable, guiding users to either load data or adjust filters.

## Coding Style

All code follows the SimPilot style guide:

- TypeScript strict mode with explicit types
- Guard clauses, no `else`/`elseif`
- Max 2 levels of nesting
- Prefer `is`/`is not` over `!` for boolean checks
- No `any` unless justified with comment
- Functions <= 50 lines
- Composable, single-responsibility functions

## Files Reference

### Core Engine
- [src/domain/workflowTypes.ts](../src/domain/workflowTypes.ts) - Type definitions
- [src/domain/workflowBottleneckLinker.ts](../src/domain/workflowBottleneckLinker.ts) - Bottleneck analysis engine
- [src/domain/__tests__/workflowBottleneckLinker.test.ts](../src/domain/__tests__/workflowBottleneckLinker.test.ts) - Unit tests (16 tests)

### Selectors
- [src/domain/simPilotSelectors.ts](../src/domain/simPilotSelectors.ts) - Store selectors
- [src/domain/__tests__/simPilotSelectors.test.ts](../src/domain/__tests__/simPilotSelectors.test.ts) - Selector tests

### UI Components
- [src/features/dashboard/DashboardBottlenecksPanel.tsx](../src/features/dashboard/DashboardBottlenecksPanel.tsx) - Dashboard panel
- [src/features/dashboard/DashboardBottlenecksSummary.tsx](../src/features/dashboard/DashboardBottlenecksSummary.tsx) - Summary header
- [src/features/dashboard/__tests__/useBottleneckOverview.test.ts](../src/features/dashboard/__tests__/useBottleneckOverview.test.ts) - Hook tests (21 tests)

### Integration Tests
- [src/domain/crossRef/__tests__/workflowBottlenecks.test.ts](../src/domain/crossRef/__tests__/workflowBottlenecks.test.ts) - Cross-reference integration tests (24 tests)
