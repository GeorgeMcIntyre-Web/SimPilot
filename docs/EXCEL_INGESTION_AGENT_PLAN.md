# Excel Ingestion - Agent Implementation Plan

**Status**: Implementation Guide
**Version**: 1.0
**Date**: December 2, 2025
**Coordinated by**: Integration Architect (Claude Code)

---

## Overview

This document defines the work for **3 specialized sub-agents** (Cursor Agents) who will implement the Universal Schema-Agnostic Excel Ingestion system in parallel.

Each agent has:
- **Clear scope**: Specific files to create/modify
- **Explicit tasks**: Numbered, testable deliverables
- **Test requirements**: What must pass before completion
- **Coordination points**: Where agents must sync

---

## Agent Coordination Strategy

### Branch Structure

```
main
  ├─► feature/excel-universal-agent1  (Core Engine)
  ├─► feature/excel-universal-agent2  (Performance)
  └─► feature/excel-universal-agent3  (Semantics & UX)
```

### Merge Order

1. **Agent 1 merges first** (Core types + engine)
2. **Agent 2 merges second** (Performance on top of Agent 1)
3. **Agent 3 merges last** (UI + AI on top of Agent 1+2)

### Communication Protocol

- **Slack channel**: `#simpilot-excel-universal`
- **Daily standup**: Async updates on blockers
- **Shared doc**: This file tracks progress

---

## Agent 1: Core Engine (Foundation)

### Objective
Build the **core ingestion pipeline** with schema-agnostic profiling and field matching.

### Scope

**Priority**: HIGHEST (blocks Agent 2 and 3)

**Estimated Time**: 5-7 days

**Complexity**: HIGH (architecture-defining work)

---

### Tasks

#### Task 1.1: Create Layer 1 Types (Raw Data)

**Files to Create**:
- `src/ingestion/core/rawTypes.ts`

**Requirements**:
1. Define `RawWorkbook`, `RawSheet`, `RawRow`, `RawCell`
2. Define `ValueProvenance` type
3. Add JSDoc comments for all exports
4. Ensure types are serializable (for caching)

**Code Style**:
```typescript
// ✅ GOOD
interface RawWorkbook {
  workbookId: string
  fileName: string
  fileHash: string
  // ... rest
}

// ❌ BAD - avoid nesting
interface RawWorkbook {
  metadata: {
    info: {
      id: string
    }
  }
}
```

**Tests**:
- Unit test: Type serialization round-trip
- Unit test: Provenance construction

**Deliverable**: PR with types file + tests

---

#### Task 1.2: Add RawWorkbook Adapter to Existing Loader

**Files to Modify**:
- `src/ingestion/workbookLoader.ts`

**Requirements**:
1. Add `toRawWorkbook()` function:
   ```typescript
   export function toRawWorkbook(
     normalized: NormalizedWorkbook,
     fileBuffer: ArrayBuffer
   ): RawWorkbook
   ```
2. Compute `fileHash` (SHA-256)
3. Generate `workbookId` (UUID v4)
4. Map `NormalizedSheet` → `RawSheet`
5. Do NOT break existing `loadWorkbook()` function
6. Keep backward compatibility

**Code Style**:
- Use guard clauses
- Early returns for validation
- Max 2 levels of nesting

**Tests**:
- Integration test: `NormalizedWorkbook` → `RawWorkbook` conversion
- Unit test: File hash computation is stable
- Unit test: WorkbookId is unique per call

**Deliverable**: PR with adapter + tests

---

#### Task 1.3: Create FieldRegistry with Default Fields

**Files to Create**:
- `src/ingestion/profiling/FieldRegistry.ts`
- `src/ingestion/profiling/defaultFields.ts`
- `src/ingestion/core/profileTypes.ts`

**Requirements**:
1. Implement `FieldRegistry` class:
   ```typescript
   class FieldRegistry {
     private fields = new Map<FieldId, FieldDescriptor>()

     registerField(descriptor: FieldDescriptor): void { }
     findByName(name: string): FieldDescriptor | null { }
     findBySynonym(synonym: string): FieldDescriptor[] { }
   }
   ```

