# Universal Schema-Agnostic Excel Ingestion Architecture

**Status**: Design Document
**Version**: 1.0
**Date**: December 2, 2025
**Author**: Integration Architect (Claude Code)

---

## Executive Summary

This document defines the **target architecture** for evolving SimPilot's Excel ingestion from "domain-specific parsers" to a **truly universal, schema-agnostic processing pipeline** that can handle any Excel file structure while maintaining strong domain semantics.

### Key Design Goals

1. **Schema-Agnostic**: Process Excel files without hardcoded templates
2. **Semantic-Aware**: Map arbitrary columns to canonical domain fields
3. **Performance-First**: Handle large files (10k+ rows) and multi-file ingestion
4. **Provenance-Tracked**: Every value knows its source (file, sheet, row, column)
5. **Confidence-Based**: All mappings include match quality scores
6. **Extensible**: Hooks for AI/embedding-based semantic matching
7. **User-Friendly**: Dale can inspect, override, and improve mappings

---

## Current Architecture Analysis

### What Exists Today

SimPilot has a **solid foundation** built in Phases 0-3:

#### Layer 1: Raw File Loading
- **[workbookLoader.ts](../src/ingestion/workbookLoader.ts)**: Reads `.xlsx`/`.xls`, normalizes cells, detects headers
- **[excelUtils.ts](../src/ingestion/excelUtils.ts)**: Low-level SheetJS utilities
- **Output**: `NormalizedWorkbook`, `NormalizedSheet`, `AnalyzedSheet`

#### Layer 2: Semantic Detection
- **[sheetSniffer.ts](../src/ingestion/sheetSniffer.ts)**: Category detection via keyword scoring
  - Strong/weak keyword matching
  - Score-based sheet classification
  - Categories: `SIMULATION_STATUS`, `ROBOT_SPECS`, `REUSE_WELD_GUNS`, etc.
- **[columnRoleDetector.ts](../src/ingestion/columnRoleDetector.ts)**: Column semantic role detection
  - Pattern-based header matching
  - Preserves real-world typos (`"refresment ok"`, `"proyect"`)
  - Confidence levels: `HIGH`, `MEDIUM`, `LOW`
  - Roles: `ROBOT_ID`, `STATION`, `GUN_FORCE`, etc.
- **[schemaExplorer.ts](../src/ingestion/schemaExplorer.ts)**: UI-friendly exploration interface

#### Layer 3: Domain Projection
- **[excelIngestionOrchestrator.ts](../src/ingestion/excelIngestionOrchestrator.ts)**: Multi-file coordination
- **[excelIngestionTypes.ts](../src/ingestion/excelIngestionTypes.ts)**: Domain types
  - `ExcelIngestedAsset`, `SourceWorkbookId`, `DetailedAssetKind`
  - `ReuseAllocationStatus`: `AVAILABLE`, `ALLOCATED`, `IN_USE`
- **Specialized Parsers**:
  - `reuseListRisersParser.ts`
  - `reuseListTipDressersParser.ts`
  - `reuseListTMSWGParser.ts`
  - `robotListParser.ts`
  - `simulationStatusParser.ts`

#### Cross-Cutting
- **Type Safety**: Zero `any` types, full TypeScript strictness
- **Testing**: 20+ unit/integration tests
- **Documentation**: Phase completion docs

### Current Limitations

1. **Hardcoded Sheet Categories**: `SheetCategory` enum limits to known types
2. **Manual Parser Routing**: Requires explicit parser selection per file type
3. **Static Column Patterns**: Adding new patterns requires code changes
4. **No Central Field Registry**: Domain fields scattered across parsers
5. **Limited Performance**: Sequential file loading, no caching, no streaming
6. **No AI Hooks**: No embeddings or LLM-based mapping support
7. **Basic Override System**: Config-based but not user-friendly

---

## Target Architecture: 3-Layer Universal Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                   EXCEL FILE (any structure)                     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   LAYER 1: RAW DATA    │
                    │  (Format-Agnostic I/O)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  LAYER 2: PROFILING    │
                    │  (Schema-Agnostic       │
                    │   Semantic Analysis)    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ LAYER 3: PROJECTION    │
                    │  (Domain-Specific       │
                    │   Type Mapping)         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  UnifiedAsset[]         │
                    │  IngestionResult        │
                    └─────────────────────────┘
