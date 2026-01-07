# SimPilot Decision Log

## Purpose

Record key architectural and product decisions made during SimPilot development. Each entry captures the decision, rationale, and consequences to maintain context for future work.

**Format:** Decision / Why / Consequences

---

## DEC-001: Excel Unchanged; Tolerate Input Noise

**Date:** 2026-01-07
**Context:** Excel files contain inconsistent naming, split identifiers across columns, renumbering, and format variations.

**Decision:**
Do not require users to modify Excel files. SimPilot must tolerate all input variations and provide clear warnings when ambiguity exists.

**Why:**
- Users cannot realistically standardize Excel across multiple plants and contractors
- Forcing Excel changes creates adoption barriers
- Better to build resilience than impose constraints on external data sources

**Consequences:**
- ✅ No user friction during import
- ✅ Warnings guide users to resolve ambiguities without editing Excel
- ⚠️ More complex parsing and matching logic required
- ⚠️ Must handle PLANT_UNKNOWN, split columns, typos gracefully

**Alternatives Considered:**
- Strict Excel schema validation → rejected: too brittle, blocks real-world data
- Auto-fix Excel inconsistencies → rejected: silent guessing causes trust issues

---

## DEC-002: UID is Identity; Derived Keys are Labels

**Date:** 2026-01-07
**Context:** Excel keys change frequently (renumbering, typos, moves), breaking references.

**Decision:**
Every entity (Station, Tool, Robot) gets a stable UID. Canonical keys are derived from Excel columns but are mutable labels, not identity.

**Why:**
- UIDs provide referential stability across renames, moves, and renumbers
- Excel keys are human-readable but unreliable as primary keys
- UID-backed linking enables planning → as-built transitions without data loss

**Consequences:**
- ✅ References remain valid when Excel keys change
- ✅ Renumbering (ST010 → ST001) preserves entity identity
- ✅ Multi-plant carryover trackable via UID lineage
- ⚠️ Requires UID resolver logic to map keys → UIDs
- ⚠️ Users see both UID and key (canonical display: `PlantA-abc12345-ST010`)

**Alternatives Considered:**
- Composite key (plant + line + bay + station) → rejected: still breaks on renumbering
- Excel key as primary → rejected: unstable, causes cascading reference failures

---

## DEC-003: No Silent Guessing; Ambiguity Requires User Decision

**Date:** 2026-01-07
**Context:** Import encounters ambiguous mappings (e.g., "ST10" could be "ST010" or "ST100").

**Decision:**
Never auto-resolve ambiguities. Present candidates with match scores and reasons; require explicit user decision (select candidate or create new).

**Why:**
- Silent guessing causes incorrect links, data corruption, and user distrust
- Manufacturing data is critical; false links have real-world consequences (wrong tool assigned to station)
- Users know their data; system provides suggestions, users decide

**Consequences:**
- ✅ User trust maintained (no silent incorrect mappings)
- ✅ Explicit alias rules created, reusable on future imports
- ⚠️ Requires user intervention for ambiguous imports (not fully automated)
- ⚠️ Must provide clear UX: "Did you mean...?" with actionable choices

**Alternatives Considered:**
- Fuzzy matching with auto-accept above threshold → rejected: still causes silent errors
- Block import on ambiguity → rejected: too strict, prevents progress

---

## DEC-004: PlantKey is First-Class; Default to PLANT_UNKNOWN with Warnings

**Date:** 2026-01-07
**Context:** Multi-plant projects share data, but Excel often doesn't specify plant context.

**Decision:**
Every entity record includes `plantKey: PlantKey`. If plant cannot be determined (filename, metadata, user selection), use `PLANT_UNKNOWN` sentinel and emit warnings.

**Why:**
- Multi-plant is core requirement, not optional enhancement
- Same key in different plants = different physical entities (must not collide)
- PLANT_UNKNOWN allows import to proceed while flagging data quality issue

**Consequences:**
- ✅ Multi-plant collision prevention built-in
- ✅ Plant-scoped alias rules and keys
- ✅ Clear warnings when plant context missing ("Plant context PLANT_UNKNOWN; collisions possible")
- ⚠️ User must manually assign plant for PLANT_UNKNOWN imports
- ⚠️ PLANT_UNKNOWN data cannot be safely merged with other plants

**Alternatives Considered:**
- Block import if plant unknown → rejected: too strict
- Default to "Plant A" → rejected: silent assumption causes wrong plant assignments
- Global namespace (no plant distinction) → rejected: breaks multi-plant carryover

---

## DEC-005: Soft Delete Only; Never Hard Delete

**Date:** 2026-01-07
**Context:** Entities may become inactive (scrapped tools, decommissioned stations) but should remain in audit trail.

**Decision:**
Use `status: 'active' | 'inactive'` field. Never hard-delete entity records. Soft delete preserves history, enables recovery, maintains audit trail.

**Why:**
- Manufacturing data has compliance/audit requirements
- Accidental deletion must be reversible
- Inactive entities may be referenced in historical imports or simulation snapshots
- Deletion events are significant (should be audited, not erased)

**Consequences:**
- ✅ Full audit trail of entity lifecycle
- ✅ Accidental deactivation recoverable via "Reactivate"
- ✅ Import can warn: "Tool GUN10 references inactive station ST020"
- ⚠️ Inactive records consume storage (negligible, can archive later)
- ⚠️ UI must filter active/inactive appropriately (show/hide toggle)

**Alternatives Considered:**
- Hard delete with backup → rejected: complex, not real-time recoverable
- Archive to separate collection → rejected: splits data, complicates queries

---

## DEC-006: Diff-Based Import; Never Silent Overwrite

**Date:** 2026-01-07
**Context:** Re-importing Excel should be safe and transparent.