2. Define `FieldDescriptor` type in `profileTypes.ts`

3. In `defaultFields.ts`, register **at least 30 fields**:
   - Identity: `robot_id`, `gun_id`, `tool_id`, `device_name`, `serial_number`
   - Location: `area_id`, `station_code`, `assembly_line`, `zone`, `cell_id`
   - Technical: `gun_force_kn`, `robot_payload_kg`, `robot_reach_mm`, `oem_model`
   - Status: `simulation_status`, `allocation_status`, `sourcing_type`
   - Personnel: `engineer_name`, `sim_leader`
   - Dates: `due_date`, `start_date`, `end_date`

4. Each field must have:
   - `synonyms` (from existing `columnRoleDetector.ts` patterns)
   - `exampleHeaders` (real-world headers from current Excel files)
   - `expectedType`

**Migration Strategy**:
- Extract patterns from `columnRoleDetector.ts:ROLE_PATTERNS`
- Convert `ColumnRole` → `FieldId` mapping

**Code Style**:
```typescript
// ✅ GOOD - flat structure
registry.registerField({
  id: 'robot_id',
  canonicalName: 'Robot ID',
  synonyms: ['robotnumber', 'robot number', 'robot id'],
  expectedType: 'string'
})

// ❌ BAD - nested objects
registry.registerField({
  field: {
    identity: {
      robot: { id: 'robot_id' }
    }
  }
})
```

**Tests**:
- Unit test: Registry stores and retrieves fields
- Unit test: `findByName()` matches synonyms
- Unit test: All 30+ default fields are registered
- Unit test: No duplicate field IDs

**Deliverable**: PR with FieldRegistry + default fields + tests

---

#### Task 1.4: Implement ColumnProfiler

**Files to Create**:
- `src/ingestion/profiling/ColumnProfiler.ts`

**Requirements**:
1. Implement `ColumnProfiler` class:
   ```typescript
   class ColumnProfiler {
     profileColumn(
       sheet: RawSheet,
       columnIndex: number
     ): ColumnProfile { }
   }
   ```

2. Compute:
   - `TypeDistribution` (string/number/boolean/null counts)
   - `inferredType` (majority type)
   - `distinctCount`
   - `sampleValues` (first 10 non-null)
   - `headerTokens` (split header into words)
   - `regexPatterns` (detect common patterns: station codes, robot IDs)

3. Pattern detection for:
   - Station codes: `/^[A-Z]{2}\d{3}$/`
   - Robot IDs: `/^R\d{2}$/`
   - Part numbers: `/^[A-Z0-9]{6,10}$/`

**Code Style**:
- Small helper methods (<20 lines each)
- Avoid nested loops

**Tests**:
- Unit test: Type inference (majority type wins)
- Unit test: Pattern detection (station codes, robot IDs)
- Unit test: Empty column handling
- Unit test: Mixed type column handling

**Deliverable**: PR with ColumnProfiler + tests

---

#### Task 1.5: Implement SheetProfiler

**Files to Create**:
- `src/ingestion/profiling/SheetProfiler.ts`

**Requirements**:
1. Implement `SheetProfiler` class:
   ```typescript
   class SheetProfiler {
     constructor(
       private sniffer: SheetSniffer,
       private columnProfiler: ColumnProfiler
     ) {}

     profile(sheet: RawSheet): SheetProfile { }
   }
   ```

2. Integrate existing `sheetSniffer.ts`:
   - Call `sniffSheet()` for category detection
   - Map `SheetDetection` → `SheetCategoryScore[]`

3. Profile all columns using `ColumnProfiler`

4. Compute quality score:
   ```typescript
   private computeQualityScore(sheet: RawSheet): number {
     // Factors:
     // - % non-null cells
     // - % columns with consistent types
     // - Row structure regularity
     // Returns 0-1
   }
   ```

**Code Style**:
- Use existing `sheetSniffer`, don't rewrite
- Guard clauses for empty sheets

**Tests**:
- Integration test: Sheet profiling end-to-end
- Unit test: Quality score calculation
- Unit test: Empty sheet handling

**Deliverable**: PR with SheetProfiler + tests