```

---

## Layer 1: Raw Workbook Layer (Format-Agnostic I/O)

### Responsibility
Read Excel files into a **neutral, library-agnostic in-memory representation**.

### Core Types

```typescript
/**
 * Raw workbook - completely library-agnostic
 */
interface RawWorkbook {
  workbookId: string           // Stable UUID for this parse session
  fileName: string
  fileHash: string             // SHA-256 for caching
  fileSizeBytes: number
  parsedAt: Date
  parserLibrary: 'xlsx' | 'exceljs'  // Which library was used
  sheets: RawSheet[]
}

/**
 * Raw sheet - minimal structure
 */
interface RawSheet {
  sheetId: string              // workbookId:sheetName
  sheetName: string
  sheetIndex: number           // 0-based position in workbook
  rowCount: number
  columnCount: number
  rows: RawRow[]
}

/**
 * Raw row - just cells
 */
interface RawRow {
  rowIndex: number             // 0-based
  cells: RawCell[]
}

/**
 * Raw cell - with full provenance
 */
interface RawCell {
  columnIndex: number          // 0-based
  value: string | number | boolean | null
  formulaText?: string         // If cell contains formula
  hyperlink?: string           // If cell is a link
  styleInfo?: CellStyleInfo    // For future use
}

/**
 * Cell style metadata (optional, for future use)
 */
interface CellStyleInfo {
  isBold?: boolean
  isItalic?: boolean
  backgroundColor?: string
  textColor?: string
}
```

### Implementation Strategy

**Current State**: `workbookLoader.ts` already does this well, just needs type alignment.

**Changes Required**:
1. Add `fileHash` computation (SHA-256 of file buffer)
2. Add `workbookId` (UUID) generation
3. Add `parserLibrary` tracking
4. Wrap `NormalizedWorkbook` → `RawWorkbook` adapter
5. Add `RawCell` type with full provenance

**Files to Modify**:
- `workbookLoader.ts` - Add new types, keep existing logic
- Create `rawTypes.ts` - Central location for Layer 1 types

**Performance Considerations**:
- Hash computation: Use Web Crypto API (fast, native)
- Memory: RawWorkbook should be serializable for caching
- Streaming: Add optional streaming mode for files >10MB

---

## Layer 2: Profiling & Semantic Analysis (Schema-Agnostic)

### Responsibility
Turn raw sheets into **meaningful candidate structures** without hardcoded schemas.

### Architecture

```
RawWorkbook
    │
    ├─► SheetProfiler ──► SheetProfile
    │                       ├─ categoryCandidates: SheetCategoryScore[]
    │                       ├─ qualityScore: number
    │                       └─ columns: ColumnProfile[]
    │
    ├─► ColumnProfiler ──► ColumnProfile (per column)
    │                       ├─ dataTypes: TypeDistribution
    │                       ├─ sampleValues: string[]
    │                       ├─ distinctCount: number
    │                       └─ headerTokens: string[]
    │
    └─► FieldMatcher ──────► SemanticColumn (per column)
                              ├─ rawIndex: number
                              ├─ header: string
                              └─ matches: FieldMatch[]
                                  ├─ fieldId: FieldId
                                  ├─ score: number
                                  ├─ confidence: MatchConfidence
                                  └─ reasons: MatchReason[]
```

### Core Types

#### SheetProfile

```typescript
/**
 * Statistical + semantic profile of a sheet
 */
interface SheetProfile {
  sheetId: string

  // Category candidates (from SheetSniffer)
  categoryCandidates: SheetCategoryScore[]

  // Data quality metrics
  qualityScore: number           // 0-1, based on emptiness, structure
  estimatedHeaderRow: number | null
  estimatedDataRowCount: number

  // Column-level profiles
  columns: ColumnProfile[]

  // Performance metadata
  profiledAt: Date
  profilingTimeMs: number
}

/**
 * Sheet category match with score
 */
interface SheetCategoryScore {
  category: SheetCategory | string  // Allow custom categories
  score: number                      // 0-100
  strongMatches: string[]
  weakMatches: string[]
  confidence: MatchConfidence
}
```

#### ColumnProfile

```typescript
/**
 * Statistical profile of a single column
 */
interface ColumnProfile {
  columnIndex: number
  headerText: string

  // Type analysis
  dataTypes: TypeDistribution
  inferredType: 'string' | 'number' | 'boolean' | 'date' | 'mixed'

  // Content analysis
  nullCount: number
  distinctCount: number
  sampleValues: (string | number | null)[]  // First 10 non-null

