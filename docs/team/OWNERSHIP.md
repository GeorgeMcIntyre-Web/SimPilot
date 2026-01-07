# Team Ownership & Collaboration

## Team Members

**George** - Backend Architecture & Core Systems
**Edwin** - Frontend UI & End-to-End Testing

---

## Ownership Areas

### George: Backend & Architecture

**Primary Responsibilities:**
- Architecture & system design (contracts, schemas, data flow)
- Ingestion & linking rules (UID resolution, canonical keys, alias rules, diff engine)
- Persistence & migrations (IndexedDB, schema versioning, snapshot save/load)
- Domain logic (coreStore, uidTypes, diffEngine, keyDerivation, uidResolver)
- Roadmap gatekeeping (phase definitions, acceptance criteria, non-goals)
- Performance optimization (large file ingestion, diff computation)

**Files Typically Owned:**
- `src/domain/` - All domain types and store logic
- `src/ingestion/` - All parsing, linking, and diff logic
- `src/persistence/` - Snapshot and IndexedDB logic
- `docs/roadmap/` - Roadmap, execution plans, decision log

**Review Required For:**
- Schema changes (uidTypes, coreStore state)
- Migration logic (v2 → v3, etc.)
- Linking rules (alias resolution, canonical key derivation)
- Diff engine changes (create/update/delete/rename detection)
- Performance-critical code (ingestion loops, diff computation)

---

### Edwin: Frontend & Testing

**Primary Responsibilities:**
- Import review UI (Import History, diff viewer, warnings display)
- Registry UI (Stations/Tools tabs, search/filter, actions)
- Audit trail UI (timeline, per-entity log, export)
- Playwright E2E test stability (selectors, retry logic, fixtures)
- Integration demo flows (end-to-end user journeys)
- UX design & accessibility (dark mode, responsive, keyboard nav)
- Component library & reusability (DRY, styled components)

**Files Typically Owned:**
- `src/app/routes/` - All page components
- `src/components/` - Reusable UI components
- `tests/e2e/` - Playwright test suites
- `src/ui/` - UI utilities, themes, layouts

**Review Required For:**
- New routes or major UI changes
- Playwright test selectors (data-testid, stability)
- Component API contracts (props, events)
- Accessibility (a11y) compliance
- Dark mode support

---

## Collaboration Interfaces

### Backend Provides (George → Edwin)

**1. DiffResult Schema**
- `DiffResult` type with creates/updates/deletes/renames/ambiguous
- Guaranteed to include `plantKey`, `entityType`, `uid` (where applicable)
- Contract: DiffResult persisted in `coreStore.diffResults[]`

**2. Warning Messages**
- Structured warnings with `code`, `message`, `context` (e.g., `{ code: 'INACTIVE_REF', message: 'Tool GUN10 references inactive station ST020', context: { toolUid, stationUid } }`)
- Contract: Warnings in `ImportRun.warnings[]` and `DiffResult.warnings[]`

**3. Resolution Endpoints/Hooks**
- `coreStore.addAliasRules(rules)` - add user-confirmed alias
- `coreStore.upsertStationRecords(records)` - update entities
- `coreStore.deactivateStation(uid)`, `coreStore.reactivateStation(uid)` - soft delete
- Contract: All methods synchronous, trigger `notifySubscribers()` for reactive UI

**4. Data Contracts**
- `StationRecord`, `ToolRecord`, `RobotRecord` - stable schema
- `AliasRule` - fromKey, toUid, entityType, plantKey, reason
- `ImportRun` - id, sourceFileName, plantKey, counts, warnings
- Contract: Schema changes versioned, migrations provided

---

### Frontend Provides (Edwin → George)

**1. UX Requirements**
- User flow diagrams (import → resolve → verify)
- Wireframes for new features (Figma or sketches)
- Accessibility requirements (keyboard nav, screen reader support)

**2. Stable Selectors**
- All interactive elements have `data-testid` for Playwright
- Naming convention: `data-testid="import-history-row-{id}"`, `data-testid="registry-add-alias-btn"`
- Contract: Selectors stable across refactors (no breaking changes)

