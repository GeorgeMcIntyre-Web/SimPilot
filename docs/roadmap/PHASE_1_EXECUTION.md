# Phase 1 Execution Plan: Registry as Source of Truth

## Objective

Shift entity management from Excel to SimPilot Registry, making the Registry the authoritative source for stations, tools, and robots while Excel becomes input-only.

---

## Work Packages

### WP1: Registry Data Model

**Scope:**
- Extend StationRecord/ToolRecord/RobotRecord with:
  - `labelOverrides: Record<string, string>` - user-specified labels (plant-scoped)
  - `lastSeenImportRunId: string` - track which ImportRun last referenced this entity
  - `manuallyCreated: boolean` - distinguish in-app creation from import
- Define AuditEntry schema for tracking all registry changes

**Files:**
- `src/domain/uidTypes.ts` - Extend entity record interfaces
- `src/domain/auditLog.ts` (new) - AuditEntry type, audit functions
- `src/domain/coreStore.ts` - Add `auditLog: AuditEntry[]` to state

**Acceptance Checks:**
- [ ] `labelOverrides` allows per-plant label customization
- [ ] `lastSeenImportRunId` updates on each import
- [ ] `manuallyCreated` flag distinguishes user-created vs. imported entities
- [ ] `AuditEntry` schema includes: timestamp, user, entityType, entityUid, action, oldValue, newValue, reason
- [ ] `addAuditEntry()` method in coreStore appends to log
- [ ] Unit tests: Label override application, audit entry creation

**Dependencies:** Phase 0 complete (UID types, coreStore)

**Non-Goals:**
- Audit log retention policy (keep all for now)
- Audit log export (Phase 2)
- Role-based audit filtering (Phase 2)

---

### WP2: Registry UI - Core Views

**Scope:**
- Registry page with Stations/Tools/Robots tabs
- Table view: UID, canonical key, plantKey, labels, status, lastUpdated, lastSeen
- Canonical ID display with copy-to-clipboard (`PlantA-abc12345-ST010`)
- Search/filter by key, label, plant, status
- "Show inactive" toggle

**Files:**
- `src/app/routes/RegistryPage.tsx` - Main page (already created, enhance)
- `src/components/registry/CanonicalIdDisplay.tsx` (new) - Reusable component

**Acceptance Checks:**
- [ ] Tabs for Stations, Tools, Robots (Robots can be Phase 1.1 if needed)
- [ ] Each row shows: status badge, UID (truncated), canonical key, plant, labels, lastUpdated, lastSeen
- [ ] Canonical ID copyable via click-to-copy button
- [ ] Search bar filters by key, label, or UID
- [ ] Plant dropdown filters by specific plant
- [ ] Status dropdown filters by active/inactive
- [ ] "Show inactive" checkbox toggles inactive visibility
- [ ] Dark mode support
- [ ] Playwright: Navigate to /registry → see tabs → search → filter → verify results

**Dependencies:** WP1 (data model)

**Non-Goals:**
- Inline editing (WP3)
- Bulk operations (Phase 2)
- Export to Excel (Phase 2)

---

### WP3: Registry UI - Actions

**Scope:**
- Activate/Inactivate button per row (soft delete toggle)
- "Add Alias" action: modal/inline form (fromKey, reason) → creates AliasRule
- "Override Label" action: modal/inline form (newLabel, reason) → stores in labelOverrides
- Confirmation dialogs for destructive actions

**Files:**
- `src/app/routes/RegistryPage.tsx` - Add action buttons
- `src/components/registry/AddAliasModal.tsx` (new) - Alias form
- `src/components/registry/OverrideLabelModal.tsx` (new) - Label override form

**Acceptance Checks:**
- [ ] "Activate" button changes status to active, adds audit entry
- [ ] "Deactivate" button shows confirmation, changes status to inactive, adds audit entry with reason
- [ ] "Add Alias" opens modal: input fromKey, reason → creates alias rule → closes modal
- [ ] "Override Label" opens modal: input newLabel, reason → stores in labelOverrides → updates display
- [ ] All actions audited (timestamp, user, action, oldValue, newValue, reason)
- [ ] Alias rules immediately apply on next import (verify via re-import flow)
- [ ] Label overrides immediately visible in Registry canonical display
- [ ] Playwright: Click "Add Alias" → fill form → submit → verify alias in aliasRules collection

**Dependencies:** WP2 (UI views)

**Non-Goals:**
- Bulk activate/deactivate (Phase 2)
- Undo action (Phase 2 with audit trail)
- Alias rule editing (create-only for now)

---

### WP4: Import-Registry Integration

**Scope:**
- Import diff now compares against Registry (not just prev import)
- Warnings if Excel references inactive entity
- Warnings if Excel label conflicts with Registry label override
- Auto-suggestions for reactivation