  // Text analysis (for header)
  headerTokens: string[]         // ['robot', 'number']
  headerNormalized: string       // 'robotnumber'

  // Statistical patterns
  minValue?: number
  maxValue?: number
  avgValue?: number
  regexPatterns: RegexMatch[]    // Detected patterns (IDs, codes, etc.)
}

/**
 * Type distribution in a column
 */
interface TypeDistribution {
  stringCount: number
  numberCount: number
  booleanCount: number
  nullCount: number
  totalCount: number
}

/**
 * Regex pattern match
 */
interface RegexMatch {
  pattern: string                // e.g., /^[A-Z]{2}\d{3}$/
  matchCount: number
  description: string            // e.g., 'Station code (2 letters + 3 digits)'
}
```

#### FieldRegistry

```typescript
/**
 * Central registry of ALL canonical fields in SimPilot
 */
interface FieldRegistry {
  fields: Map<FieldId, FieldDescriptor>

  // Query methods
  findByName(name: string): FieldDescriptor | null
  findBySynonym(synonym: string): FieldDescriptor[]
  findByType(type: FieldDataType): FieldDescriptor[]
}

/**
 * Unique identifier for a canonical field
 */
type FieldId =
  // Identity fields
  | 'robot_id'
  | 'robot_number'
  | 'gun_id'
  | 'gun_number'
  | 'tool_id'
  | 'device_name'
  | 'serial_number'
  // Location fields
  | 'area_id'
  | 'area_name'
  | 'cell_id'
  | 'station_code'
  | 'station_number'
  | 'assembly_line'
  | 'zone'
  // Technical fields
  | 'gun_force_kn'
  | 'robot_payload_kg'
  | 'robot_reach_mm'
  | 'robot_type'
  | 'oem_model'
  // Status fields
  | 'simulation_status'
  | 'allocation_status'
  | 'sourcing_type'
  | 'project_code'
  // Personnel
  | 'engineer_name'
  | 'sim_leader'
  // Dates
  | 'due_date'
  | 'start_date'
  // ... extensible

/**
 * Complete descriptor for a canonical field
 */
interface FieldDescriptor {
  id: FieldId
  canonicalName: string          // 'Robot Number'
  description: string

  // Matching patterns
  synonyms: string[]             // ['robotnumber', 'robot id', 'robot #']
  regexPatterns: RegExp[]        // For value validation
  expectedType: FieldDataType

  // Validation
  allowedRange?: [number, number]
  allowedValues?: string[]       // For enums

  // Business context
  businessDomain: 'identity' | 'location' | 'technical' | 'status' | 'personnel' | 'dates'
  isRequired: boolean
  isUnique: boolean

  // Examples (for AI/embeddings)
  exampleHeaders: string[]       // Real-world examples from Excel files
  exampleValues: (string | number)[]
}

type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'enum'
```

#### FieldMatcher

```typescript
/**
 * Result of matching a column to canonical fields
 */
interface FieldMatch {
  fieldId: FieldId
  score: number                  // 0-100
  confidence: MatchConfidence    // HIGH/MEDIUM/LOW
  reasons: MatchReason[]

  // Optional: AI/embedding score (Layer 3)
  embeddingScore?: number
}

/**
 * Reason why a field matched
 */
interface MatchReason {
  type: 'header_exact' | 'header_contains' | 'synonym' | 'regex' | 'type_compatible' | 'embedding'
  score: number
  detail: string                 // Human-readable explanation
}

/**
 * Column with field matches
 */
interface SemanticColumn {
  columnIndex: number
  header: string
  profile: ColumnProfile

  // Field matches, sorted by score
  matches: FieldMatch[]
  bestMatch: FieldMatch | null   // Top-scoring match

  // Override support
  userOverride?: FieldId         // Manual mapping by user
}

/**
 * Complete semantic model of a sheet
 */
interface SheetSemanticModel {
  sheetId: string
  sheetProfile: SheetProfile

  // Sheet role (best category)
  sheetRole: SheetCategory | string
  sheetRoleConfidence: MatchConfidence

  // Column mappings
  columns: SemanticColumn[]

  // Summary stats
  mappingCoverage: number        // % of columns matched
  averageConfidence: number      // Average match confidence

  // Performance
  analyzedAt: Date
  analysisTimeMs: number
}
```

### Component Design

#### SheetProfiler

```typescript
/**
 * Computes statistical + semantic profile of a sheet
 */
