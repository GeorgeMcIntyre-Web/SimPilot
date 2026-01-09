# SimPilot Roadmap: Excel Exit Strategy

## Vision

Transform SimPilot from an Excel-dependent tool into a self-contained simulation management platform where Excel is optional for legacy imports only.

## Guiding Principles

1. **Excel unchanged**: Tolerate input noise; do not require users to fix Excel formatting
2. **UID-backed identity**: UIDs are stable; derived keys are human-readable labels
3. **No silent guessing**: Ambiguity requires explicit user decisions
4. **Plant-scoped by default**: Multi-plant awareness built into every layer
5. **Each phase ships value**: Every phase is independently useful and shippable

---

## Phase 0: Excel-Tolerant Ingestion

### Objective
Make SimPilot resilient to Excel inconsistencies while building foundation for Excel independence.

### Deliverables

**Identity & Linking System:**
- UID generation for Stations, Tools, Robots (stable, plant-scoped)
- Canonical key derivation from Excel columns (deterministic, multi-strategy)
- Alias rule system (user-confirmed fromKey → UID mappings)
- UID resolver (applies aliases, exact matches, creates new)

**Import Diff Engine:**
- Compute creates/updates/deletes/renames between imports
- Detect ambiguities (multiple candidates, missing refs, unknown plant)
- Store DiffResult per ImportRun for audit/replay

**Import Review UI:**
- Import History page (list all imports, status, counts)
- Diff viewer (show creates/updates/deletes/renames/ambiguities)
- Warning display with actionable messages
- Unlinked/ambiguous entity report

**Persistence & Migrations:**
- Schema v3 with UID collections (stationRecords, toolRecords, robotRecords, aliasRules, importRuns, diffResults)
- IndexedDB persistence with migration from v2 → v3
- Snapshot save/load with backward compatibility

**Multi-Plant Support:**
- PlantKey detection (filename, metadata, user selection)
- PLANT_UNKNOWN sentinel with warnings
- Plant-scoped keys and alias rules

### Definition of Done

- [ ] Import produces DiffResult showing all creates/updates/deletes/renames
- [ ] Ambiguities visible with candidate suggestions (not auto-resolved)
- [ ] Plant key unknown triggers warning (not error)
- [ ] Alias rules persist and auto-apply on next import
- [ ] Import History shows status: clean / needs resolution
- [ ] Re-import unchanged Excel → diff shows all noChange
- [ ] Unlinked entities report shows tools/robots without valid station references
- [ ] Schema v3 snapshots save/load successfully
- [ ] Demo flow: upload → view diff → see warnings → verify persistence → re-upload clean

### Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Alias rules grow unbounded | Audit trail shows when/why; periodic review in Registry (Phase 1) |
| Users confused by ambiguity warnings | Clear UX: "Station ST020 not found. Did you mean ST002?" with click-to-resolve |
| Plant key detection fails silently | Explicit warnings; user can override via dropdown |
| Import history storage bloat | Retain last 50 imports; summarize older |

---

## Phase 1: Registry as Source of Truth

### Objective
Shift entity management from Excel to SimPilot Registry; Excel becomes input-only.

### Deliverables

**Registry Data Model:**
- Extend StationRecord/ToolRecord/RobotRecord with label overrides, manual edits
- Audit log (who/when/what/why for all registry changes)
- Last-seen tracking (which ImportRun last referenced this entity)

**Registry UI:**
- Stations/Tools/Robots tabs with UID, key, labels, status, plant
- Search/filter by key, label, plant, status
- Canonical ID display (PlantA-abc12345-ST010) with copy-to-clipboard
- Show inactive toggle

**Registry Actions:**
- Activate/Inactivate (soft delete with audit)
- Add alias rule manually (fromKey → uid with reason)
- Label override (in-app rename without Excel edit)
- View audit trail per entity

**Import Integration:**
- Import diff compares against Registry (not just previous import)
- Warnings if Excel references inactive entity
- Auto-suggestions for reactivation ("Tool GUN10 was inactivated 2024-11-03. Reactivate?")

**Audit Trail:**
- Record every registry change (activate, deactivate, alias add, label override)
- UI: filterable log per entity or global timeline
- Schema: `auditLog: AuditEntry[]` in store

### Definition of Done

- [ ] Registry UI shows all Stations/Tools with UID, key, labels, status, plantKey
- [ ] User can activate/inactivate entities → status persists
- [ ] User can add alias rule → next import auto-applies it
- [ ] User can override label → canonical display updates
- [ ] Import warns if Excel references inactive entity
- [ ] Registry search/filter works by key, label, plant, status
- [ ] Audit trail shows all registry changes with timestamp/user/reason
- [ ] Canonical ID copyable for use in emails/notes
- [ ] Demo flow: import → registry shows entities → deactivate station → re-import warns → reactivate → clean

### Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Registry edits conflict with Excel | Import shows warning: "Registry says X, Excel says Y—resolve" |
| Registry cluttered with test data | Bulk "inactivate unused" based on last-seen timestamp |
| Multi-plant label conflicts | Labels always plant-scoped; UI shows plant context clearly |
| Audit log bloat | Retain 1 year full detail, summarize older; export for archival |

---

## Phase 2: In-App Change Control

### Objective
Enable planning → as-built transitions, renumbering, moves, splits, merges with full lineage tracking.

### Deliverables

**Full CRUD for Entities:**
- Create station/tool/robot in-app (no Excel required)
- Edit: rename, move to different area, update specs
- Delete: soft delete with confirmation, reason required
- Permissions: role-based (viewer/editor/admin)

**Lineage Tracking:**
- Renumber: ST010 → ST001 creates alias + audit entry
- Move: Station from Area A → Area B preserves UID, updates key
- Split: One station → two stations links via `derivedFrom`
- Merge: Two stations → one marks others inactive, links via `mergedInto`

**Audit Trail Enhancements:**
- Tag entries: "planning" / "as-built" / "commissioning"
- UI filter: "Show planning keys" overlays old keys
- Export audit trail to Excel for compliance

**Excel Export:**
- Generate Tool List, Assemblies from Registry (not from Excel)
- Match original Excel format for legacy systems
- Include all plant-specific columns

**Excel Import (Legacy Mode):**
- Warn: "SimPilot is now source of truth. Import will overwrite local changes."
- Diff shows conflicts: Registry vs. Excel
- User resolves per-entity: keep Registry / take Excel / merge

### Definition of Done

- [ ] Create station in-app → appears in Registry with UID
- [ ] Renumber station ST010 → ST001 → audit shows old/new + reason
- [ ] Move station to different area → UID unchanged, key updated
- [ ] Split station → new station links to original via `derivedFrom`
- [ ] Audit trail filterable by tag (planning/as-built)
- [ ] Excel export generates Tool List matching original format
- [ ] Excel import (legacy) shows conflicts, user resolves
- [ ] Permissions: editor can edit, viewer cannot
- [ ] Demo flow: create station → renumber → export Excel → compare with original

### Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| User error (accidental delete) | Soft delete + undo within session; restore from audit |
| Excel export format drift | Regression tests compare exported Excel vs. golden snapshots |
| Planning vs. as-built confusion | Audit tags + UI filter; clear visual distinction |
| Permissions bypass | Server-side validation (if applicable); audit all changes |

---

## Phase 3: Replace Excel

### Objective
Provide native editors, templates, and guided entry to eliminate Excel from day-to-day workflow.

### Deliverables

**Project Templates:**
- CRUD for ProjectTemplate (name, description, included entities)
- Templates: "BEV Body Shop", "ICE Paint Shop", etc.
- Template instantiation: copy entities, generate UIDs
- Template versioning: projects pin to version, opt-in updates

**Guided Entry Wizards:**
- "Add Station" wizard: suggests next key, area based on layout
- "Add Tool" wizard: pre-filled specs for known tool types
- Smart defaults: auto-increment station numbers, area autocomplete

**Native Editors:**
- Inline editing in Registry (click to edit label, key, specs)
- Bulk operations: "Duplicate to Plant B", "Inactivate all in Area C"
- Copy/paste between plants with UID re-generation

**Validation & Constraints:**
- Enforce unique keys per plant
- Validate station-tool-robot relationships
- Warn on orphaned tools (station inactive)

**Excel Import Relegated:**
- Moved to "Advanced" section in UI
- Warning: "Template-based entry recommended. Import only if necessary."

### Definition of Done

- [ ] Create project template with stations/tools → save/load works
- [ ] "New Project from Template" wizard copies entities, generates UIDs
- [ ] Guided station entry suggests next key (ST021 after ST020)
- [ ] Tool type autocomplete from known specs
- [ ] Inline edit in Registry (label, key) → persists
- [ ] Bulk "Duplicate to Plant B" → new UIDs, links via `derivedFrom`
- [ ] Validation prevents duplicate keys per plant
- [ ] Excel import in "Advanced" section with warning
- [ ] Demo flow: choose template → tweak stations → add tools → start simulation

### Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Templates too rigid | Allow full customization after instantiation |
| Template versioning complexity | Simple pinning; opt-in updates with diff preview |
| Users skip templates, still use Excel | Analytics + onboarding nudge: "90% faster with templates" |
| Validation too strict, blocks real work | Override with reason (audited); review constraints quarterly |

---

## Phase 4: Deprecate Excel Imports

### Objective
Remove Excel from critical path; preserve as admin-only legacy feature.

### Deliverables

**Feature Flag:**
- `ENABLE_EXCEL_LEGACY` flag (default: false)
- Only admins see "Import Excel" button
- Code moved to `src/legacy/excel/` namespace

**Default Workflow:**
- New project → Choose template or start blank → Add/edit in Registry → Simulate
- No Excel in critical path

**Documentation & Training:**
- Update all docs: "Excel no longer required"
- Training materials: in-app tutorials replace Excel-based onboarding
- Migration guide for existing Excel users