**Files:**
- `src/ingestion/diffEngine.ts` - Enhance to check Registry status
- `src/ingestion/importWarnings.ts` (new) - Warning generation logic
- `src/app/routes/ImportHistoryPage.tsx` - Display Registry-specific warnings

**Acceptance Checks:**
- [ ] Import detects tool references inactive station → warning: "Tool GUN10 references inactive station ST020. Reactivate station or update Excel."
- [ ] Import detects label mismatch → info: "Excel says 'Station 10', Registry says 'Welding Station 10'. Using Registry label."
- [ ] Import suggests reactivation if inactive entity re-appears in Excel
- [ ] Warnings displayed in Import History with actionable links ("Reactivate ST020")
- [ ] Unit tests: Inactive reference detection, label conflict detection
- [ ] Playwright: Import with inactive ref → see warning → click reactivate → warning disappears on re-import

**Dependencies:** WP1 (data model), WP3 (activate/deactivate actions)

**Non-Goals:**
- Automatic reactivation (user must confirm)
- Conflict resolution wizard (show warning only)
- Historical conflict tracking (Phase 2)

---

### WP5: Audit Trail UI

**Scope:**
- Audit Trail page (global timeline)
- Per-entity audit view (filter by UID)
- Filterable by: entity type, action, user, date range
- Export audit log (CSV or JSON)

**Files:**
- `src/app/routes/AuditTrailPage.tsx` (new) - Global audit timeline
- `src/components/registry/EntityAuditLog.tsx` (new) - Per-entity log component

**Acceptance Checks:**
- [ ] Audit Trail page lists all entries, newest first
- [ ] Each entry shows: timestamp, user, entityType, action, entity canonical ID (clickable), oldValue, newValue, reason
- [ ] Filter by entity type (Station/Tool/Robot)
- [ ] Filter by action (activate, deactivate, add alias, override label)
- [ ] Filter by date range (from/to date pickers)
- [ ] Search by entity UID or key
- [ ] Click entity ID → navigate to Registry filtered to that entity
- [ ] Export button downloads CSV with all filtered entries
- [ ] Playwright: Navigate to /audit-trail → see entries → filter → export → verify CSV

**Dependencies:** WP1 (audit log schema), WP3 (actions generate audit entries)

**Non-Goals:**
- Diff view for audit changes (show old/new as text)
- Audit log retention policy (keep all for Phase 1)
- Role-based audit access control (Phase 2)

---

### WP6: Last-Seen Tracking

**Scope:**
- Update `lastSeenImportRunId` on each entity during import
- Display "Last seen" timestamp in Registry (relative: "2 hours ago")
- "Inactive and not seen in 30 days" badge/filter

**Files:**
- `src/ingestion/importCoordinator.ts` - Update lastSeenImportRunId during import
- `src/app/routes/RegistryPage.tsx` - Display last seen timestamp
- `src/components/registry/LastSeenBadge.tsx` (new) - Visual indicator

**Acceptance Checks:**
- [ ] Import updates `lastSeenImportRunId` for all entities in Excel
- [ ] Entities not in Excel → `lastSeenImportRunId` unchanged
- [ ] Registry shows "Last seen: 2 hours ago" (relative timestamp)
- [ ] Filter: "Not seen in 30+ days" → shows stale entities
- [ ] Inactive entities not seen in 30+ days marked with warning badge
- [ ] Playwright: Import → verify last seen updates → wait → verify relative time changes

**Dependencies:** WP1 (data model), WP2 (UI views)

**Non-Goals:**
- Automatic inactivation of stale entities (manual only)
- Email alerts for stale entities (future)
- Last-seen trend charts (future)

---

## Acceptance Criteria (Phase 1 Complete)

**Functional:**
- [ ] Registry UI shows all Stations/Tools/Robots with UID, key, labels, status, plant, last seen
- [ ] User can activate/inactivate entities → persists, audited
- [ ] User can add alias rule → next import auto-applies it
- [ ] User can override label → canonical display updates immediately
- [ ] Import warns if Excel references inactive entity → suggests reactivation
- [ ] Audit trail shows all registry changes with timestamp, user, reason
- [ ] Canonical ID (`PlantA-abc12345-ST010`) copyable for external use
- [ ] Last seen timestamp tracks which imports referenced each entity

**Technical:**
- [ ] Audit log persists across sessions (in snapshot)
- [ ] Label overrides apply to canonical display
- [ ] Alias rules apply during UID resolution (verified via unit tests)
- [ ] Unit tests: >80% coverage for registry actions, audit log
- [ ] Playwright: Full Registry flow (view → search → filter → add alias → override label → activate/deactivate → view audit)
- [ ] Typecheck passes, build succeeds

**UX:**
- [ ] All actions require confirmation or reason (no accidental changes)
- [ ] Audit trail entries human-readable ("Deactivated ST020 because scrapped 2024-11-03")
- [ ] Dark mode support in all new UI
- [ ] Responsive design (works on tablet/mobile)