class SheetProfiler {
  constructor(
    private sniffer: SheetSniffer,
    private columnProfiler: ColumnProfiler
  ) {}

  profile(sheet: RawSheet): SheetProfile {
    // 1. Detect categories using existing SheetSniffer
    const categoryCandidates = this.sniffer.detectCategories(sheet)

    // 2. Profile each column
    const columns = sheet.rows[0]?.cells.map((_, colIndex) =>
      this.columnProfiler.profileColumn(sheet, colIndex)
    ) ?? []

    // 3. Compute quality score
    const qualityScore = this.computeQualityScore(sheet, columns)

    // 4. Estimate header row
    const estimatedHeaderRow = this.estimateHeaderRow(sheet)

    return {
      sheetId: sheet.sheetId,
      categoryCandidates,
      qualityScore,
      estimatedHeaderRow,
      estimatedDataRowCount: sheet.rowCount - (estimatedHeaderRow ?? 0) - 1,
      columns,
      profiledAt: new Date(),
      profilingTimeMs: performance.now() - startTime
    }
  }

  private computeQualityScore(sheet: RawSheet, columns: ColumnProfile[]): number {
    // Factors: % non-null, % consistent types, structural regularity
    // Returns 0-1
  }

  private estimateHeaderRow(sheet: RawSheet): number | null {
    // Use existing detectHeaderRow logic
  }
}
```

#### ColumnProfiler

```typescript
/**
 * Computes statistical profile of a single column
 */
class ColumnProfiler {
  profileColumn(sheet: RawSheet, columnIndex: number): ColumnProfile {
    const headerText = this.extractHeader(sheet, columnIndex)
    const values = this.extractColumnValues(sheet, columnIndex)

    return {
      columnIndex,
      headerText,
      dataTypes: this.computeTypeDistribution(values),
      inferredType: this.inferType(values),
      nullCount: values.filter(v => v === null).length,
      distinctCount: new Set(values.filter(v => v !== null)).size,
      sampleValues: values.filter(v => v !== null).slice(0, 10),
      headerTokens: this.tokenizeHeader(headerText),
      headerNormalized: this.normalizeHeader(headerText),
      regexPatterns: this.detectPatterns(values),
      ...this.computeStats(values)
    }
  }

  private detectPatterns(values: (string | number | null)[]): RegexMatch[] {
    // Detect common patterns: station codes, robot IDs, part numbers, etc.
    const patterns = [
      { regex: /^[A-Z]{2}\d{3}$/, desc: 'Station code (2 letters + 3 digits)' },
      { regex: /^R\d{2}$/, desc: 'Robot ID (R + 2 digits)' },
      { regex: /^[A-Z]{2}-\d{3}-[A-Z]{2}$/, desc: 'Part number format' }
    ]

    return patterns
      .map(p => ({
        pattern: p.regex.source,
        matchCount: values.filter(v => typeof v === 'string' && p.regex.test(v)).length,
        description: p.desc
      }))
      .filter(m => m.matchCount > 0)
  }
}
```

#### FieldRegistry Implementation

```typescript
/**
 * Central registry - should be data-driven, not hardcoded
 */
class FieldRegistryImpl implements FieldRegistry {
  private fields = new Map<FieldId, FieldDescriptor>()

  constructor() {
    this.loadDefaultFields()
  }

  private loadDefaultFields(): void {
    // Example: Robot ID field
    this.registerField({
      id: 'robot_id',
      canonicalName: 'Robot ID',
      description: 'Unique identifier for a robot',
      synonyms: [
        'robotnumber',
        'robot number',
        'robot id',
        'robot name',
        'robot no',
        'robot #',
        'robot caption'
      ],
      regexPatterns: [
        /^R\d{2}$/,          // R01, R02, etc.
        /^[A-Z]{2}_R\d{2}$/  // BA_R01, etc.
      ],
      expectedType: 'string',
      businessDomain: 'identity',
      isRequired: true,
      isUnique: true,
      exampleHeaders: [
        'Robotnumber',
        'Robot caption',
        'ROBOT ID'
      ],
      exampleValues: [
        'R01', 'R02', 'BA_R01', 'BC_R02'
      ]
    })

    // ... register all other fields
  }

  registerField(descriptor: FieldDescriptor): void {
    this.fields.set(descriptor.id, descriptor)
  }

