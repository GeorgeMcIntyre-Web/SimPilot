# How to Use SimPilot Documentation

## For George (Backend/Architecture)

### Start Here
1. **[ROADMAP.md](roadmap/ROADMAP.md)** - Understand the big picture (Phases 0-4, objectives, success metrics)
2. **[DECISION_LOG.md](roadmap/DECISION_LOG.md)** - Understand why we made key architectural choices

### Daily Work
1. **Check current phase:** [PHASE_0_EXECUTION.md](roadmap/PHASE_0_EXECUTION.md) or [PHASE_1_EXECUTION.md](roadmap/PHASE_1_EXECUTION.md)
2. **Pick a work package:** E.g., WP1 (Identity & Linking) or WP2 (Diff Engine)
3. **Follow Definition of Done:** See acceptance checks in execution plan
4. **Use workflow:** [WORKFLOW.md](team/WORKFLOW.md) for commit/PR/testing guidelines

### Before You Code
- [ ] Read work package scope and acceptance checks
- [ ] Check dependencies (which WPs must complete first?)
- [ ] Review non-goals (what we're NOT doing)
- [ ] Write contract/types first (API, schema, interfaces)
- [ ] Write failing tests

### Before You Merge
- [ ] Complete Definition of Done (Backend) in [WORKFLOW.md](team/WORKFLOW.md#backend-feature-george)
- [ ] Update [DECISION_LOG.md](roadmap/DECISION_LOG.md) if architectural decision made
- [ ] Tag Edwin if contract affects UI (see [OWNERSHIP.md](team/OWNERSHIP.md))
- [ ] Follow [PR template](../.github/pull_request_template.md)

### Before Release
- [ ] Review [RELEASE_CHECKLIST.md](team/RELEASE_CHECKLIST.md)
- [ ] Run pre-merge + post-deployment checks
- [ ] Update roadmap status (mark WPs complete)

---

## For Edwin (Frontend/UI/E2E)

### Start Here
1. **[ROADMAP.md](roadmap/ROADMAP.md)** - Understand the big picture (especially UX goals per phase)
2. **[OWNERSHIP.md](team/OWNERSHIP.md)** - Understand collaboration interfaces (what George provides, what you provide)

### Daily Work
1. **Check current phase:** [PHASE_0_EXECUTION.md](roadmap/PHASE_0_EXECUTION.md) or [PHASE_1_EXECUTION.md](roadmap/PHASE_1_EXECUTION.md)
2. **Pick a UI work package:** E.g., WP3 (Import Review UI) or WP2 (Registry Core Views)
3. **Follow Definition of Done:** See acceptance checks in execution plan
4. **Use workflow:** [WORKFLOW.md](team/WORKFLOW.md) for commit/PR/testing guidelines

### Before You Code
- [ ] Read work package scope and acceptance checks
- [ ] Review backend contract (DiffResult schema, warning format, etc. from George)
- [ ] Write Playwright test first (failing)
- [ ] Design for dark mode + responsive from start
- [ ] Add `data-testid` to all interactive elements

### Before You Merge
- [ ] Complete Definition of Done (Frontend) in [WORKFLOW.md](team/WORKFLOW.md#frontend-feature-edwin)
- [ ] Tag George if UX change affects backend contract
- [ ] Verify Playwright tests pass (stable selectors)
- [ ] Follow [PR template](../.github/pull_request_template.md)

### Before Release
- [ ] Review [RELEASE_CHECKLIST.md](team/RELEASE_CHECKLIST.md)
- [ ] Run smoke tests in all browsers (Chrome, Firefox, Safari)
- [ ] Verify dark mode + responsive on real devices if possible

---

## Quick Reference

### When to Use Each Doc

| Situation | Document to Read |
|-----------|------------------|
| "What's the overall plan?" | [ROADMAP.md](roadmap/ROADMAP.md) |
| "What am I working on this week?" | [PHASE_0_EXECUTION.md](roadmap/PHASE_0_EXECUTION.md) or [PHASE_1_EXECUTION.md](roadmap/PHASE_1_EXECUTION.md) |
| "Why did we decide X?" | [DECISION_LOG.md](roadmap/DECISION_LOG.md) |
| "Whose responsibility is this?" | [OWNERSHIP.md](team/OWNERSHIP.md) |
| "How do I commit/PR/test?" | [WORKFLOW.md](team/WORKFLOW.md) |
| "Ready to release?" | [RELEASE_CHECKLIST.md](team/RELEASE_CHECKLIST.md) |
| "Found a bug, how to report?" | [Bug Report Template](../.github/ISSUE_TEMPLATE/bug_report.md) |
| "How to create branches?" | [BRANCHING_STRATEGY.md](team/BRANCHING_STRATEGY.md) |

---

## Document Maintenance

### Who Updates What

**ROADMAP.md:**
- **George** updates after phase retrospectives (adjust scope, timeline)
- **Both** review quarterly for big-picture changes

**PHASE_X_EXECUTION.md:**
- **George** updates work package status (in progress, complete)
- **Edwin** updates acceptance checks (mark complete)
- **Both** add new WPs if scope expands

**DECISION_LOG.md:**
- **George** adds architectural decisions (schema, linking rules)
- **Edwin** adds UX decisions (navigation, interaction patterns)
- Use template at bottom of file

**OWNERSHIP.md:**
- **Both** update when responsibilities shift
- Review quarterly

**WORKFLOW.md:**
- **Both** update after retrospectives (process improvements)
- Add to "Non-Goals" or "Common Issues" sections as needed

**RELEASE_CHECKLIST.md:**
- **Both** update after each release (lessons learned)
- Add to "Known Issues" when needed

---

## Tips for Success

### George
- **Start with contract:** Define types/interfaces before implementing
- **Test isolation:** Unit test each function (UID resolution, key derivation, diff engine)
- **Document decisions:** Add to DECISION_LOG.md when making architectural choices
- **Communicate early:** Tag Edwin when backend contract changes affect UI

### Edwin
- **Start with Playwright:** Write failing E2E test before implementing UI
- **Stable selectors:** Use `data-testid`, not CSS classes (they change)
- **Dark mode always:** Toggle theme while developing, catch issues early
- **Accessibility matters:** Keyboard nav, ARIA labels, screen reader friendly

### Both
- **Small PRs:** 1 work package at a time, easier to review
- **Atomic commits:** 1 logical change per commit, green at every step
- **Review fast:** <24h turnaround on PRs (unblock each other)
- **Celebrate wins:** Mark WPs complete, note in standup, keep momentum

---

## FAQ

**Q: What if I disagree with a decision in DECISION_LOG.md?**
A: Discuss with team. If decision proves wrong in practice, update log with new entry explaining why we changed course.

**Q: What if a work package is too big?**
A: Split into sub-tasks. Add to execution plan as WP1.1, WP1.2, etc.

**Q: What if we discover new work mid-phase?**
A: Add to "Non-Goals" if out of scope, or create new WP if critical. Update roadmap.

**Q: What if Edwin is blocked on George (or vice versa)?**
A: Communicate immediately (chat/call). Adjust WP order if needed. Pair-program if urgent.

**Q: What if a bug is found after release?**
A: File bug report using template. Triage (P0/P1/P2). Fix promptly if P0/P1. Follow rollback plan if critical.

---

**Last Updated:** 2026-01-07
**Maintained By:** George + Edwin
