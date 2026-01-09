# Development Workflow

## Daily Development Loop

### 1. Contract → Tests → Implement → Verify → Small PR

**Contract First:**
- Define what you're building (API, schema, UI component)
- Write types/interfaces
- Document expected behavior
- Get review if cross-cutting (backend ↔ frontend)

**Tests Before Implementation:**
- Unit tests: Write failing tests for new logic
- E2E tests: Write Playwright test for user flow
- Verify tests fail (red) before implementing

**Implement:**
- Write minimal code to make tests pass (green)
- Refactor for clarity (keep tests green)
- Add comments only where logic is non-obvious

**Verify Locally:**
- Typecheck: `npx tsc --noEmit`
- Unit tests: `npm test`
- E2E tests (if applicable): `npm run test:e2e`
- Build: `npm run build`
- Manual smoke test in browser

**Small PR:**
- Commit atomically (one logical change per commit)
- Open PR with clear description (What/Why/How to Test)
- Request review from owner (George for backend, Edwin for UI)
- Address feedback promptly
- Merge when approved + CI green

---

## Commit & PR Discipline

### Atomic Commits

**Definition:** One logical change per commit (single purpose, fully functional).

**Good Examples:**
- `feat(uidTypes): add entityType to DiffCreate/Update/Delete`
- `fix(diffEngine): include plantKey in all diff results`
- `test(keyDerivation): add coverage for area+station strategy`
- `docs(roadmap): add Phase 1 execution plan`

**Bad Examples:**
- ❌ `WIP` (not descriptive)
- ❌ `fix stuff` (too vague)
- ❌ `add feature + fix bug + refactor` (multiple changes)

**Format:**
```
<type>(<scope>): <short summary>

[Optional body: more details, rationale, breaking changes]

[Optional footer: refs, co-authors]
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`

**Scopes:** Component or module (e.g., `uidTypes`, `diffEngine`, `RegistryPage`, `coreStore`)

---

### Pull Request Template

**Title:** Same as commit message for single-commit PRs, or summary for multi-commit.

**Description:**
```markdown
## What
Brief summary of the change (1-2 sentences).

## Why
Rationale, problem being solved, user value.

## How to Test
1. Step-by-step instructions to verify locally
2. Include sample data if needed
3. Expected outcomes

## Risks
- Any breaking changes?
- Performance implications?
- Edge cases to watch?

## Screenshots (if UI change)
Before / After screenshots

## Checklist
- [ ] Typecheck passes (`npx tsc --noEmit`)
- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (if applicable)
- [ ] Build succeeds (`npm run build`)
- [ ] Docs updated (if API/schema change)
```

**Review Time:** Aim for <24h on working days. Tag reviewer explicitly.

---

## Definition of Done Checklists

### Backend Feature (George)

- [ ] **Types defined:** All new types in `uidTypes.ts` or relevant file
- [ ] **Unit tests:** >80% coverage for new logic
- [ ] **Integration test:** End-to-end flow works (import → resolve → diff → persist)
- [ ] **Migration:** If schema changed, migration logic provided + tested
- [ ] **Performance:** Large file handling tested (1000+ rows)
- [ ] **Docs:** API contract documented if consumed by frontend
- [ ] **Typecheck:** `npx tsc --noEmit` passes
- [ ] **Build:** `npm run build` succeeds
- [ ] **No regressions:** Existing tests still pass

---

### Frontend Feature (Edwin)

- [ ] **Component:** Reusable, well-typed, no hardcoded data
- [ ] **Styling:** Dark mode support, responsive design
- [ ] **Accessibility:** Keyboard nav, ARIA labels, screen reader friendly
- [ ] **Selectors:** All interactive elements have `data-testid`
- [ ] **Playwright test:** Critical user flow covered
- [ ] **Manual test:** Verified in browser (Chrome + Firefox)
- [ ] **Typecheck:** `npx tsc --noEmit` passes
- [ ] **Build:** `npm run build` succeeds
- [ ] **No regressions:** Existing E2E tests still pass

---

### Cross-Cutting Feature (George + Edwin)

- [ ] **Contract agreed:** Backend API + data schema finalized
- [ ] **Backend complete:** Unit tested, migration provided (if schema change)
- [ ] **Frontend complete:** UI implemented, Playwright test added
- [ ] **Integration verified:** Full user flow works (backend → UI → persistence → reload)
- [ ] **Docs updated:** ROADMAP.md, execution plan, decision log (if architectural)
- [ ] **Both owners reviewed:** George approved backend, Edwin approved UI
- [ ] **All tests green:** Unit + integration + E2E
- [ ] **Demo-able:** Can show working feature to stakeholders

---

## Handling Ambiguity & Data Quality Regressions

### Principle: Never Ignore Bad Data

**If you see:**
- Import warnings increasing
- Ambiguous items in diff
- PLANT_UNKNOWN appearing frequently
- Unlinked entities piling up

**Do NOT:**
- ❌ Ignore and ship
- ❌ Auto-resolve silently
- ❌ Assume "user error"

**DO:**
1. **Investigate:** Is this a data issue or a bug in our logic?
2. **Reproduce:** Get sample file, reproduce warning locally
3. **Decide:**
   - **Data issue:** Document in warning message, suggest fix to user
   - **Bug:** File issue, assign to owner, fix promptly
4. **Track:** Add metric (% imports with warnings) to monitor regression
5. **Communicate:** If widespread, notify stakeholders

---

### Data Quality Metrics to Monitor

**Import Health:**
- % imports with zero warnings (target: >80%)
- % ambiguous items per import (target: <5%)
- % imports with PLANT_UNKNOWN (target: <10%)
- Avg time to resolve ambiguities (target: <2 min)

