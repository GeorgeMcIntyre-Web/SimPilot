# Branching Strategy

## Goals

- **Clear feature isolation**: Each work package or feature on its own branch
- **Parallel development**: George and Edwin can work independently
- **Safe integration**: Merge to main only when feature complete + tested
- **Easy rollback**: Revert a feature without affecting others
- **Scalable**: Works for 2 developers now, 10+ developers later

---

## Branch Structure

### Main Branch: `main`

**Purpose:** Production-ready code only. Always stable, always deployable.

**Rules:**
- ✅ All changes via Pull Request (no direct commits)
- ✅ Requires approval (George for backend, Edwin for UI)
- ✅ CI must pass (typecheck, tests, build)
- ✅ Must pass Definition of Done checklist
- ❌ No WIP code, no broken features
- ❌ No merge commits (squash or rebase only)

**Protection:**
- Branch protection enabled on GitHub
- Minimum 1 approval required
- Status checks must pass

---

### Feature Branches

**Naming Convention:** `<phase>/<work-package>/<short-description>`

**Examples:**
```
phase0/wp1/identity-linking
phase0/wp2/diff-engine
phase0/wp3/import-history-ui
phase1/wp2/registry-core-views
phase1/wp3/registry-actions
```

**Format Breakdown:**
- `<phase>`: `phase0`, `phase1`, `phase2`, etc.
- `<work-package>`: `wp1`, `wp2`, etc. (from execution plan)
- `<short-description>`: kebab-case, 2-4 words max

**Why This Format:**
- ✅ Clear which phase feature belongs to
- ✅ Maps directly to roadmap work packages
- ✅ Easy to find related branches (`git branch --list 'phase0/*'`)
- ✅ Obvious what feature is being worked on

---

### Hotfix Branches

**Naming Convention:** `hotfix/<short-description>`

**Examples:**
```
hotfix/fix-import-crash
hotfix/registry-search-bug
```

**When to Use:**
- Critical bug in production (P0/P1 severity)
- Needs immediate fix, cannot wait for next feature branch
- Bypasses normal feature workflow (faster review, deploy)

**Process:**
1. Branch from `main`: `git checkout -b hotfix/fix-import-crash main`
2. Fix bug + add regression test
3. PR to `main` (tag reviewer with "HOTFIX" label)
4. Fast-track review (<4h)
5. Merge + deploy immediately
6. Monitor for 1 hour post-deploy

---

### Release Branches (Optional, for Later)

**Naming Convention:** `release/v1.0.0`

**When to Use:**
- When ready to stabilize for production release
- Allows bug fixes on release while `main` continues with new features
- Typically used for major versions

**Not Needed Yet:** Single main branch is sufficient for Phase 0/1. Consider for Phase 2+.

---

## Workflow by Developer

### George's Typical Workflow (Backend)

**Start New Work Package:**
```bash
git checkout main
git pull origin main
git checkout -b phase0/wp1/identity-linking
```

**Work Incrementally:**
```bash
# Implement UID types
git add src/domain/uidTypes.ts
git commit -m "feat(uidTypes): add StationRecord with UID and plantKey"

# Implement key derivation
git add src/ingestion/keyDerivation.ts
git commit -m "feat(keyDerivation): add buildStationKey with 3 strategies"

# Add tests
git add src/ingestion/__tests__/keyDerivation.test.ts
git commit -m "test(keyDerivation): add coverage for all strategies"
```

**Push + Open PR:**
```bash
git push origin phase0/wp1/identity-linking
# Open PR on GitHub: phase0/wp1/identity-linking -> main
# Use PR template, tag Edwin if contract affects UI
```

**After Merge:**
```bash
git checkout main
git pull origin main
git branch -d phase0/wp1/identity-linking  # Delete local branch
```

---

### Edwin's Typical Workflow (UI)

**Start New Work Package:**
```bash
git checkout main
git pull origin main
git checkout -b phase0/wp3/import-history-ui
```