  findByName(name: string): FieldDescriptor | null {
    const normalized = this.normalizeText(name)

    for (const field of this.fields.values()) {
      if (this.normalizeText(field.canonicalName) === normalized) {
        return field
      }

      if (field.synonyms.some(syn => this.normalizeText(syn) === normalized)) {
        return field
      }
    }

    return null
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[\s_-]+/g, '')
  }
}
```

#### FieldMatcher

```typescript
/**
 * Matches columns to canonical fields
 */
class FieldMatcher {
  constructor(
    private registry: FieldRegistry,
    private embeddingMatcher?: EmbeddingMatcher  // Optional AI component
  ) {}

  matchColumn(column: ColumnProfile): SemanticColumn {
    const matches: FieldMatch[] = []

    // Try all fields in registry
    for (const [fieldId, descriptor] of this.registry.fields.entries()) {
      const match = this.scoreMatch(column, descriptor)

      if (match.score > 0) {
        matches.push(match)
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score)

    // Optional: Enhance with embedding scores
    if (this.embeddingMatcher !== undefined) {
      this.enhanceWithEmbeddings(column, matches)
    }

    return {
      columnIndex: column.columnIndex,
      header: column.headerText,
      profile: column,
      matches,
      bestMatch: matches.length > 0 ? matches[0] : null
    }
  }

  private scoreMatch(
    column: ColumnProfile,
    descriptor: FieldDescriptor
  ): FieldMatch {
    const reasons: MatchReason[] = []
    let totalScore = 0

    // 1. Header exact match (+50 points)
    if (column.headerNormalized === this.normalize(descriptor.canonicalName)) {
      reasons.push({
        type: 'header_exact',
        score: 50,
        detail: `Exact match: "${descriptor.canonicalName}"`
      })
      totalScore += 50
    }

    // 2. Synonym match (+30 points)
    for (const synonym of descriptor.synonyms) {
      if (column.headerNormalized === this.normalize(synonym)) {
        reasons.push({
          type: 'synonym',
          score: 30,
          detail: `Synonym match: "${synonym}"`
        })
        totalScore += 30
        break
      }
    }

    // 3. Header contains match (+15 points)
    if (column.headerNormalized.includes(this.normalize(descriptor.canonicalName))) {
      reasons.push({
        type: 'header_contains',
        score: 15,
        detail: `Header contains: "${descriptor.canonicalName}"`
      })
      totalScore += 15
    }

    // 4. Type compatibility (+20 points)
    if (this.isTypeCompatible(column.inferredType, descriptor.expectedType)) {
      reasons.push({
        type: 'type_compatible',
        score: 20,
        detail: `Type match: ${column.inferredType} → ${descriptor.expectedType}`
      })
      totalScore += 20
    }

    // 5. Regex pattern match (+25 points)
    for (const pattern of descriptor.regexPatterns) {
      const matchCount = column.sampleValues.filter(v =>
        typeof v === 'string' && pattern.test(v)
      ).length

      if (matchCount > 0) {
        const score = Math.min(25, matchCount * 5)
        reasons.push({
          type: 'regex',
          score,
          detail: `Value pattern match: ${matchCount}/${column.sampleValues.length}`
        })
        totalScore += score
        break
      }
    }

    // Determine confidence
    const confidence = this.scoreToConfidence(totalScore)

    return {
      fieldId: descriptor.id,
      score: Math.min(100, totalScore),
      confidence,
      reasons
    }
  }

  private scoreToConfidence(score: number): MatchConfidence {
    if (score >= 70) return 'HIGH'
    if (score >= 40) return 'MEDIUM'
    return 'LOW'
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim().replace(/[\s_-]+/g, '')
  }

  private isTypeCompatible(
    columnType: string,
    fieldType: FieldDataType
  ): boolean {
    // Simple compatibility check
    if (fieldType === 'string') return true  // Strings accept anything
    if (fieldType === 'number') return columnType === 'number'
    if (fieldType === 'boolean') return columnType === 'boolean'
    if (fieldType === 'date') return columnType === 'string' || columnType === 'number'
    return false
  }

  private enhanceWithEmbeddings(
    column: ColumnProfile,
    matches: FieldMatch[]
  ): void {
    // Optional: Use embeddings to boost/adjust scores
    // Agent 3 will implement this
  }
}
```

### Integration with Existing Code

**Current → Target Mapping**:

| Current Component | Target Component | Migration Strategy |
|------------------|------------------|-------------------|
| `sheetSniffer.ts` | `SheetProfiler` | Wrap existing logic, add quality scoring |
| `columnRoleDetector.ts` | `ColumnProfiler` + `FieldMatcher` | Split into profiling + matching |
| `ROLE_PATTERNS` | `FieldRegistry` | Convert to data-driven registry |
| `ColumnRole` enum | `FieldId` type | Expand to cover all domain fields |

**Backward Compatibility**:
- Keep existing types for Phase 4 migration
- Add adapters: `ColumnRole → FieldId`, `SheetCategory → SheetProfile`

---

## Layer 3: Domain Projection (Type Mapping)

### Responsibility
Map semantic models to **SimPilot's stable domain types** (`UnifiedAsset`, etc.)

### Core Types

```typescript
/**
 * Complete ingestion result for UI consumption
 */
interface IngestionResult {
  // Input metadata
  workbooks: RawWorkbook[]