**3. Repro Cases**
- Minimal reproduction steps for bugs
- Sample data files attached to issues
- Expected vs. actual screenshots
- Browser/environment details

**4. E2E Coverage**
- Playwright tests cover critical user flows
- Tests run on CI (not just local)
- Contract: Green tests = feature complete

---

## Review Gates

### Changes Requiring George Review

**Trigger Conditions:**
- Any change to `src/domain/` (schema, store)
- Any change to `src/ingestion/` (linking, diff, parsing)
- Migration logic (`applySnapshotToState`, schema version bumps)
- Performance-sensitive code (loops over 1000+ items, large file parsing)
- Roadmap changes (phase definitions, acceptance criteria)

**Review Checklist:**
- [ ] Schema changes backward compatible or migration provided?
- [ ] Linking logic correct (alias application, UID resolution)?
- [ ] Diff engine detects all change types (create/update/delete/rename)?
- [ ] Unit tests cover new logic?
- [ ] Performance implications considered (Big O, indexing)?

---

### Changes Requiring Edwin Review

**Trigger Conditions:**
- Any change to `src/app/routes/` (new pages, major UI changes)
- Any change to `src/components/` (new components, API changes)
- Any change to `tests/e2e/` (new tests, selector changes)
- Accessibility changes (keyboard nav, ARIA labels)
- Dark mode changes (theme, color palette)

**Review Checklist:**
- [ ] Component reusable (DRY, no hardcoded data)?
- [ ] Props/events well-typed (TypeScript strict)?
- [ ] Playwright selectors stable (`data-testid` used)?
- [ ] Dark mode support verified?
- [ ] Accessible (keyboard nav, screen reader friendly)?

---

## Communication Protocols

### Daily Standup (Async)
- **Format:** Short update in shared chat or doc
- **Content:** Yesterday's progress, today's plan, blockers
- **Frequency:** Daily (or as needed)

### Design Discussions
- **When:** Before implementing major features (new pages, schema changes)
- **How:** Quick sync call or detailed written proposal
- **Output:** Decision recorded in DECISION_LOG.md if architectural

### Bug Triage
- **Process:**
  1. Edwin files bug with repro steps + sample data
  2. George investigates backend; Edwin investigates UI
  3. Assign to owner based on root cause
  4. Fix + add regression test
- **SLA:** P0 (blocking) same day, P1 (critical) 2 days, P2 (normal) 1 week

### Feature Handoff
- **George → Edwin:**
  1. Backend feature complete (unit tested)
  2. API/contract documented
  3. Sample data provided
  4. Tag Edwin in PR or issue
- **Edwin → George:**
  1. UX requirements documented
  2. Wireframes/mockups provided
  3. Edge cases identified
  4. Tag George for review

---

## Conflict Resolution

**Scenario:** Disagreement on implementation approach

**Process:**
1. **Discuss:** Each person explains rationale (sync call or written)
2. **Evaluate:** Trade-offs (performance, UX, maintainability, timeline)
3. **Decide:** Owner of area makes final call (George for backend, Edwin for UI)
4. **Document:** Record decision in DECISION_LOG.md if significant
5. **Revisit:** If decision proves wrong, revisit without blame

**Escalation:** If no consensus, defer to roadmap goals (user value, simplicity, shipping speed).

---

## Onboarding New Contributors (Future)

**Backend (George Onboards):**
1. Read ROADMAP.md, DECISION_LOG.md
2. Review UID/alias/diff architecture (pair with George)
3. Pick "good first issue" (unit test, small refactor)
4. Submit PR → George reviews, provides feedback
5. Gradually increase scope (own a work package)

**Frontend (Edwin Onboards):**
1. Read ROADMAP.md, UI component docs
2. Review Playwright setup, run tests locally
3. Pick "good first issue" (UI polish, small component)
4. Submit PR → Edwin reviews, provides feedback
5. Gradually increase scope (own a page or feature)

---

**Last Updated:** 2026-01-07
**Maintained By:** George + Edwin