**Work Incrementally:**
```bash
# Add Playwright test (failing)
git add tests/e2e/import-history.spec.ts
git commit -m "test(import-history): add E2E test for import list view"

# Implement Import History page
git add src/app/routes/ImportHistoryPage.tsx
git commit -m "feat(ImportHistoryPage): add import list with status badges"

# Add diff viewer component
git add src/components/import/DiffViewer.tsx
git commit -m "feat(DiffViewer): add expandable diff detail view"

# Verify Playwright test passes
git add tests/e2e/import-history.spec.ts
git commit -m "test(import-history): verify E2E test passes"
```

**Push + Open PR:**
```bash
git push origin phase0/wp3/import-history-ui
# Open PR on GitHub: phase0/wp3/import-history-ui -> main
# Use PR template, add screenshots
```

**After Merge:**
```bash
git checkout main
git pull origin main
git branch -d phase0/wp3/import-history-ui
```

---

## Handling Dependencies Between Work Packages

### Scenario: Edwin's WP3 depends on George's WP2

**Problem:** Edwin needs DiffResult schema from George's WP2 (Diff Engine) to build Import History UI (WP3).

**Solution 1: Sequential (Safest)**
1. George completes WP2, merges to `main`
2. Edwin starts WP3 after WP2 merged
3. Edwin branches from latest `main` (has WP2 code)

