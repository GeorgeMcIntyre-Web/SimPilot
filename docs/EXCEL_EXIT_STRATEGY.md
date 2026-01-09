# Excel Exit Strategy: Phased Migration Plan

## Executive Summary

**Goal**: Transition users from Excel-driven workflows to SimPilot as the source of truth for simulation project data.

**Approach**: Four-phase migration where each phase delivers value independently and reduces Excel dependency incrementally, without forcing users to modify existing Excel files.

**Key Principle**: Excel is treated as unstable external input. We build resilience and alternatives, not perfection in Excel parsing.

---

## Phase 0: Resilient Excel Import (CURRENT)

### User Experience
- Users continue uploading Excel files unchanged
- System produces clear warnings for ambiguous or incomplete data
- Users resolve ambiguities through UI prompts (not by editing Excel)
- Import history shows what worked, what needs attention

### SimPilot Changes
- ✅ UID derivation with multi-plant support (UIDBacked types)
- ✅ Canonical key derivation (Station, Tool, Robot)
- ✅ DiffEngine detects create/update/delete/noChange
- ✅ Alias resolution system (plant-scoped + global fallback)
- 🚧 **DiffResult persistence** (store and display import diffs)
- 🚧 **Ambiguity resolution UI** (resolve unknown plantKeys, unresolved references)
- 🚧 **Import history list** (ImportRun records with counts and status)
- 🚧 **Soft delete visibility** (show inactive records, allow reactivation)

### Acceptance Criteria
- [ ] Tool List import produces DiffResult visible in UI
- [ ] Unresolved references shown as warnings with resolution actions
- [ ] Plant key ambiguities resolved through dropdowns/inputs
- [ ] Alias rules persist and auto-apply on next import
- [ ] Import History page lists all imports with:
  - Timestamp, file name, user
  - Counts: created/updated/deleted/unchanged/warnings
  - Status: clean / needs resolution
- [ ] Soft-deleted records visible with "Reactivate" option
- [ ] All operations survive page reload (IndexedDB persistence)

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Users confused by warnings | Clear, actionable messages: "Station 'ST020' not found. Did you mean 'ST002'?" with click-to-resolve |
| Alias rules grow unbounded | Audit trail shows when/why rules added; periodic review UI in Phase 1 |
| Import history uses too much storage | Retain last 50 imports; summarize older ones |

---

## Phase 1: Registry as Source of Truth

### User Experience
- Users access new **Registry** module (Stations, Tools, Robots tabs)
- View all recognized entities with UID, current key, labels, status
- **Activate/Inactivate** entities directly in SimPilot
- **Rename labels** without editing Excel (stored as plant-scoped overrides)
- **Add alias rules manually** (e.g., "ST20" → "ST020" for Plant A)
- Import now references Registry; mismatches trigger warnings

### SimPilot Changes
- New **Registry UI module**:
  - Station Registry: UID, currentKey, labels, status, updatedAt, "Last seen in import"
  - Tool Registry: UID, currentKey, labelsByPlant, plantKey, status, updatedAt
  - Robot Registry: (optional) same pattern
- **Registry edits**:
  - Toggle active/inactive (soft delete)
  - Edit label (creates plant-scoped label mapping)
  - Add/edit alias rules (fromKey → UID)
- **Import behavior**:
  - Diff compares Excel against Registry (not just previous import)
  - Warnings if Excel references inactive entities
  - Auto-suggestion: "This tool was inactivated on 2025-11-03. Reactivate?"

### What This Enables
- **No more Excel edits for renames**: User renames "Station 10" → "Welding Station 10" in Registry; next import auto-maps
- **Explicit lifecycle management**: Inactivate a scrapped robot; imports warn if Excel still references it
- **Human-readable canonical IDs**: Copy "PlantA-ST020-v3" from Registry for use in emails/notes
- **Immediate value**: Users stop editing Excel for station/tool identity changes