**Registry Health:**
- % entities inactive and not seen in 30+ days (cleanup candidates)
- % alias rules created manually vs. auto (manual = user friction)
- % unlinked entities (tools without valid station)

**Track in:**
- Import History UI (aggregate stats)
- Monthly review (George + Edwin)
- Adjust roadmap if quality degrades

---

## Code Review Guidelines

### For Authors

**Before Requesting Review:**
- [ ] Self-review (read your own diff, catch obvious issues)
- [ ] All checklist items complete (tests, typecheck, build)
- [ ] Clear PR description (What/Why/How to Test)
- [ ] Screenshots if UI change
- [ ] No WIP commits (squash if messy history)

**During Review:**
- Respond to feedback within 24h
- Ask clarifying questions if unclear
- Don't take feedback personally (we're reviewing code, not you)
- If you disagree, explain rationale (may lead to better solution)

---

### For Reviewers

**What to Look For:**
- **Correctness:** Does it do what it claims? Are there edge cases missed?
- **Maintainability:** Is it readable? Would I understand this in 6 months?
- **Performance:** Any O(n²) loops? Large array copies? DB queries in loops?
- **Testing:** Are tests meaningful? Do they cover edge cases?
- **Security:** Any SQL injection, XSS, command injection risks?
- **UX:** (for UI) Is it intuitive? Accessible? Dark mode compatible?

**How to Give Feedback:**
- Be specific: "Extract this into a helper function" (not "this is messy")
- Be kind: "Consider..." (not "You should have...")
- Be constructive: Suggest alternatives if rejecting an approach
- Praise good work: "Nice test coverage!" (positive reinforcement)

**Review SLA:**
- P0 (blocking release): <4h
- Normal PR: <24h on working days
- Large PR (>500 lines): <48h (or ask to split)

---

## Branching & Merging Strategy

### Branch Naming

**Format:** `<type>/<short-description>`

**Examples:**
- `feat/registry-ui`
- `fix/diff-engine-plantkey`
- `test/keyderivation-coverage`
- `docs/phase1-execution-plan`

### Main Branch Protection

**Rules:**
- No direct commits to `main`
- All changes via PR
- At least 1 approval required (George for backend, Edwin for UI)
- CI must pass (typecheck, tests, build)

### Merge Strategy

**Squash Merge (Preferred):**
- For multi-commit PRs with messy history
- Results in single commit on `main`
- Commit message = PR title + description summary

**Rebase Merge:**
- For clean, atomic commits
- Preserves commit history
- Use when commits are already well-structured

**No Merge Commits:**
- Avoid "Merge branch X into Y" commits
- Keep history linear

---

## CI/CD Pipeline (Future)

**Current:** Manual local testing before merge.

**Planned:**
1. **On PR:**
   - Typecheck (`npx tsc --noEmit`)
   - Unit tests (`npm test`)
   - Build (`npm run build`)
   - Playwright (critical flows only, <5 min)
2. **On Merge to Main:**
   - Full test suite (unit + integration + E2E)
   - Build + deploy to staging
   - Smoke test on staging
3. **On Release Tag:**
   - Build production bundle
   - Deploy to production
   - Run smoke tests
   - Monitor for errors (1h)

**Until CI Automated:**
- Run all checks locally before merging
- Tag reviewer to verify if unsure

---

## Debugging Guidelines

### When Something Breaks

**1. Reproduce Locally:**
- Get exact steps, sample data, environment details
- Reproduce bug in local dev environment
- Verify it's not environment-specific

**2. Isolate Root Cause:**
- Add console.logs or debugger breakpoints
- Check recent commits (git log, git blame)
- Bisect if needed (git bisect)

**3. Write Failing Test:**
- Unit test or E2E test that reproduces bug
- Verify test fails before fixing

**4. Fix + Verify:**
- Implement fix
- Verify failing test now passes
- Verify no regressions (other tests still pass)

**5. Document:**
- Add comment explaining non-obvious fix
- Update docs if behavior changed
- Add to known issues if workaround needed

---

## Performance Optimization Workflow

**When to Optimize:**
- User reports slowness
- Profiling shows bottleneck
- Large file imports (>1000 rows) lag

**Process:**
1. **Measure First:** Use Chrome DevTools profiler, measure baseline
2. **Identify Bottleneck:** CPU? Memory? Disk I/O?
3. **Hypothesize:** What change would improve performance?
4. **Implement:** Make targeted change
5. **Measure Again:** Verify improvement (>20% speedup = worthwhile)
6. **Trade-offs:** Did readability suffer? Add comments.

**Common Optimizations:**
- Index lookups (use Map instead of array.find)
- Batch updates (upsert 100 records at once, not 1 at a time)
- Lazy loading (don't load all 10k records upfront)
- Memoization (cache expensive computations)

**Avoid Premature Optimization:**
- Don't optimize before measuring
- Readability > performance (unless bottleneck proven)

---

## Release Workflow (Manual for Now)

**Before Release:**
1. Run full test suite locally (unit + E2E)
2. Build production bundle (`npm run build`)
3. Manual smoke test (critical user flows)
4. Update version in package.json
5. Tag release: `git tag v1.0.0`
6. Push tag: `git push origin v1.0.0`

**After Release:**
1. Monitor errors (check logs, warnings panel)
2. Run smoke tests on deployed site
3. Verify key flows (import, registry, audit trail)
4. Rollback plan ready (revert to previous tag)

**Rollback Process:**
- Identify bad release
- Revert to previous tag (`git checkout v0.9.0`)
- Rebuild + redeploy
- Investigate issue offline, fix, re-release

---

**Last Updated:** 2026-01-07
**Maintained By:** George + Edwin