**Decision:**
Every import computes a DiffResult (creates/updates/deletes/renames) before applying changes. User sees diff, then accepts or rejects.

**Why:**
- Users need to understand what will change before it happens
- Silent overwrites cause data loss, confusion
- Diff provides audit trail of what changed and why
- Idempotent imports (re-upload same Excel → noChange diff)

**Consequences:**
- ✅ Transparency: user sees exactly what will change
- ✅ Audit: DiffResult stored per ImportRun for history
- ✅ Safety: unexpected changes caught before commit
- ⚠️ Requires DiffResult persistence and UI display
- ⚠️ Large imports produce large diffs (need pagination/summary)

**Alternatives Considered:**
- Auto-apply import changes → rejected: no preview, risky
- Manual confirmation per entity → rejected: too tedious for large imports

---

## DEC-007: Alias Rules are User-Confirmed Mappings

**Date:** 2026-01-07
**Context:** Excel keys change over time (renumbering, typos), but UID resolution needs to find existing entities.

**Decision:**
Alias rules map `fromKey → toUid` with explicit user confirmation. Plant-scoped by default; global if `isGlobal: true`. Alias rules persist and auto-apply on future imports.

**Why:**
- User confirms mapping once; system remembers forever
- Handles renumbering (ST010 → ST001), typos (ST10 → ST010), format changes (AL010 → AL_010)
- Plant-scoped prevents cross-plant collisions
- Global rules for true cross-plant entities (rare, user must opt-in)

**Consequences:**
- ✅ Renumbering handled cleanly (user confirms ST010 = uid-abc)
- ✅ Alias rules reusable across imports (set once, apply always)
- ✅ User control (no silent alias creation)
- ⚠️ Alias rules can grow large (need UI to review/edit in Phase 1)
- ⚠️ Plant-scoped by default (user must explicitly mark global if needed)

**Alternatives Considered:**
- Auto-create alias on rename → rejected: silent guessing
- Require Excel consistency → rejected: unrealistic
- Fuzzy matching without rules → rejected: not repeatable, unpredictable

---

## DEC-008: Phase 0 Ships Before Phase 1

**Date:** 2026-01-07
**Context:** Large project; need to deliver value incrementally.

**Decision:**
Each phase is independently shippable. Phase 0 (Excel-tolerant ingestion) must be complete and stable before Phase 1 (Registry) begins.

**Why:**
- Incremental delivery de-risks project
- Users get value sooner (better imports, warnings, diff visibility)
- Foundation must be stable before building Registry on top
- Easier to test and validate in isolation

**Consequences:**
- ✅ Phase 0 delivers immediate value (import transparency, warnings)
- ✅ Phase 1 can assume stable UID/diff/alias foundation
- ✅ Bugs caught early (Phase 0 tested in production before Phase 1 starts)
- ⚠️ Must resist temptation to start Phase 1 before Phase 0 complete
- ⚠️ Clear acceptance criteria required for each phase

**Alternatives Considered:**
- Build all phases concurrently → rejected: high risk, hard to test
- Monolithic release → rejected: delays value delivery, risky

---

## DEC-009: Registry is Source of Truth (Phase 1+)

**Date:** 2026-01-07
**Context:** After Phase 0, users still rely on Excel for entity management.

**Decision:**
Phase 1 makes Registry the authoritative source. Import compares against Registry (not just prev import). Registry edits (activate, deactivate, alias, label override) take precedence over Excel.

**Why:**
- Excel should be input-only, not source of truth
- Users need in-app management (activate/deactivate without Excel edit)
- Registry enables audit trail, permissions, advanced features
- Path to Excel independence

**Consequences:**
- ✅ Users can manage entities without touching Excel
- ✅ Import warnings if Excel conflicts with Registry
- ✅ Audit trail for all entity changes
- ⚠️ Excel becomes "legacy input" (eventual deprecation path)
- ⚠️ Users must trust Registry (UX must be excellent)

**Alternatives Considered:**
- Excel remains source of truth → rejected: no path to Excel independence
- Dual source of truth (Excel + Registry) → rejected: conflict hell

---

## DEC-010: Canonical Display for Human Communication

**Date:** 2026-01-07
**Context:** Users need to reference entities in emails, notes, verbal communication.

**Decision:**
Generate canonical display string: `PlantKey-UIDShort-Key` (e.g., `PlantA-abc12345-ST010`). Human-readable, stable (UID-backed), copyable.

**Why:**
- UIDs alone are opaque (`st_abc12345-6789-...`)
- Keys alone are unstable (change on renumbering)
- Canonical display balances readability and stability
- Copy-to-clipboard for use in external systems

**Consequences:**
- ✅ Users can confidently reference entities externally
- ✅ Stable even if key changes (UID portion remains)
- ✅ Plant context visible (avoids cross-plant confusion)
- ⚠️ Slightly verbose (acceptable trade-off for clarity)
- ⚠️ UIDShort must be unique within plant (use last 8 chars of UUID)

**Alternatives Considered:**
- UID only → rejected: not human-readable
- Key only → rejected: breaks on renumbering
- Plant + Key only → rejected: no stability guarantee

---

## Template for Future Entries

**DEC-XXX: [Decision Title]**

**Date:** YYYY-MM-DD
**Context:** [What problem are we solving? What constraints exist?]

**Decision:**
[What did we decide to do?]

**Why:**
[Rationale, trade-offs considered]

**Consequences:**
- ✅ [Positive outcomes]
- ⚠️ [Trade-offs, risks, mitigations]

**Alternatives Considered:**
- [Option 1] → rejected: [why]
- [Option 2] → rejected: [why]

---

**Last Updated:** 2026-01-07
**Maintained By:** George (architecture decisions) + Edwin (UX decisions)