**Solution 2: Parallel with Draft Contract (Faster)**
1. George and Edwin agree on DiffResult schema upfront (document in issue or PR comment)
2. George starts WP2 branch: `phase0/wp2/diff-engine`
3. Edwin starts WP3 branch: `phase0/wp3/import-history-ui`
4. Edwin uses agreed schema (may need to adjust when George's PR ready)
5. George merges WP2 first
6. Edwin rebases WP3 on latest `main`, resolves conflicts if schema changed
7. Edwin merges WP3

**Recommendation:** Sequential for Phase 0 (safer). Parallel for Phase 1+ (faster, once familiar).

---

## Handling Conflicts

### Edwin and George Both Touch Same File

**Scenario:** Both modify `src/domain/coreStore.ts` on different branches.

**Resolution:**
1. First PR to merge wins (no conflict)
2. Second PR rebases on latest `main` before merging
3. Resolve conflicts locally, test, push

**Rebase Process:**
```bash
# On feature branch
git checkout phase0/wp3/import-history-ui
git fetch origin
git rebase origin/main

# Resolve conflicts if any
# Test: npm test, npx tsc --noEmit, npm run build

git push --force-with-lease origin phase0/wp3/import-history-ui
# Update PR (GitHub shows new commits)
```

**Prevention:**
- Communicate early: "I'm touching coreStore.ts for WP2"
- Small PRs: Merge frequently to reduce conflict window
- Parallel files: George works in `src/domain/`, Edwin in `src/app/routes/`

---

## Branch Lifecycle

### 1. Create Branch
```bash
git checkout main
git pull origin main
git checkout -b phase0/wp1/identity-linking
```

### 2. Develop Incrementally
- Commit often (atomic commits, green at every step)
- Push to remote daily (backup + visibility)
- Sync with `main` if long-lived branch (>3 days)

### 3. Open PR
- Use PR template
- Tag reviewer
- Link to work package in execution plan
- Add screenshots if UI change

### 4. Address Feedback
- Respond to review comments
- Push fixes as new commits (don't force-push during review)
- Re-request review when ready

### 5. Merge to Main
- Squash merge (if messy commits) or rebase merge (if clean commits)
- Delete branch after merge (GitHub can auto-delete)

### 6. Clean Up Locally
```bash
git checkout main
git pull origin main
git branch -d phase0/wp1/identity-linking  # Delete merged branch
```

---

## Long-Lived Branches (Avoid)

**Anti-Pattern:** Feature branch lives for weeks, diverges from `main`, merge conflicts pile up.

**Solution:**
1. **Break into smaller PRs:** WP1.1, WP1.2, WP1.3 (each mergeable independently)
2. **Sync with main regularly:** Rebase every 2-3 days
3. **Use feature flags:** Merge incomplete feature (behind flag), enable when ready

**Example (Feature Flag):**
```typescript
// Phase 1 Registry UI not ready yet, but want to merge incrementally
const ENABLE_REGISTRY = false  // Feature flag

function App() {
  return (
    <>
      {ENABLE_REGISTRY && <Route path="/registry" element={<RegistryPage />} />}
    </>
  )
}
```

Merge partial work, enable flag when complete.

---

## Multi-Developer Scenarios

### Scenario 1: George and Edwin Work on Same Feature (WP3)

**Split Responsibilities:**
- George: Backend (DiffResult computation, persistence) - `phase0/wp3/import-history-backend`
- Edwin: UI (Import History page, Playwright test) - `phase0/wp3/import-history-ui`

**Coordination:**
1. Agree on contract (DiffResult schema)
2. George merges backend first
3. Edwin merges UI second (depends on backend)

---

### Scenario 2: Edwin Needs to Fix Bug in George's Code

**Process:**
1. Edwin files bug report (use template)
2. Triage: Is it backend or UI bug?
3. If backend: Assign to George
4. If urgent: Edwin can fix (with George's review)

**Branch:**
```bash
# Edwin fixes backend bug
git checkout -b hotfix/diff-engine-plantkey-bug
# Fix bug in src/ingestion/diffEngine.ts
# Add regression test
# PR -> Tag George for review
```

---

### Scenario 3: Refactor Touches Many Files

**Strategy:**
1. Create dedicated refactor branch: `refactor/extract-audit-helpers`
2. Refactor only (no new features)
3. Verify all tests still pass (no behavior change)
4. Merge quickly (minimize conflict window)
5. Other branches rebase after refactor merged

---

## CI/CD Integration (Future)

**On PR Open/Update:**
- Run typecheck (`npx tsc --noEmit`)
- Run unit tests (`npm test`)
- Run build (`npm run build`)
- Run Playwright (critical flows only, <5 min)
- Report status to PR (✅ green = good to merge)

**On Merge to Main:**
- Run full test suite (unit + integration + E2E)
- Build production bundle
- Deploy to staging
- Run smoke tests
- If green: Auto-deploy to production (or manual approval)

**Branch Protection:** Require CI green before merge.

---

## Branch Naming Cheatsheet

| Purpose | Format | Example |
|---------|--------|---------|
| Phase 0 feature | `phase0/wp<N>/<desc>` | `phase0/wp1/identity-linking` |
| Phase 1 feature | `phase1/wp<N>/<desc>` | `phase1/wp2/registry-core-views` |
| Hotfix | `hotfix/<desc>` | `hotfix/fix-import-crash` |
| Refactor | `refactor/<desc>` | `refactor/extract-diff-helpers` |
| Docs | `docs/<desc>` | `docs/update-roadmap` |
| Tests | `test/<desc>` | `test/add-playwright-coverage` |

---

## Migration from Current Branch

**Current Branch:** `feature/uid-backed-excel-linking`

**Plan:**
1. Finish current work on `feature/uid-backed-excel-linking`
2. Merge to `main`
3. Switch to new naming convention for future work
4. Delete old branch after merge

**No Need to Rename:** Existing branches can keep old names. Apply new convention going forward.

---

## Best Practices

**DO:**
- ✅ Branch from latest `main`
- ✅ Commit often (atomic, green at every step)
- ✅ Push daily (backup + visibility)
- ✅ Keep branches short-lived (<5 days ideal)
- ✅ Rebase on `main` if branch lives >3 days
- ✅ Delete branch after merge

**DON'T:**
- ❌ Commit directly to `main`
- ❌ Keep branch alive for weeks
- ❌ Force-push during PR review (breaks reviewer's view)
- ❌ Merge without approval
- ❌ Merge with failing tests

---

## Troubleshooting

**Q: I forgot to branch from `main`, now on wrong base.**
```bash
git rebase --onto main <wrong-base> <feature-branch>
```

**Q: I need to rename my branch.**
```bash
git branch -m old-name new-name
git push origin :old-name  # Delete remote old name
git push origin new-name   # Push new name
```

**Q: I accidentally committed to `main`.**
```bash
# If not pushed yet
git checkout -b phase0/wp1/accidental-work
git checkout main
git reset --hard origin/main

# If pushed (contact team before force-push)
```

**Q: Merge conflict during rebase, how to resolve?**
```bash
# Resolve conflicts in files
git add <resolved-files>
git rebase --continue

# If stuck, abort and ask for help
git rebase --abort
```

---

**Last Updated:** 2026-01-07
**Maintained By:** George + Edwin