  // Semantic analysis
  sheetModels: SheetSemanticModel[]

  // Domain projections
  assets: UnifiedAsset[]

  // Data quality
  issues: IngestionIssue[]
  warnings: IngestionWarning[]
  metrics: IngestionMetrics

  // Performance
  totalTimeMs: number
  stageTimes: Record<string, number>
}

/**
 * Data quality issue
 */
interface IngestionIssue {
  severity: 'error' | 'warning' | 'info'
  category: 'missing_field' | 'type_mismatch' | 'invalid_value' | 'duplicate' | 'orphan'
  message: string

  // Location
  workbookId: string
  sheetId: string
  rowIndex?: number
  columnIndex?: number

  // Actionable
  suggestedFix?: string
  canAutoFix: boolean
}

/**
 * Ingestion metrics for dashboard
 */
interface IngestionMetrics {
  totalSheets: number
  analyzedSheets: number
  skippedSheets: number

  totalColumns: number
  mappedColumns: number
  unmappedColumns: number
  mappingCoverage: number          // %

  totalRows: number
  validRows: number
  invalidRows: number

  averageConfidence: number
  lowConfidenceCount: number

  // Performance
  filesPerSecond: number
  rowsPerSecond: number
}
```

### Domain Projection Strategy

```typescript
/**
 * Projects semantic models onto domain types
 */
class DomainProjector {
  constructor(
    private registry: FieldRegistry
  ) {}

  project(model: SheetSemanticModel): UnifiedAsset[] {
    const assets: UnifiedAsset[] = []
    const issues: IngestionIssue[] = []

    // Determine projection strategy based on sheet role
    const strategy = this.selectStrategy(model.sheetRole)

    // Project each data row
    for (let rowIndex = 0; rowIndex < model.dataRows.length; rowIndex++) {
      const row = model.dataRows[rowIndex]

      try {
        const asset = strategy.projectRow(row, model, rowIndex)
        assets.push(asset)
      } catch (error) {
        issues.push({
          severity: 'error',
          category: 'type_mismatch',
          message: `Failed to project row ${rowIndex}: ${error.message}`,
          workbookId: model.workbookId,
          sheetId: model.sheetId,
          rowIndex,
          canAutoFix: false
        })
      }
    }

    return assets
  }

  private selectStrategy(role: string): ProjectionStrategy {
    // Route to appropriate strategy based on sheet role
    switch (role) {
      case 'SIMULATION_STATUS':
        return new SimulationStatusProjector(this.registry)
      case 'ROBOT_SPECS':
        return new RobotListProjector(this.registry)
      case 'REUSE_WELD_GUNS':
        return new ReuseGunProjector(this.registry)
      default:
        return new GenericAssetProjector(this.registry)
    }
  }
}

/**
 * Strategy interface for domain projection
 */
interface ProjectionStrategy {
  projectRow(
    row: RawRow,
    model: SheetSemanticModel,
    rowIndex: number
  ): UnifiedAsset
}
```

---

## Cross-Cutting Concerns

### 1. Provenance Tracking

**Every domain value must track its source**:

```typescript
/**
 * Provenance metadata for a value
 */
interface ValueProvenance {
  workbookId: string
  fileName: string
  sheetId: string
  sheetName: string
  rowIndex: number
  columnIndex: number
  originalValue: string | number | null
  transformedValue: string | number | null
  transformReason?: string
}

/**
 * Extended UnifiedAsset with provenance
 */
interface ProvenanceTrackedAsset extends UnifiedAsset {
  provenance: {
    [key: string]: ValueProvenance  // e.g., { 'robotId': {...}, 'station': {...} }
  }
}
```

### 2. Confidence Propagation

**Confidence flows through all layers**:

```
RawWorkbook (implicit: HIGH)
    │
    ▼
SheetProfile.categoryCandidates[].confidence
    │
    ▼
SemanticColumn.bestMatch.confidence
    │
    ▼
UnifiedAsset.metadata.confidence
```

### 3. Performance Optimizations

**Agent 2 will implement**:

```typescript
/**
 * Caching layer for parsed workbooks
 */
class WorkbookCache {
  private cache = new Map<string, CachedWorkbook>()