---

#### Task 1.6: Implement FieldMatcher

**Files to Create**:
- `src/ingestion/profiling/FieldMatcher.ts`

**Requirements**:
1. Implement `FieldMatcher` class:
   ```typescript
   class FieldMatcher {
     constructor(private registry: FieldRegistry) {}

     matchColumn(column: ColumnProfile): SemanticColumn { }
   }
   ```

2. Scoring algorithm:
   - Header exact match: +50 points
   - Synonym match: +30 points
   - Header contains: +15 points
   - Type compatibility: +20 points
   - Regex pattern match: +25 points

3. Sort matches by score descending

4. Determine confidence:
   - Score ≥70: `HIGH`
   - Score ≥40: `MEDIUM`
   - Score <40: `LOW`

**Code Style**:
- Extract `scoreMatch()` as separate method
- Small focused helpers

**Tests**:
- Unit test: Exact header match scores 50
- Unit test: Synonym match scores 30
- Unit test: Type mismatch reduces score
- Unit test: Multiple matches sorted correctly
- Unit test: Confidence thresholds

**Deliverable**: PR with FieldMatcher + tests

---

#### Task 1.7: Create SheetSemanticModel Builder

**Files to Create**:
- `src/ingestion/profiling/SemanticAnalyzer.ts`

**Requirements**:
1. Implement `SemanticAnalyzer` class:
   ```typescript
   class SemanticAnalyzer {
     constructor(
       private profiler: SheetProfiler,
       private matcher: FieldMatcher
     ) {}

     analyze(sheet: RawSheet): SheetSemanticModel { }
   }
   ```

2. Orchestrate:
   - Profile sheet
   - Match all columns
   - Compute coverage metrics

3. Return `SheetSemanticModel` with:
   - `sheetProfile`
   - `columns: SemanticColumn[]`
   - `mappingCoverage` (%)
   - `averageConfidence`

**Code Style**:
- Composition over inheritance
- Clear separation of concerns

**Tests**:
- Integration test: Full sheet analysis pipeline
- Unit test: Coverage calculation
- Unit test: Average confidence calculation

**Deliverable**: PR with SemanticAnalyzer + tests

---

#### Task 1.8: Integrate with Existing Orchestrator

**Files to Modify**:
- `src/ingestion/excelIngestionOrchestrator.ts`

**Requirements**:
1. Add new pipeline method:
   ```typescript
   export async function ingestWithSemantics(
     options: IngestionOptions
   ): Promise<IngestionResult> {
     // 1. Load raw workbooks
     // 2. Analyze sheets (SheetSemanticModel)
     // 3. Project to domain (existing logic)
     // 4. Return IngestionResult
   }
   ```

2. Keep existing `ingestAllExcelData()` unchanged (backward compat)

3. Add type adapters:
   - `ColumnRole` → `FieldId`
   - `SheetCategory` → `SheetProfile`

**Code Style**:
- Guard clauses
- Early returns
- No breaking changes

**Tests**:
- Integration test: New pipeline end-to-end
- Regression test: Existing pipeline still works

**Deliverable**: PR with orchestrator integration + tests

---

### Agent 1 Acceptance Criteria

- ✅ All 8 tasks completed
- ✅ All tests pass (`npx vitest run`)
- ✅ TypeScript compiles with no errors
- ✅ Zero `any` types introduced
- ✅ Existing ingestion still works (backward compat)
- ✅ Code coverage >85% for new files
- ✅ Documentation comments on all public APIs

---

## Agent 2: Performance (Optimization)

### Objective
Add **caching, parallelism, and streaming** for production-grade performance.

### Scope

**Priority**: HIGH (unblocks scale testing)

**Estimated Time**: 4-5 days

**Complexity**: MEDIUM (well-defined optimization work)

**Dependencies**: Agent 1 must complete first

---

### Tasks

#### Task 2.1: Implement File Hash Caching

**Files to Create**:
- `src/ingestion/performance/WorkbookCache.ts`
- `src/ingestion/performance/CacheTypes.ts`

