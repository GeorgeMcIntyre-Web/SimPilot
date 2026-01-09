# Release Checklist

## Purpose

Ensure every release is stable, tested, and safe to deploy. Follow this checklist before merging to main and after deploying to production.

---

## Pre-Merge Checklist

### Code Quality

- [ ] **Typecheck passes:** `npx tsc --noEmit` (zero errors)
- [ ] **Unit tests pass:** `npm test` (all green)
- [ ] **Build succeeds:** `npm run build` (no errors, warnings acceptable if documented)
- [ ] **Linting clean:** `npm run lint` (or auto-fix enabled)
- [ ] **No debug code:** Remove `console.log`, `debugger`, commented code
- [ ] **No secrets:** No API keys, passwords, or sensitive data in code

### Testing

- [ ] **Unit test coverage:** New code has >80% coverage
- [ ] **Integration test:** End-to-end flow verified (import → persist → reload)
- [ ] **Playwright (if UI change):** Critical user flows pass
- [ ] **Manual smoke test:** Test in local browser (Chrome + Firefox)
- [ ] **Dark mode verified:** Toggle dark mode, verify UI renders correctly
- [ ] **Responsive design:** Test on desktop + tablet + mobile (Chrome DevTools)

### Documentation

- [ ] **CHANGELOG updated:** Add entry for user-facing changes
- [ ] **README updated:** If installation/usage changed
- [ ] **API docs updated:** If backend contract changed
- [ ] **Decision log updated:** If architectural decision made
- [ ] **Roadmap status updated:** Mark work packages complete if applicable

### Review

- [ ] **PR approved:** George (backend) or Edwin (UI) approved
- [ ] **All feedback addressed:** No unresolved review comments
- [ ] **CI green:** All automated checks pass (if CI configured)

---

## Post-Merge Checklist (Before Deploy)

### Pre-Deployment

- [ ] **Main branch updated:** Pull latest, verify your changes merged
- [ ] **Build production bundle:** `npm run build` (production mode)
- [ ] **Verify bundle size:** Check dist/ size, flag if >2x increase
- [ ] **Test production build locally:** `npm run preview`, verify no errors

### Smoke Test (Local Production Build)

- [ ] **App loads:** No console errors on page load
- [ ] **Import flow:** Upload Excel → see diff → verify persistence
- [ ] **Registry flow:** Navigate to /registry → view entities → search/filter
- [ ] **Audit trail:** Navigate to /audit-trail → see entries (if applicable)
- [ ] **Dark mode:** Toggle theme, verify no layout breaks
- [ ] **Logout/login:** Verify auth flow (if applicable)

---

## Post-Deployment Checklist

### Immediate Verification (First 15 Minutes)

- [ ] **Site accessible:** Navigate to deployed URL, page loads
- [ ] **No console errors:** Open DevTools, check for errors
- [ ] **Critical flow works:** Upload Excel → see import in history
- [ ] **Registry loads:** Navigate to /registry, verify data visible
- [ ] **Performance acceptable:** Page load <3s, interactions responsive

### Functional Verification (First Hour)

- [ ] **Import Excel:** Upload real Tool List, verify diff displayed
- [ ] **View import history:** Navigate to /import-history, see all imports
- [ ] **Activate/Deactivate entity:** Click action, verify status changes
- [ ] **Add alias rule:** Manually add alias, re-import, verify applied
- [ ] **Persistence:** Reload page, verify data survives
- [ ] **Dark mode:** Toggle theme, verify persists on reload

### Monitoring (First 24 Hours)

- [ ] **Error logs:** Check logs for 500 errors, exceptions
- [ ] **Warning panel:** Navigate to /warnings, verify no critical warnings
- [ ] **User reports:** Monitor chat/email for bug reports
- [ ] **Performance:** No significant slowdown vs. previous release
- [ ] **Storage:** IndexedDB size reasonable (not exponential growth)

---

## Rollback Plan

### When to Rollback

**Trigger Conditions:**
- Critical bug blocking user workflow (imports fail, data loss)
- Site down or inaccessible (500 errors, infinite loops)
- Data corruption (entities disappearing, incorrect links)
- Performance degradation (>10x slower than previous)

### Rollback Process

**Step 1: Confirm Rollback Decision**
- Verify issue is release-related (not environment/data issue)
- Check if hotfix possible (<30 min) vs. full rollback
- Notify team: "Rolling back to v1.0.0 due to [issue]"

**Step 2: Revert to Previous Tag**
```bash
git checkout v1.0.0   # Previous stable release
npm install           # Restore dependencies
npm run build         # Build production bundle
# Deploy via your deployment process
```

**Step 3: Verify Rollback**
- [ ] Site accessible
- [ ] Critical flows work
- [ ] No errors in console
- [ ] User reports stop

**Step 4: Investigate & Fix Offline**
- Reproduce issue locally on bad release
- Write failing test
- Implement fix
- Verify fix on local build
- Re-release when ready (new version)

**Step 5: Communicate**
- Notify users: "Issue resolved, site stable on v1.0.0"
- Post-mortem: What happened? How to prevent?
- Update DECISION_LOG.md if process change needed

---

## Known Issues & Workarounds

**Current Known Issues:**
- (None at launch)

**Format for Future:**
```
### Issue: [Short Title]
**Affects:** [Pages/features affected]
**Symptoms:** [What user sees]
**Workaround:** [Temporary fix]
**Fix Status:** [Planned for v1.1.0 / In progress / Investigating]
**Ref:** [GitHub issue #123]
```

---

## Production Health Checks (Monthly)

### Data Quality Review

- [ ] **Import success rate:** >95% imports complete without errors
- [ ] **Warning rate:** <20% imports have warnings
- [ ] **Ambiguity rate:** <5% imports have ambiguous items
- [ ] **PLANT_UNKNOWN rate:** <10% imports missing plant context
- [ ] **Unlinked entities:** <5% tools without valid station

### Performance Review

- [ ] **Import time:** <5s for 1000-row Excel
- [ ] **Page load time:** <3s for /import-history, /registry
- [ ] **Storage growth:** IndexedDB size <100MB for typical project
- [ ] **Memory usage:** <500MB after typical usage session

### User Feedback Review

- [ ] **Bug reports:** Triage all reported bugs (P0/P1/P2)
- [ ] **Feature requests:** Log in backlog, prioritize by value
- [ ] **Usability issues:** Identify friction points, plan improvements

### Dependency Updates

- [ ] **Security patches:** Update dependencies with known vulnerabilities
- [ ] **Major version updates:** Review breaking changes, plan migration
- [ ] **Deprecated APIs:** Replace usage before removal

---

## Emergency Contacts

**Production Issues:**
- **George:** [contact info] - Backend/data issues
- **Edwin:** [contact info] - UI/E2E issues
- **Escalation:** [manager contact] - Critical downtime

**Deployment Access:**
- **Hosting:** [platform name + access instructions]
- **Logs:** [log viewer URL + credentials]
- **Monitoring:** [monitoring dashboard URL]

---

## Post-Release Retrospective (After Each Phase)

**Questions to Ask:**
1. What went well? (celebrate wins)
2. What didn't go well? (identify friction)
3. What should we do differently next time? (process improvements)
4. Did we meet phase acceptance criteria? (verify completeness)
5. User feedback? (incorporate into next phase)

**Output:**
- Update WORKFLOW.md with lessons learned
- Update ROADMAP.md with adjusted timeline/scope
- Update DECISION_LOG.md with new architectural insights

---

**Last Updated:** 2026-01-07
**Maintained By:** George + Edwin