  async get(fileHash: string): Promise<RawWorkbook | null> {
    const cached = this.cache.get(fileHash)

    if (cached === undefined) {
      return null
    }

    // Check if still valid (file not changed)
    if (Date.now() - cached.cachedAt.getTime() > 3600000) {
      this.cache.delete(fileHash)
      return null
    }

    return cached.workbook
  }

  set(fileHash: string, workbook: RawWorkbook): void {
    this.cache.set(fileHash, {
      workbook,
      cachedAt: new Date()
    })
  }
}

/**
 * Parallel file loader
 */
class ParallelIngestionEngine {
  async ingestFiles(files: File[]): Promise<IngestionResult> {
    // Load all files in parallel
    const workbooks = await Promise.all(
      files.map(file => this.loadWorkbook(file))
    )

    // Profile all sheets in parallel
    const profiles = await Promise.all(
      workbooks.flatMap(wb => wb.sheets.map(s => this.profileSheet(s)))
    )

    // Project sequentially (or batch)
    const assets = profiles.flatMap(p => this.projectSheet(p))

    return { workbooks, profiles, assets, ... }
  }
}

/**
 * Streaming loader for large files
 */
class StreamingWorkbookLoader {
  async loadLarge(file: File): AsyncGenerator<RawSheet> {
    // Use ExcelJS streaming API
    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(file.stream())

    for await (const worksheet of workbook) {
      yield this.convertToRawSheet(worksheet)
    }
  }
}
```

### 4. User Override System

**Agent 3 will implement**:

```typescript
/**
 * User-defined mapping overrides
 */
interface MappingOverride {
  workbookPattern: string         // Glob pattern for file name
  sheetPattern: string            // Glob pattern for sheet name
  columnHeader: string            // Exact or regex
  fieldId: FieldId                // Target field
  reason: string                  // Why override was needed
  createdBy: string
  createdAt: Date
}

/**
 * Override persistence
 */
class OverrideStore {
  private overrides: MappingOverride[] = []

  async load(): Promise<void> {
    // Load from localStorage or API
  }

  async save(override: MappingOverride): Promise<void> {
    this.overrides.push(override)
    // Persist to localStorage or API
  }