**Requirements**:
1. Implement `WorkbookCache` class:
   ```typescript
   class WorkbookCache {
     async get(fileHash: string): Promise<RawWorkbook | null> { }
     set(fileHash: string, workbook: RawWorkbook): void { }
     clear(): void { }
   }
   ```

2. Storage backend: `localStorage` (browser) or `Map` (Node)

3. Cache invalidation:
   - TTL: 1 hour (configurable)
   - Size limit: 100MB total
   - LRU eviction

4. Serialization:
   - Use `JSON.stringify/parse` for `RawWorkbook`
   - Compress with `lz-string` if available

**Code Style**:
- Guard clauses for storage failures
- Graceful degradation (no cache = no error)

**Tests**:
- Unit test: Cache hit/miss
- Unit test: TTL expiration
- Unit test: Size limit enforcement
- Performance test: Cache lookup <1ms

**Deliverable**: PR with WorkbookCache + tests

---

#### Task 2.2: Implement Parallel File Loading

**Files to Create**:
- `src/ingestion/performance/ParallelIngestionEngine.ts`

**Requirements**:
1. Implement `ParallelIngestionEngine` class:
   ```typescript
   class ParallelIngestionEngine {
     async ingestFiles(files: File[]): Promise<IngestionResult> {
       // Load all files in parallel with Promise.all
     }
   }
   ```

2. Strategy:
   - Phase 1: Load all workbooks in parallel (`Promise.all`)
   - Phase 2: Profile all sheets in parallel
   - Phase 3: Project sequentially (or in batches)

3. Concurrency limit: 4 files at once (configurable)

4. Progress tracking:
   - Emit events: `file-loaded`, `sheet-profiled`, `complete`
   - Progress callback: `(current, total) => void`

**Code Style**:
- Use `Promise.all`, not manual promises
- Guard against Promise rejection (`.catch`)

**Tests**:
- Integration test: Load 10 files in parallel
- Performance test: Parallel faster than sequential
- Unit test: Concurrency limit enforced
- Unit test: Progress callback fires correctly

**Deliverable**: PR with ParallelIngestionEngine + tests

---

#### Task 2.3: Implement Streaming for Large Files

**Files to Create**:
- `src/ingestion/performance/StreamingLoader.ts`

**Requirements**:
1. Implement `StreamingWorkbookLoader` class:
   ```typescript
   class StreamingWorkbookLoader {
     async *loadLarge(file: File): AsyncGenerator<RawSheet> {
       // Yield sheets one at a time
     }
   }
   ```

2. Use library:
   - If SheetJS: Use `XLSX.stream` (if available)
   - If ExcelJS: Use `WorkbookReader` streaming API

3. Threshold: Files >10MB use streaming

4. Memory limit: Process 1 sheet at a time

**Code Style**:
- Use `async/await` with generators
- Guard clauses for unsupported formats

**Tests**:
- Integration test: Stream large file (15MB)
- Performance test: Memory usage <200MB for 50MB file
- Unit test: Small files (<10MB) skip streaming

**Deliverable**: PR with StreamingLoader + tests

---

#### Task 2.4: Add Performance Metrics

**Files to Create**:
- `src/ingestion/performance/PerformanceTracker.ts`
- `src/ingestion/core/ingestionTypes.ts` (modify)

**Requirements**:
1. Implement `PerformanceTracker` class:
   ```typescript
   class PerformanceTracker {
     startStage(name: string): void { }
     endStage(name: string): void { }
     getMetrics(): IngestionMetrics { }
   }
   ```

2. Track:
   - `filesPerSecond`
   - `rowsPerSecond`
   - `stageTimes: Record<string, number>`
   - Cache hit ratio

3. Add to `IngestionResult`:
   ```typescript
   interface IngestionResult {
     // ... existing fields
     metrics: IngestionMetrics
     stageTimes: Record<string, number>
   }
   ```

**Code Style**:
- Use `performance.now()` for timing
- Guard against negative durations

**Tests**:
- Unit test: Stage timing accuracy
- Unit test: Metrics calculation

**Deliverable**: PR with PerformanceTracker + tests

---

#### Task 2.5: Optional Web Worker Support