### Acceptance Criteria
- [ ] Registry UI shows all Stations, Tools with UID, key, labels, status
- [ ] User can activate/inactivate entities (soft delete toggle)
- [ ] User can rename label → creates alias rule auto-applied on next import
- [ ] Manual alias rule entry (fromKey, plantKey, UID) with validation
- [ ] Import diff shows "inactive entity referenced" warnings
- [ ] Registry search/filter by key, label, status, plant

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| User renames in Registry conflict with Excel | Import shows warning: "Registry says 'Welding 10', Excel says 'Station 10'—update Excel or Registry?" |
| Registry becomes cluttered with test data | Bulk "Inactivate unused" action based on "last seen" timestamp |
| Multi-plant label conflicts | Labels always scoped by plantKey; UI shows plant context clearly |

---

## Phase 2: In-App Editing with Audit Trail

### User Experience
- Users **create/edit Stations, Tools, Robots** directly in SimPilot
- Move stations between areas, renumber tools, update specs
- All changes logged in **Audit Trail** (who, when, what, why)
- Excel becomes **optional export** (e.g., for contractor handoff)
- Excel import still works but is no longer the primary workflow

### SimPilot Changes
- **Full CRUD for Stations/Tools/Robots**:
  - Create new station: choose plant, area, assign key, label
  - Edit: move station, update tool specs, reassign robot
  - Delete: soft delete with confirmation
- **Audit Trail**:
  - Table: timestamp, user, entityType, entityUID, action, oldValue, newValue, reason
  - UI: filterable log per entity or global timeline
- **Excel Export**:
  - Generate Tool List, Assemblies from current Registry state
  - Include all plant-specific columns
  - Formatting matches original Excel templates (for legacy systems)
- **Excel Import (legacy mode)**:
  - Warns: "SimPilot is now source of truth. Import will overwrite local changes unless reviewed."
  - Diff shows conflicts: Registry vs. Excel
  - User resolves per-entity: keep Registry, take Excel, merge

### What This Enables
- **Planning → As-Built renumbering**: User renumbers stations during commissioning; audit trail preserves planning history
- **No Excel required for daily work**: Add a new station, update tool specs, reassign robot—all in SimPilot
- **Compliance/traceability**: Audit trail answers "Why was Station 20 moved to Area 3?" with timestamp and reason
- **Multi-plant carryover**: Copy Station 10 from Plant A to Plant B; audit shows provenance

### Acceptance Criteria
- [ ] Create Station: UI form with plant, area, key, label, validation
- [ ] Edit Station: update key, label, area; old→new logged
- [ ] Create/Edit Tool: plant, labels, specs; all changes audited
- [ ] Audit Trail UI: filterable by entity, user, date range
- [ ] Excel Export: generates Tool List and Assemblies matching original format
- [ ] Excel Import (legacy): diff + conflict resolution UI
- [ ] Permissions: only authorized users can edit critical fields (e.g., plantKey)

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Audit trail bloat | Retain full detail 1 year, summarize older; export for archival |
| User error (accidental delete) | Soft delete + "Undo" within session; restore from audit trail |
| Excel export format drift | Regression tests compare exported Excel against golden snapshots |
| Planning vs. as-built confusion | Audit trail tags: "planning", "as-built", "commissioning"; UI filters by phase |

---

## Phase 3: Project Templates & Guided Entry

### User Experience
- Users start projects from **templates** (e.g., "BEV Body Shop", "ICE Paint Shop")
- Templates include:
  - Standard stations (Welding, Inspection, etc.)
  - Common tools and robots
  - Typical naming conventions
- **Guided entry wizards**:
  - "Add Station": suggests next available key, area based on plant layout
  - "Add Tool": pre-filled specs for known tool types
- Excel import becomes **rare** (only for legacy projects or external data)

### SimPilot Changes
- **Template system**:
  - CRUD for ProjectTemplate: name, description, plant type, included entities
  - "New Project from Template" wizard
  - Templates stored in DB, shareable across users
