# SimPilot v0.3 Acceptance Checklist

**Version:** 0.3 - Excel Bottlenecks  
**Date:** 2024  
**Status:** Ready for acceptance testing

---

## 1. Core Capabilities

This section documents what SimPilot can do in v0.3. Anything not listed here is considered future-scope.

### A. Excel Ingestion & Mapping

1. **Load Simulation Status workbook(s)**
   - Uses: `ExcelIngestionFacade` → simulation status tables
   - Result: Sim list with status, phase, engineer, due dates, etc.

2. **Load TOOL_LIST workbook(s)**
   - Uses: `toolingListParser`, `toolingSnapshotBuilder`, `excelIngestionOrchestrator`
   - Result: Tooling snapshot with tools, weld guns, robots, cells, lines

3. **Run the universal Excel engine (fieldRegistry / sheetProfiler / fieldMatcher)**
   - Uses: `src/excel/*` (128 tests already passing)
   - Result: Columns auto-mapped to canonical fields for all supported sheet types

4. **Merge multiple workbooks into one data model**
   - Uses: `excelIngestionOrchestrator.load*FromWorkbooks(...)`
   - Result: Single in-memory model for dashboards / cross-ref

5. **Data health checks on ingested data**
   - Uses: data health utilities / analytics page
   - Result: Missing station/robot/tool flags, duplicate IDs, etc.

---

### B. Cross-reference & Analytics

6. **Build cross-ref between Simulations, Tools, Robots, Weld Guns, Risers**
   - Uses: `CrossRefEngine`, `workflowMappers`, domain cross-ref code
   - Result: Each simulation knows which tools / robots / lines it touches

7. **Compute workflow bottlenecks**
   - Uses: workflow bottleneck engine + mappers
   - Result: Ranked bottlenecks by area / engineer / phase / checklist items

8. **Compute Excel ingestion "field coverage" / quality**
   - Uses: `fieldRegistry`, `fieldMatcher`, data-quality scoring
   - Result: % of fields mapped, quality tiers for sheets

---

### C. UI / Dashboards

9. **Simulation Dashboard**
   - Shows: sims by status, phase, health, bottlenecks
   - Panels: overall status, key bottlenecks, "today" focus for Dale

10. **Simulation List + Detail Drawer**
    - Filter / search simulations
    - Open detail drawer to see linked tools, robots, guns, risers, checklists

11. **Assets / Tooling page**
    - Filterable list of tools / weld guns / robots, with details

12. **Data Health page**
    - Visual view of data issues from ingestion (missing / duplicate / inconsistent)

13. **Workflow bottleneck panels on dashboard**
    - New integration: bottlenecks driven by Excel ingestion + tooling snapshot

14. **Excel Mapping / Inspection (where wired)**
    - Mapping inspector / overrides hook (Agent 3 work) for debugging mappings

---

### D. Platform / Infrastructure

15. **Run full build + tests locally**
    - `npm run build`
    - `npm test -- --run src/excel/__tests__/ src/domain/__tests__/ src/ingestion/__tests__/`

16. **Cloudflare deploy from main**
    - Uses: `dist/` Vite build, Node 20 engines, `_redirects` for SPA

---

## 2. Acceptance Checklist

Minimal "does it work?" checklist for each capability. Use this as your **smoke-sheet** for Dale and for future agents.

### A. Ingestion

- [ ] **Simulation Status load works**
  - **UI Test:** Start dev server → load Simulation Status workbook in Data Loader
  - **Expected:** Sim list populated, counts look sane
  - **Automated Test:**
    ```bash
    npm test -- --run src/domain/__tests__/ExcelIngestionFacade.test.ts
    ```

- [ ] **TOOL_LIST load works**
  - **UI Test:** Load a TOOL_LIST workbook (STLA / Ford file)
  - **Expected:** Tools + guns + robots visible on tooling / bottleneck views
  - **Automated Test:**
    ```bash
    npm test -- --run src/ingestion/__tests__/toolListParser.test.ts
    ```

- [ ] **Universal Excel engine is healthy**
  - **UI Test:** No UI action needed beyond normal loads
  - **Automated Test:**
    ```bash
    npm test -- --run src/excel/__tests__/
    ```

- [ ] **Data health flags appear**
  - **UI Test:** After ingest, open Data Health page
  - **Expected:** Missing / duplicate items flagged; no crashes

---

### B. Cross-reference & Bottlenecks

- [ ] **Cross-ref wiring is correct**
  - **UI Test:** Pick a simulation → open detail drawer
  - **Expected:** Correct tools / robots / guns listed (spot-check against Excel)
  - **Automated Test:**
    ```bash
    npm test -- --run src/domain/__tests__/workflowMappers.test.ts
    ```

- [ ] **Bottlenecks show up on dashboard**
  - **UI Test:** Dashboard after loading data
  - **Expected:** Bottleneck panel populated; clicking takes you to relevant sims / cells

---

### C. UI Basics

- [ ] **Simulation list / filters**
  - **UI Test:** Use filters (status / phase / engineer)
  - **Expected:** Filtered rows update; no console errors

- [ ] **Assets / tooling page**
  - **UI Test:** Browse + filter tools
  - **Expected:** Counts / names match TOOL_LIST content

- [ ] **Data Health page**
  - **UI Test:** Page loads even with bad / incomplete data
  - **Expected:** No white screens; issues clearly listed

- [ ] **Excel mapping inspector (if wired)**
  - **UI Test:** Open mapping inspector after ingest
  - **Expected:** Columns are mapped to reasonable fields; overrides persist

---

### D. Infrastructure

- [ ] **Local "full run"**
  ```bash
  npm run build
  npm test -- --run src/excel/__tests__/ src/domain/__tests__/ src/ingestion/__tests__/
  ```
  - **Expected:** Build succeeds, all tests pass

- [ ] **Cloudflare deployment**
  - [ ] Merge `fix/cloudflare-deploy` PR
  - [ ] Wait for deploy check on `main`
  - [ ] If red → copy first real error line for fix
  - [ ] If green → open live URL and re-do a short smoke test (load TOOL_LIST + see bottlenecks)

---

## 3. Testing Workflow

### Step 1: Local Testing
1. Run through items 1–6 + 11 locally and tick them off
2. Document any issues found

### Step 2: Cloudflare Deployment
1. Raise + merge `fix/cloudflare-deploy` PR (if not already merged)
2. Wait for Cloudflare deploy check on `main`
3. If deployment fails, copy first real error line for analysis
4. If deployment succeeds, proceed to Step 3

### Step 3: Production Smoke Test
1. Open live Cloudflare Pages URL
2. Repeat UI steps (items 1–4, 6, 7–10) on the live site
3. Verify all functionality works in production environment

---

## 4. Known Limitations

- **Data Storage:** Browser-only (not shared between users)
- **Bundle Size:** Some chunks > 500KB (optimization opportunity)
- **Parser Warnings:** Some rows may be skipped during ingestion (non-blocking)

---

## 5. Sign-off

**Tester:** _________________  
**Date:** _________________  
**Status:** ☐ Passed  ☐ Failed  ☐ Partial  
**Notes:** _________________

---

## Notes for Future Agents

- This checklist represents the **minimum viable acceptance** for v0.3
- All items should be testable with the current codebase
- If an item fails, document the failure and create a GitHub issue
- Focus on **functional correctness**, not perfection
- UI polish and optimization are future-scope unless they block core functionality