**Files to Create**:
- `src/ingestion/performance/WorkerPool.ts`
- `src/ingestion/performance/worker/excel-worker.ts`

**Requirements**:
1. Implement `WorkerPool` class:
   ```typescript
   class WorkerPool {
     async processFile(file: File): Promise<RawWorkbook> {
       // Offload parsing to worker
     }
   }
   ```

2. Worker implementation:
   - Parse Excel in worker thread
   - Serialize `RawWorkbook` back to main thread

3. Feature flag: `USE_WORKERS` (off by default)

4. Fallback: If workers not supported, use main thread

**Code Style**:
- Guard against worker errors
- Graceful fallback

**Tests**:
- Integration test: Worker parsing
- Unit test: Fallback to main thread

**Deliverable**: PR with WorkerPool + tests (optional task)

---

### Agent 2 Acceptance Criteria

- ✅ Tasks 2.1-2.4 completed (Task 2.5 optional)
- ✅ All tests pass
- ✅ Performance benchmarks show improvement:
  - 10 files <5s (vs 10s+ sequential)
  - Cache hit <1ms lookup
  - Large file streaming uses <200MB memory
- ✅ TypeScript compiles
- ✅ No breaking changes to Agent 1 code
- ✅ Performance metrics visible in `IngestionResult`

---

## Agent 3: Semantics & UX (Intelligence)

### Objective
Add **AI/embedding hooks** and **user-friendly mapping inspection/override UI**.

### Scope

**Priority**: MEDIUM (enhances experience, not critical path)

**Estimated Time**: 5-6 days

**Complexity**: MEDIUM (React + optional AI)

**Dependencies**: Agent 1 must complete first (Agent 2 is parallel)

---

### Tasks

#### Task 3.1: Create Override System

**Files to Create**:
- `src/ingestion/overrides/OverrideStore.ts`
- `src/ingestion/overrides/OverrideTypes.ts`

**Requirements**:
1. Implement `OverrideStore` class:
   ```typescript
   class OverrideStore {
     async load(): Promise<void> { }
     async save(override: MappingOverride): Promise<void> { }
     findOverride(
       fileName: string,
       sheetName: string,
       columnHeader: string
     ): MappingOverride | null { }
   }
   ```

2. Storage: `localStorage` (key: `simpilot-overrides`)

3. Override format:
   ```typescript
   interface MappingOverride {
     workbookPattern: string     // Glob: "*_REUSE_LIST_*.xlsx"
     sheetPattern: string        // Glob: "Welding guns"
     columnHeader: string        // Exact or regex
     fieldId: FieldId
     reason: string
     createdAt: Date
   }
   ```

4. Pattern matching:
   - Use `minimatch` library for glob patterns
   - Support exact match and regex

**Code Style**:
- Guard clauses for storage errors
- Graceful degradation (no storage = no overrides)

**Tests**:
- Unit test: Save/load overrides
- Unit test: Pattern matching (glob, exact, regex)
- Unit test: Override precedence (most specific wins)

**Deliverable**: PR with OverrideStore + tests

---

#### Task 3.2: Integrate Overrides with FieldMatcher

**Files to Modify**:
- `src/ingestion/profiling/FieldMatcher.ts`

**Requirements**:
1. Add override support to `FieldMatcher`:
   ```typescript
   class FieldMatcher {
     constructor(
       private registry: FieldRegistry,
       private overrideStore?: OverrideStore  // Optional
     ) {}

     matchColumn(
       column: ColumnProfile,
       workbookName: string,
       sheetName: string
     ): SemanticColumn {
       // Check override first
       const override = this.overrideStore?.findOverride(
         workbookName,
         sheetName,
         column.headerText
       )

       if (override !== undefined) {
         // Return override as HIGH confidence match
       }

       // Fall back to normal matching
     }
   }
   ```

2. Override match:
   - Score: 100
   - Confidence: `HIGH`
   - Reason: `user_override`

**Code Style**:
- Guard clause for missing override store
- No breaking changes to existing matching

**Tests**:
- Unit test: Override takes precedence
- Integration test: Override in full pipeline

**Deliverable**: PR with override integration + tests