  findOverride(
    fileName: string,
    sheetName: string,
    columnHeader: string
  ): MappingOverride | null {
    // Pattern matching logic
  }
}
```

---

## File Structure

### New Files to Create

```
src/ingestion/
  ├── core/
  │   ├── rawTypes.ts                    # Layer 1 types
  │   ├── profileTypes.ts                # Layer 2 types
  │   ├── projectionTypes.ts             # Layer 3 types
  │   └── ingestionTypes.ts              # Result types
  │
  ├── profiling/
  │   ├── SheetProfiler.ts               # Sheet-level profiling
  │   ├── ColumnProfiler.ts              # Column-level profiling
  │   ├── FieldRegistry.ts               # Central field registry
  │   ├── FieldMatcher.ts                # Column → Field matching
  │   └── defaultFields.ts               # Default field definitions
  │
  ├── projection/
  │   ├── DomainProjector.ts             # Main projection orchestrator
  │   ├── ProjectionStrategy.ts          # Strategy interface
  │   ├── strategies/
  │   │   ├── SimulationStatusProjector.ts
  │   │   ├── RobotListProjector.ts
  │   │   ├── ReuseGunProjector.ts
  │   │   └── GenericAssetProjector.ts
  │   └── validators/
  │       └── AssetValidator.ts
  │
  ├── performance/
  │   ├── WorkbookCache.ts               # Caching layer
  │   ├── ParallelIngestionEngine.ts     # Multi-file parallel loading
  │   └── StreamingLoader.ts             # Large file streaming
  │
  ├── overrides/
  │   ├── OverrideStore.ts               # User override persistence
  │   └── OverrideTypes.ts               # Override types
  │
  └── ai/
      ├── EmbeddingMatcher.ts            # Optional AI matching (Agent 3)
      └── AITypes.ts                     # AI-related types

src/ui/
  └── components/
      ├── SchemaExplorer/
      │   ├── SheetProfileView.tsx       # Enhanced sheet view
      │   ├── ColumnMappingTable.tsx     # Column → Field mapping UI
      │   └── OverrideEditor.tsx         # Override creation UI
      └── IngestionReport/
          ├── IngestionSummary.tsx       # Summary dashboard
          ├── IssueList.tsx              # Issues + warnings
          └── MetricsPanel.tsx           # Performance metrics
```

### Modified Files

```
src/ingestion/
  ├── workbookLoader.ts                  # Add RawWorkbook adapter
  ├── sheetSniffer.ts                    # Integrate with SheetProfiler
  ├── columnRoleDetector.ts              # Integrate with FieldMatcher
  ├── excelIngestionOrchestrator.ts      # Use new pipeline
  └── excelIngestionTypes.ts             # Add provenance types
```

---

## Migration Plan

### Phase 1: Foundation (Week 1)
- Create Layer 1 types (`rawTypes.ts`)
- Add `RawWorkbook` adapter to `workbookLoader.ts`
- Create `FieldRegistry` with default fields
- **Tests**: Unit tests for type conversions

### Phase 2: Profiling (Week 1-2)
- Implement `SheetProfiler` (wraps `sheetSniffer`)
- Implement `ColumnProfiler` (wraps `columnRoleDetector`)
- Implement `FieldMatcher`
- **Tests**: Profile/match accuracy tests

### Phase 3: Projection (Week 2)
- Implement `DomainProjector` with strategies
- Migrate existing parsers to strategy pattern
- Add validation + issue detection
- **Tests**: End-to-end projection tests

### Phase 4: Performance (Week 3)
- Implement `WorkbookCache`
- Implement `ParallelIngestionEngine`
- Add streaming support
- **Tests**: Performance benchmarks

### Phase 5: UX + AI (Week 3-4)
- Implement `OverrideStore`
- Build UI components for mapping review
- Add embedding hooks (optional)
- **Tests**: Integration tests

---

## Open Questions & Assumptions

### Questions for Dale (Simulation Manager)

1. **Field Priority**: Which 20-30 fields are most critical to map correctly?
2. **Override Frequency**: How often do you expect to override mappings?
3. **File Volume**: How many files do you typically process in one session?
4. **Performance Target**: What's acceptable load time for 10 files (~100MB)?
5. **AI Appetite**: Would you use AI-assisted mapping if it were optional?

### Assumptions

1. **SheetJS is OK for now**: Can migrate to ExcelJS later if needed
2. **Browser-only**: No server-side processing required
3. **Offline-first**: All processing happens client-side
4. **English headers**: No i18n requirements yet
5. **Excel 2007+**: No need to support older formats

---

## Success Criteria

### Functional
- ✅ Process any Excel file without hardcoded templates
- ✅ Map 80%+ of columns automatically (HIGH confidence)
- ✅ Flag remaining 20% for user review
- ✅ Support user overrides with persistence
- ✅ Maintain full provenance for all values

### Performance
- ✅ Load 10 files (<100MB total) in <5 seconds
- ✅ Cache parsed workbooks (no re-parse if unchanged)
- ✅ Stream files >10MB without browser freeze

### Quality
- ✅ Zero `any` types
- ✅ 90%+ test coverage for core logic
- ✅ All layers have unit + integration tests
- ✅ Backward compatible with Phase 0-3 types

### UX
- ✅ Dale can see mapping confidence for every column
- ✅ Dale can override mappings with 2 clicks
- ✅ Ingestion report shows issues + suggestions
- ✅ Performance metrics visible in dev mode

---

## Next Steps

1. **Review this design** with the team
2. **Create skeleton files** with TODOs for each layer
3. **Define Agent 1/2/3 tasks** in `EXCEL_INGESTION_AGENT_PLAN.md`
4. **Set up test fixtures** for all file types
5. **Begin Phase 1 migration** (Foundation)

---

**Document Status**: Ready for Review
**Estimated Implementation**: 3-4 weeks with 3 parallel agents
**Risk Level**: LOW (builds on proven Phase 0-3 foundation)