- **Smart defaults**:
  - Next available station key (e.g., ST021 after ST020)
  - Area suggestions based on plant layout
  - Tool type autocomplete from known specs
- **Excel import relegated**:
  - "Advanced" section in UI
  - Warning: "Template-based entry recommended. Import only if necessary."

### What This Enables
- **Fastest path for new projects**: Choose template, tweak a few stations, start simulating
- **Consistency across projects**: Standard naming, fewer errors
- **Onboarding**: New users learn by example (template includes best practices)
- **Excel optional**: Used only for one-off imports or legacy data

### Acceptance Criteria
- [ ] Create/edit project templates with Stations, Tools, Robots
- [ ] "New Project from Template" wizard copies entities, generates UIDs
- [ ] Guided station entry suggests next key, area
- [ ] Tool type autocomplete from known specs
- [ ] Excel import moved to "Advanced" UI section
- [ ] Template library: search, filter by plant type, popularity

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Templates too rigid | Allow full customization after template instantiation |
| Template versioning (updates) | Template has version; projects pin to template version; opt-in updates |
| Users skip templates, still use Excel | Analytics + onboarding nudge: "90% faster with templates" |

---

## Phase 4: Excel Deprecated (Admin-Only)

### User Experience
- Day-to-day workflow: SimPilot UI only (Registry, editing, templates)
- Excel import/export: **admin-only feature** behind feature flag
- Documentation updated: "Excel no longer required"
- Training materials focus on in-app workflow

### SimPilot Changes
- **Excel import/export**:
  - Feature flag: `ENABLE_EXCEL_LEGACY` (default: false)
  - Only admins see "Import Excel" button
  - Code moved to `src/legacy/excel/` namespace
- **Default workflow**:
  - New project → Choose template or start blank → Add/edit in Registry → Simulate
  - No Excel steps in critical path
- **Deprecation timeline**:
  - Phase 4 launch: Excel available but hidden
  - 6 months: Remove Excel code (archive in git history)
  - 1 year: Full removal (feature flag deleted)

### What This Enables
- **Simplified maintenance**: No Excel parsing bugs, format drift, or ambiguity resolution
- **Faster development**: New features skip Excel compatibility layer
- **User clarity**: One way to do things (SimPilot UI)

### Acceptance Criteria
- [ ] Excel import/export behind `ENABLE_EXCEL_LEGACY` flag
- [ ] Admin UI to toggle flag per project or globally
- [ ] Documentation: "Excel no longer required" guide
- [ ] Training: in-app tutorials replace Excel-based onboarding
- [ ] Analytics: <5% of users enable Excel flag
- [ ] Code cleanup: Excel code in `src/legacy/`, marked deprecated

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| External partners still send Excel | Export feature remains; warn: "SimPilot accepts direct data entry now" |
| Regulatory requirement for Excel | Export generates compliant Excel; import deprecated but code preserved in git |
| Power users prefer Excel | Survey why; add missing features to Registry/editing UI |

---

## Cross-Phase Concerns

### Multi-Plant Carryover
- **Challenge**: User copies Station 10 from Plant A to Plant B; must get new UID but preserve lineage
- **Solution** (Phase 2+):
  - "Duplicate to Plant" action: creates new UID, links via `derivedFrom` field
  - Audit trail shows: "Copied from PlantA-ST010-v2"
  - UID remains stable within each plant

### Planning → As-Built Renumbering
- **Challenge**: Planning uses ST010-ST050; as-built renumbers to ST001-ST041
- **Solution** (Phase 2+):
  - Audit trail tags: "planning" vs. "as-built"
  - UI toggle: "Show planning keys" overlays old keys
  - UID unchanged; currentKey updated; alias rule auto-created (ST010 → uid-abc)