---

#### Task 3.3: Create Embedding Matcher Hook

**Files to Create**:
- `src/ingestion/ai/EmbeddingMatcher.ts`
- `src/ingestion/ai/AITypes.ts`

**Requirements**:
1. Implement `EmbeddingMatcher` interface:
   ```typescript
   interface EmbeddingMatcher {
     computeSimilarity(
       columnHeader: string,
       fieldDescriptor: FieldDescriptor
     ): Promise<number>  // 0-1
   }
   ```

2. Implementation options:
   - **Option A**: Local embeddings (Transformers.js)
   - **Option B**: OpenAI API (behind feature flag)
   - **Option C**: Mock implementation (returns 0)

3. Feature flag: `ENABLE_AI_MATCHING` (off by default)

4. Fallback: If AI fails, use regular matching

**Code Style**:
- Guard against API errors
- Graceful fallback to non-AI matching

**Tests**:
- Unit test: Mock matcher returns 0
- Integration test: Matcher enhances scores (if enabled)

**Deliverable**: PR with EmbeddingMatcher + tests (mock impl sufficient)

---

#### Task 3.4: Create UI - Sheet Profile View

**Files to Create**:
- `src/ui/components/SchemaExplorer/SheetProfileView.tsx`

**Requirements**:
1. React component:
   ```typescript
   interface SheetProfileViewProps {
     profile: SheetProfile
   }
   ```

2. Display:
   - Sheet name + category candidates (with scores)
   - Quality score (0-100%) with color
   - Column count
   - Row count
   - Mapping coverage (%)

3. Styling:
   - Use Tailwind classes
   - Color code confidence: green (HIGH), yellow (MEDIUM), red (LOW)

**Code Style**:
- Functional component
- Small helper components (<50 lines each)

**Tests**:
- Unit test: Component renders
- Snapshot test: UI matches expected structure

**Deliverable**: PR with SheetProfileView + tests

---

#### Task 3.5: Create UI - Column Mapping Table

**Files to Create**:
- `src/ui/components/SchemaExplorer/ColumnMappingTable.tsx`

**Requirements**:
1. React component:
   ```typescript
   interface ColumnMappingTableProps {
     columns: SemanticColumn[]
     onOverride: (columnIndex: number, fieldId: FieldId) => void
   }
   ```

2. Table columns:
   - Column header (from Excel)
   - Best match field (dropdown)
   - Confidence badge (colored)
   - Score
   - Override button

3. Features:
   - Sort by confidence (ascending/descending)
   - Filter: show only LOW confidence
   - Bulk select for review

**Code Style**:
- Use React hooks
- Extract `ColumnRow` sub-component

**Tests**:
- Unit test: Table renders
- Interaction test: Override callback fires

**Deliverable**: PR with ColumnMappingTable + tests

---

#### Task 3.6: Create UI - Override Editor

**Files to Create**:
- `src/ui/components/SchemaExplorer/OverrideEditor.tsx`

**Requirements**:
1. React component:
   ```typescript
   interface OverrideEditorProps {
     column: SemanticColumn
     onSave: (override: MappingOverride) => void
     onCancel: () => void
   }
   ```

2. Form fields:
   - Workbook pattern (text input with glob hint)
   - Sheet pattern (text input with glob hint)
   - Column header (pre-filled, read-only)
   - Target field (dropdown from FieldRegistry)
   - Reason (textarea)

3. Validation:
   - Required: target field, reason
   - Pattern syntax check (valid glob)

**Code Style**:
- Use React Hook Form
- Guard clauses for validation

**Tests**:
- Unit test: Form validation
- Interaction test: Save callback fires

**Deliverable**: PR with OverrideEditor + tests

---

#### Task 3.7: Create UI - Ingestion Report

**Files to Create**:
- `src/ui/components/IngestionReport/IngestionSummary.tsx`
- `src/ui/components/IngestionReport/IssueList.tsx`
- `src/ui/components/IngestionReport/MetricsPanel.tsx`

**Requirements**:
1. `IngestionSummary`:
   - Total workbooks, sheets, rows
   - Mapping coverage (%)
   - Average confidence
   - Issues count (errors/warnings/info)