**Deprecation Timeline:**
- Phase 4 launch: Excel available but hidden
- 6 months: Monitor usage (<5% threshold)
- 1 year: Full removal (code archived in git)

### Definition of Done

- [ ] Excel import/export behind `ENABLE_EXCEL_LEGACY` flag
- [ ] Admin UI to toggle flag per project or globally
- [ ] Documentation updated: "Excel no longer required" guide
- [ ] Training: in-app tutorials (no Excel references)
- [ ] Analytics: <5% of users enable Excel flag
- [ ] Code cleanup: Excel code in `src/legacy/`, marked deprecated
- [ ] External partner export still works (one-way)

### Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| External partners still send Excel | Export feature remains; warn: "SimPilot accepts direct entry now" |
| Regulatory requirement for Excel | Export generates compliant Excel; import deprecated but code preserved |
| Power users prefer Excel | Survey why; add missing features to Registry/editing |
| Premature removal breaks workflows | Monitor analytics; extend deprecation if needed |

---

## Cross-Cutting Concerns

### Multi-Plant Carryover
**Challenge:** User copies Station 10 from Plant A to Plant B; must get new UID but preserve lineage.

**Solution (Phase 2+):**
- "Duplicate to Plant" action creates new UID
- Links via `derivedFrom` field
- Audit trail: "Copied from PlantA-ST010-v2"
- UID stable within each plant

### Planning → As-Built Renumbering
**Challenge:** Planning uses ST010-ST050; as-built renumbers to ST001-ST041.

**Solution (Phase 2+):**
- Audit trail tags: "planning" vs. "as-built"
- UI toggle: "Show planning keys" overlays old keys
- UID unchanged; currentKey updated; alias rule auto-created

### Backward Compatibility
**Challenge:** Existing projects have IndexedDB snapshots; schema changes break them.

**Solution (All phases):**
- Schema versioning: migrations for IndexedDB
- Feature flags for breaking changes
- Test harness: golden snapshots from each schema version

### Testing Strategy
- **Unit tests:** Alias resolution, canonical key derivation, diff engine
- **Integration tests:** Import → resolve → diff → persist → reload
- **Playwright (E2E):** Full user flow: upload Excel → resolve ambiguities → view Registry → edit → re-import clean
- **Regression:** Excel exports match golden snapshots

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 0 | % imports with zero warnings | >80% |
| Phase 0 | Avg time to resolve ambiguities | <2 min |
| Phase 1 | % users who edit Registry vs. Excel | >50% |
| Phase 1 | % imports that auto-resolve via Registry | >90% |
| Phase 2 | % new stations created in-app vs. Excel | >70% |
| Phase 2 | Audit trail entries per project | >100 |
| Phase 3 | % new projects using templates | >60% |
| Phase 3 | % projects with zero Excel imports | >40% |
| Phase 4 | % users enabling Excel flag | <5% |
| Phase 4 | User satisfaction with in-app workflow | >4.5/5 |

---

## Dependencies Between Phases

```
Phase 0 (Foundation)
  ├─ UID/key/alias system MUST be stable
  ├─ DiffEngine MUST detect all change types
  └─ Import History MUST show warnings clearly
      │
      ▼
Phase 1 (Registry)
  ├─ Depends on: Phase 0 UID collections
  ├─ Adds: Audit trail, label overrides, manual alias
  └─ Enables: In-app entity management without Excel
      │
      ▼
Phase 2 (Change Control)
  ├─ Depends on: Phase 1 Registry + audit
  ├─ Adds: Full CRUD, lineage, permissions, Excel export
  └─ Enables: Planning → as-built transitions
      │
      ▼
Phase 3 (Replace Excel)
  ├─ Depends on: Phase 2 full CRUD
  ├─ Adds: Templates, wizards, native editors
  └─ Enables: Excel-free new projects
      │
      ▼
Phase 4 (Deprecate Excel)
  ├─ Depends on: Phase 3 template adoption
  ├─ Adds: Feature flag, admin-only
  └─ Enables: Excel removal after monitoring
```

---

## Current Status

**Completed:**
- ✅ Phase 0 infrastructure: UID types, canonical key derivation, UID resolver, diff engine
- ✅ Phase 0 persistence: Schema v3, diffResults storage
- ✅ Phase 0 UI: Import History page with diff viewer
- ✅ Phase 1 foundation: Registry UI with Stations/Tools tabs, activate/deactivate, add alias
- ✅ Canonical ID display (`PlantA-abc12345-ST010`)

**In Progress:**
- 🚧 Phase 0 completion: Ambiguity resolution UI, unlinked report, unit tests
- 🚧 Phase 1 completion: Audit trail, label overrides, last-seen tracking

**Next:**
- Phase 0 stabilization: E2E tests, real-world data validation
- Phase 1 full delivery: Complete audit trail, import-registry integration
- Phase 2 planning: CRUD design, lineage schema, permissions model

---

**Last Updated:** 2026-01-07
**Maintained By:** George (architecture) + Edwin (UI/E2E)