### Backward Compatibility
- **Challenge**: Existing projects have IndexedDB snapshots; schema changes break them
- **Solution** (All phases):
  - Schema versioning: migrations for IndexedDB
  - Feature flags for breaking changes
  - Test harness: golden snapshots from each schema version

### Testing Strategy
- **Unit tests**: Alias resolution, canonical key derivation, diff engine
- **Integration tests**: Import → resolve → diff → persist → reload
- **Playwright (e2e)**: Full user flow: upload Excel → resolve ambiguities → view Registry → edit → re-import clean
- **Regression**: Excel exports match golden snapshots

---

## Success Metrics (Per Phase)

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 0 | % imports with zero warnings | >80% |
| Phase 0 | Avg time to resolve ambiguities | <2 min |
| Phase 1 | % users who edit Registry vs. Excel | >50% |
| Phase 1 | % imports that auto-resolve via Registry | >90% |
| Phase 2 | % new stations created in-app vs. Excel | >70% |
| Phase 2 | Audit trail entries per project | >100 (active editing) |
| Phase 3 | % new projects using templates | >60% |
| Phase 3 | % projects with zero Excel imports | >40% |
| Phase 4 | % users enabling Excel flag | <5% |
| Phase 4 | User satisfaction with in-app workflow | >4.5/5 |

---

## Timeline & Dependencies

```
Phase 0: 2 weeks (complete core, polish)
  └─> Phase 1: 3 weeks (Registry UI + basic CRUD)
      └─> Phase 2: 4 weeks (Full editing + Audit Trail + Excel export)
          └─> Phase 3: 3 weeks (Templates + Guided entry)
              └─> Phase 4: 1 week (Feature flag + documentation)
```

**Total**: ~13 weeks (3 months) to full Excel independence

**Gates**:
- Phase 0 → 1: All imports resolve cleanly; no critical bugs in diff/alias
- Phase 1 → 2: Registry used in >3 real projects; user feedback positive
- Phase 2 → 3: Excel export validated against legacy format; audit trail trusted
- Phase 3 → 4: Template library has >5 templates; >50% adoption

---

## Appendix: Architecture Decisions

### Why UID-Backed Linking?
- **Stability**: Excel keys change (renumbering, typos); UIDs never do
- **Multi-plant**: Same key in different plants = different entities; UID disambiguates
- **Audit**: UID traces entity across renames, moves, copies

### Why Alias Rules?
- **Flexibility**: Accommodate Excel variation without forcing Excel edits
- **User control**: User explicitly maps "ST20" → "ST020"; no silent guesses
- **Plant-scoped**: "ST001" in Plant A ≠ "ST001" in Plant B

### Why Soft Delete?
- **Safety**: Never lose data; always recoverable
- **Audit**: Deletion is an event in audit trail, not data loss
- **Import resilience**: If Excel re-adds deleted entity, diff detects and warns

### Why Diff Engine?
- **Transparency**: User sees what changed before accepting import
- **Conflict detection**: Registry says inactive; Excel says active → user resolves
- **Idempotency**: Re-import unchanged Excel = no changes (diff shows noChange)

---

## Next Steps (Immediate)

1. **Complete Phase 0** (this sprint):
   - DiffResult persistence and UI display
   - Ambiguity resolution UI (plant key dropdowns, reference suggestions)
   - Import History list with counts and status
   - Soft delete visibility and reactivation

2. **Validate Phase 0** (user testing):
   - Import real Tool Lists with known ambiguities
   - Confirm warnings are clear and actionable
   - Measure time to resolve ambiguities

3. **Design Phase 1 Registry UI** (next sprint):
   - Wireframes for Stations, Tools tabs
   - UX for activate/inactivate, rename, alias rule entry
   - Mockups for canonical ID display and copy-to-clipboard

4. **Communicate Plan**:
   - Share this document with stakeholders
   - Gather feedback on timeline and priorities
   - Adjust based on user needs

---

**Last Updated**: 2026-01-07
**Owner**: SimPilot Team
**Status**: Phase 0 in progress