2. `IssueList`:
   - Table of `IngestionIssue[]`
   - Filter by severity
   - Click to navigate to sheet/row

3. `MetricsPanel`:
   - Performance metrics from Agent 2
   - Files/second, rows/second
   - Cache hit ratio
   - Stage times (bar chart)

**Code Style**:
- Small focused components
- Reusable sub-components

**Tests**:
- Unit test: Each component renders
- Snapshot tests

**Deliverable**: PR with IngestionReport components + tests

---

#### Task 3.8: Integrate UI with Orchestrator

**Files to Modify**:
- `src/app/routes/DataLoaderPage.tsx` (or similar)

**Requirements**:
1. Add new tab: "Schema Inspector"

2. Workflow:
   - User uploads files
   - System analyzes (shows progress)
   - Show `SheetProfileView` for each sheet
   - Show `ColumnMappingTable` for selected sheet
   - Allow overrides via `OverrideEditor`
   - Show `IngestionReport` summary

3. State management:
   - Use React Context or Zustand
   - Store: `IngestionResult`, `selectedSheet`, `overrides`

**Code Style**:
- Extract custom hooks
- Guard clauses for loading states

**Tests**:
- Integration test: Full UI workflow

**Deliverable**: PR with UI integration + tests

---

### Agent 3 Acceptance Criteria

- ✅ All 8 tasks completed
- ✅ All tests pass
- ✅ UI renders without errors
- ✅ Override system works end-to-end:
  - Create override → Persist → Reload → Applied to matching
- ✅ Embedding hook exists (even if mock)
- ✅ TypeScript compiles
- ✅ No breaking changes to Agent 1/2 code

---

## Coordination Checkpoints

### Checkpoint 1: Agent 1 Core Types (Day 2)

**Who**: Agent 1
**Deliverable**: `rawTypes.ts`, `profileTypes.ts`
**Action**: Agent 2 and 3 review types, suggest changes

### Checkpoint 2: Agent 1 Field Registry (Day 4)

**Who**: Agent 1
**Deliverable**: `FieldRegistry` + 30 fields
**Action**: Agent 3 reviews field list, adds UI-relevant fields

### Checkpoint 3: Agent 1 Complete (Day 7)

**Who**: Agent 1
**Deliverable**: All 8 tasks done, tests pass
**Action**: Agent 2 and 3 merge from `feature/excel-universal-agent1`

### Checkpoint 4: Agent 2 Performance (Day 10)

**Who**: Agent 2
**Deliverable**: Caching + parallelism working
**Action**: Agent 3 uses performance metrics in UI

### Checkpoint 5: Agent 3 UI (Day 12)

**Who**: Agent 3
**Deliverable**: Basic UI working
**Action**: Agent 1 and 2 review UI, provide feedback

### Final Checkpoint: Integration (Day 14)

**Who**: All agents
**Deliverable**: All branches merged, all tests pass
**Action**: Integration Architect reviews, approves merge to `main`

---

## Testing Strategy

### Unit Tests
- Every class/function has unit tests
- Coverage target: >85%
- Use Vitest

### Integration Tests
- Full pipeline tests (file → IngestionResult)
- Cross-layer tests (profiling → projection)

### Performance Tests
- Benchmarks for caching, parallelism, streaming
- Regression tests (must not be slower than baseline)

### E2E Tests
- UI workflow tests (Playwright)
- Real Excel files from `user_data/` directory

### Fixtures
- Small test workbooks in `src/ingestion/__fixtures__/`
- Mock `RawWorkbook` objects for unit tests

---

## Code Quality Standards

### Non-Negotiable Rules

1. **No `any` types**: Use explicit types or `unknown`
2. **No `else`**: Use guard clauses and early returns
3. **Max 2 nesting levels**: Extract helper functions
4. **Small functions**: ≤30-40 lines
5. **TypeScript strict mode**: All strict flags enabled

### Examples