---

## Dependencies Between Work Packages

```
WP1 (Data Model)
  └─ Foundation for all other WPs

WP2 (UI Views)
  └─ Depends on: WP1 (extended entity records)

WP3 (UI Actions)
  └─ Depends on: WP2 (UI framework)

WP4 (Import Integration)
  └─ Depends on: WP1 (Registry data), WP3 (activate/deactivate)

WP5 (Audit Trail UI)
  └─ Depends on: WP1 (audit log schema), WP3 (actions generate entries)

WP6 (Last-Seen Tracking)
  └─ Depends on: WP1 (data model), WP2 (UI views)
```

**Critical Path:** WP1 → WP2 → WP3 → WP4 (WP5 and WP6 can run in parallel after WP2)

---

## Non-Goals for Phase 1

**Explicitly NOT doing:**
- ❌ Full CRUD (create/delete entities in-app) - Phase 2
- ❌ Rename/renumber in-app - Phase 2
- ❌ Move station to different area - Phase 2
- ❌ Split/merge entities - Phase 2
- ❌ Bulk operations (activate 10 stations at once) - Phase 2
- ❌ Excel export - Phase 2
- ❌ Permissions/roles (who can activate/deactivate) - Phase 2
- ❌ Undo action - Phase 2 (audit trail enables manual restoration)
- ❌ Notifications/alerts - future
- ❌ Historical trend analysis - future
- ❌ API for external systems - future

---

## Testing Strategy

### Unit Tests (George)
- `auditLog.test.ts`: Audit entry creation, filtering
- `registryActions.test.ts`: Activate, deactivate, add alias, override label
- `importWarnings.test.ts`: Inactive reference detection, label conflict detection

### Integration Tests (George + Edwin)
- Registry flow: Add alias → re-import → verify alias applied
- Registry flow: Override label → verify canonical display updates
- Registry flow: Deactivate station → import references it → verify warning

### Playwright E2E (Edwin)
- `registry.spec.ts`: Navigate to /registry → search → filter → add alias → override label → verify persistence
- `registry-actions.spec.ts`: Activate/deactivate → verify audit entry → reload → verify status persists
- `audit-trail.spec.ts`: Navigate to /audit-trail → filter → export → verify CSV

### Manual Testing Checklist
- [ ] Add alias rule for station → re-import → verify alias applied
- [ ] Override label for tool → verify canonical display changes immediately
- [ ] Deactivate station → import references it → verify warning shown
- [ ] Reactivate station → re-import → verify warning disappears
- [ ] View audit trail → filter by entity → verify correct entries shown
- [ ] Export audit log → open CSV → verify all entries present
- [ ] Dark mode toggle → verify all Registry UI renders correctly

---

## Rollout Plan

**Step 1: Data Model (WP1)**
- Merge extended entity records, audit log schema
- No UI changes yet (backend-only)
- Verify unit tests pass

**Step 2: Core UI (WP2)**
- Merge Registry page with tabs, search, filter
- First user-visible Registry feature
- Verify Playwright tests pass

**Step 3: Actions (WP3)**
- Merge activate/deactivate, add alias, override label
- Full Registry management available
- Verify audit entries created

**Step 4: Import Integration (WP4)**
- Merge import-registry checks, warnings
- Verify warnings displayed correctly

**Step 5: Audit Trail + Last-Seen (WP5, WP6)**
- Merge audit trail UI, last-seen tracking
- Full Phase 1 functionality visible

**Step 6: Polish & Stabilization**
- Fix bugs from user testing
- Performance optimization (large registries)
- Update docs

---

## How to Verify Phase 1 is Complete

**Smoke Test Flow:**
1. Navigate to /registry → verify Stations and Tools tabs visible
2. Search for a station by key → verify results
3. Click "Add Alias" on a station → enter fromKey "OLD_ST010", reason "Renumbered during commissioning" → submit
4. Navigate to /import-history → re-upload the Excel file
5. Verify alias rule applied (station resolved via alias)
6. Navigate back to /registry → click "Override Label" on a tool → change label to "New Tool Name" → submit
7. Verify canonical display shows new label immediately
8. Click "Deactivate" on a station → enter reason "Scrapped" → confirm
9. Navigate to /audit-trail → verify all actions logged
10. Re-upload Excel referencing the inactive station → verify warning displayed
11. Click "Reactivate" from warning → verify station active again
12. Reload page → verify all changes persist

**Pass Criteria:**
- All steps complete without errors
- Alias rules apply on import
- Label overrides visible immediately
- Audit trail shows all actions with reasons
- Warnings clear and actionable
- Persistence survives reload

---

**Last Updated:** 2026-01-07
**Owner:** George (backend/audit) + Edwin (UI/E2E)