```typescript
// ✅ GOOD
function processSheet(sheet: RawSheet | null): SheetProfile | null {
  if (sheet === null) {
    return null
  }

  if (sheet.rows.length === 0) {
    return null
  }

  return profileSheet(sheet)
}

// ❌ BAD
function processSheet(sheet: any) {
  if (sheet) {
    if (sheet.rows && sheet.rows.length > 0) {
      return profileSheet(sheet)
    } else {
      return null
    }
  } else {
    return null
  }
}
```

---

## Rollout Plan

### Phase 1: Agent 1 Core (Week 1)
- Merge Agent 1 branch to `main`
- Run full test suite
- Deploy to dev environment

### Phase 2: Agent 2 Performance (Week 2)
- Merge Agent 2 branch to `main`
- Performance benchmarks
- Deploy to dev

### Phase 3: Agent 3 UI (Week 2-3)
- Merge Agent 3 branch to `main`
- UI review with Dale
- Deploy to staging

### Phase 4: Production (Week 3)
- Final integration tests
- Performance validation
- Deploy to production
- Monitor for issues

---

## Success Metrics

### Functional
- ✅ Process any Excel file without hardcoded templates
- ✅ 80%+ columns mapped automatically (HIGH confidence)
- ✅ User overrides persist and apply correctly

### Performance
- ✅ 10 files (<100MB) load in <5 seconds
- ✅ Cache reduces re-parse time by 90%
- ✅ Large files (>10MB) stream without browser freeze

### Quality
- ✅ Zero `any` types
- ✅ >85% test coverage
- ✅ All TypeScript strict mode checks pass

### UX
- ✅ Dale can inspect all mappings
- ✅ Dale can override with 2 clicks
- ✅ Ingestion report clear and actionable

---

## Appendix: File Checklist

### Agent 1 Files
- [ ] `src/ingestion/core/rawTypes.ts`
- [ ] `src/ingestion/core/profileTypes.ts`
- [ ] `src/ingestion/core/ingestionTypes.ts`
- [ ] `src/ingestion/profiling/FieldRegistry.ts`
- [ ] `src/ingestion/profiling/defaultFields.ts`
- [ ] `src/ingestion/profiling/ColumnProfiler.ts`
- [ ] `src/ingestion/profiling/SheetProfiler.ts`
- [ ] `src/ingestion/profiling/FieldMatcher.ts`
- [ ] `src/ingestion/profiling/SemanticAnalyzer.ts`
- [ ] `src/ingestion/workbookLoader.ts` (modified)
- [ ] `src/ingestion/excelIngestionOrchestrator.ts` (modified)

### Agent 2 Files
- [ ] `src/ingestion/performance/WorkbookCache.ts`
- [ ] `src/ingestion/performance/CacheTypes.ts`
- [ ] `src/ingestion/performance/ParallelIngestionEngine.ts`
- [ ] `src/ingestion/performance/StreamingLoader.ts`
- [ ] `src/ingestion/performance/PerformanceTracker.ts`
- [ ] `src/ingestion/performance/WorkerPool.ts` (optional)

### Agent 3 Files
- [ ] `src/ingestion/overrides/OverrideStore.ts`
- [ ] `src/ingestion/overrides/OverrideTypes.ts`
- [ ] `src/ingestion/ai/EmbeddingMatcher.ts`
- [ ] `src/ingestion/ai/AITypes.ts`
- [ ] `src/ui/components/SchemaExplorer/SheetProfileView.tsx`
- [ ] `src/ui/components/SchemaExplorer/ColumnMappingTable.tsx`
- [ ] `src/ui/components/SchemaExplorer/OverrideEditor.tsx`
- [ ] `src/ui/components/IngestionReport/IngestionSummary.tsx`
- [ ] `src/ui/components/IngestionReport/IssueList.tsx`
- [ ] `src/ui/components/IngestionReport/MetricsPanel.tsx`
- [ ] `src/ingestion/profiling/FieldMatcher.ts` (modified)
- [ ] `src/app/routes/DataLoaderPage.tsx` (modified)

---

**Document Status**: Ready for Agent Assignment
**Total Estimated Time**: 14-18 days (with 3 parallel agents)
**Risk Level**: LOW-MEDIUM (clear tasks, well-scoped)
