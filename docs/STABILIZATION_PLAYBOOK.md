# SimPilot Stabilization Playbook

## Quick Reference
- **Production URL**: https://simpilot.pages.dev
- **Tech Stack**: React 19 + TypeScript + Vite + Tailwind + Cloudflare Pages
- **Node Version**: >=20.0.0
- **Package Manager**: npm >=10.0.0

## Local Development

### Prerequisites
```bash
node --version  # Should be >=20
npm --version   # Should be >=10
```

### Setup
```bash
git clone [repo-url]
cd SimPilot
npm install
```

### Run Development Server
```bash
npm run dev
# Opens on http://localhost:5173
```

### Run Tests
```bash
# Unit tests (Vitest)
npm test

# Unit tests with coverage
npm test -- --coverage

# E2E tests (Playwright)
npm run test:e2e

# E2E tests in UI mode (for debugging)
npx playwright test --ui
```

### Build & Preview
```bash
# Production build
npm run build

# Preview production build locally
npm run preview
# Opens on http://localhost:4173
```

### Linting
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Production Verification

### After Each Deployment

1. **Visit Landing Page**: https://simpilot.pages.dev
   - Should load without errors
   - Console should be clean (no uncaught exceptions)

2. **Load Demo Data**
   - Navigate to Data Loader
   - Select "STLA Sample" demo
   - Click "Load Demo Data"
   - Verify success message appears

3. **Check Dashboard**
   - Navigate to Dashboard
   - Verify KPI tiles show non-zero values
   - Verify "Areas Overview" section renders
   - Verify Stations Table populates

4. **Test Persistence**
   - Load demo data
   - Refresh browser (F5)
   - Data should persist (not reload to empty state)

5. **Spot-Check Key Routes**
   - Dashboard: `/dashboard`
   - Simulation: `/simulation`
   - Assets: `/assets`
   - Data Loader: `/data-loader`
   - Engineers: `/engineers`

### Manual Smoke Test Checklist
- [ ] Landing page loads (no console errors)
- [ ] Demo data loads successfully
- [ ] Dashboard shows data after load
- [ ] Station detail drawer opens/closes
- [ ] Data persists after page refresh
- [ ] Navigation between routes works
- [ ] Clear Data resets application

## Known Risks & Mitigations

### Risk 1: IndexedDB Quota Exceeded
**Impact**: Data persistence fails for users with large datasets

**Mitigation**:
- Monitor snapshot size in production
- Add export/import JSON fallback (planned)
- Show friendly error if quota exceeded
- Current demo data: ~100-200KB (well within limits)

### Risk 2: Browser Compatibility (IndexedDB)
**Impact**: Persistence may not work on older browsers

**Mitigation**:
- Gracefully degrade (app still works without persistence)
- Test on Chrome, Firefox, Edge, Safari
- IndexedDB supported in 95%+ of browsers

### Risk 3: Demo Data Load Failure
**Impact**: Users cannot try the app without real data

**Mitigation**:
- Demo data is bundled (no network dependency)
- Fallback error message directs to Local Files tab
- Multiple demo scenarios available

### Risk 4: Excel Ingestion Edge Cases
**Impact**: User-uploaded files may fail to parse

**Mitigation**:
- Comprehensive error handling in ingestion layer
- Warnings Page shows validation errors
- Data Health page shows linking stats
- Clear error messages guide users

### Risk 5: Auth Provider Downtime (Google/MS)
**Impact**: Users cannot log in

**Mitigation**:
- App runs in dev mode without auth
- Auth is optional (can be disabled via env)
- Fallback to local-only mode

## Rollback Procedure

### Cloudflare Pages Rollback
1. Visit Cloudflare Pages dashboard
2. Go to Deployments tab
3. Find last known good deployment
4. Click "..." menu → "Rollback to this deployment"
5. Confirm rollback

### Git Rollback (if needed)
```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to specific commit (use cautiously)
git reset --hard <commit-sha>
git push --force origin main  # Only if safe and approved!
```

## Release Checklist

### Pre-Release
- [ ] All CI checks passing on main branch
- [ ] Unit tests pass locally
- [ ] E2E tests pass locally
- [ ] Build completes without errors
- [ ] No TypeScript errors (`npm run build` clean)
- [ ] ESLint warnings reviewed (< 10 acceptable)
- [ ] Test production build locally (`npm run preview`)

### Post-Release
- [ ] Production URL loads successfully
- [ ] Run manual smoke test checklist (above)
- [ ] Check browser console for errors
- [ ] Verify demo data flow works end-to-end
- [ ] Spot-check 3-5 key user workflows
- [ ] Verify persistence works (refresh test)

### Emergency Contacts
- **Engineering Lead**: [Name/Email]
- **Product Owner**: [Name/Email]
- **Cloudflare Account Owner**: [Name/Email]

## Troubleshooting

### Build Fails Locally
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### E2E Tests Fail
```bash
# Reinstall Playwright browsers
npx playwright install --with-deps

# Run in headed mode to debug
npx playwright test --headed

# Run specific test
npx playwright test tests/e2e/ui-smoke.spec.ts
```

### TypeScript Errors
```bash
# Check for type errors
npx tsc --noEmit

# Strict mode enabled - no unused locals/params allowed
```

### Data Not Persisting
- Check browser console for IndexedDB errors
- Verify browser supports IndexedDB
- Try clearing browser data and reloading demo
- Check browser storage quota (DevTools → Application → Storage)

### Playwright Tests Timing Out
- Increase timeout in playwright.config.ts
- Check if local server is running (`npm run preview`)
- Verify port 4173 is not blocked by firewall
- Run with `--debug` flag to step through

## Performance Monitoring

### Key Metrics to Watch
- **Bundle Size**: Target < 500KB gzipped (check build output)
- **Initial Load Time**: Target < 3s (Lighthouse)
- **Time to Interactive**: Target < 5s
- **Station Table Render**: Target < 1s for 100 stations

### Current Bundle Sizes
```bash
# Check after each build
npm run build
# Review dist/ folder sizes
```

### Lighthouse CI (Future)
- Consider adding Lighthouse CI to workflow
- Track performance budget over time
- Set up alerts for regressions

## Architecture Notes

### State Management
- **Primary Store**: `coreStore` (src/domain/coreStore.ts)
- **Pattern**: Subscription-based in-memory store
- **Persistence**: IndexedDB via `idb` library
- **Auto-save**: 2-second debounce
- **Schema Version**: APP_STATE_VERSION constant

### Data Flow
```
User Action → Store Update → Subscribers Notified → UI Re-renders
                ↓
         Auto-save (debounced)
                ↓
            IndexedDB
```

### Key Features Already Implemented
- ✅ IndexedDB persistence (v0.4)
- ✅ Error boundary (top-level)
- ✅ Logging utilities
- ✅ CI pipeline (unit + e2e + build)
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ UID-backed linking (schema v3) - See section below

### Tech Debt Backlog
- Reduce console.log usage (in progress)
- Add toast/notification system
- Add 404 route handling
- Add export/import JSON for data backup
- Consider Lighthouse CI integration

## Deployment

### Cloudflare Pages Configuration
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Node Version**: 20
- **Environment Variables**: Set in Cloudflare dashboard
  - `VITE_APP_ENV=production`
  - Auth keys (Google/MS OAuth)

### Branch Deployments
- **main**: Auto-deploys to production (https://simpilot.pages.dev)
- **Preview**: Pull requests auto-deploy to preview URLs
- **Production**: Always points to latest main commit

### Build Time
- Expected: 2-4 minutes
- Includes: npm install, unit tests, build, e2e tests

## UID-Backed Linking System

### Overview
SimPilot uses **stable UIDs** to track stations, tools, and robots across Excel imports, even when station numbers change during planning-to-as-built transitions.

**Problem Solved:**
- Station labels change (e.g., "010" → "010A" during renumbering)
- Identity split across columns (Line + Bay + StationNo vs "AL010")
- Tools/robots become orphaned when station IDs break

**Solution:**
- Each entity gets an immutable UID (`st_<uuid>`, `tl_<uuid>`, `rb_<uuid>`)
- Canonical keys derived from Excel columns (deterministic)
- Alias rules map old keys → UIDs (user-confirmed)
- Diff engine detects CRUD + rename/move on import

### Key Concepts

**UID (Unique Identifier):**
- Immutable: `st_01234567-89ab-cdef-0123-456789abcdef`
- Never changes, even when entity renamed/moved
- Generated on first import using `crypto.randomUUID()`

**Canonical Key:**
- Deterministic string from Excel: `"AL_010-010"`, `"REAR UNIT|010"`
- Built from: Line + Bay + Station OR Area + Station OR StationLabel
- **Can change over time** (this is expected and handled)

**Alias Rules:**
- User-confirmed mappings: `{fromKey: "CA_008-010", toUid: "st_abc..."}`
- Created when user resolves ambiguous renames
- Persisted so future imports don't re-ask

### Import Flow

```
1. Parse Excel → normalize rows
2. For each row:
   a. Derive canonical key (buildStationKey)
   b. Resolve to UID:
      - Check aliasRules: fromKey → toUid
      - Check stationRecords: key → uid (exact match)
      - Otherwise: create new UID
   c. Repeat for tools (buildToolKey, resolveToolUid)
3. Compute diff:
   - Compare prev records vs new records
   - Classify: create, update, delete, rename
4. Persist:
   - Upsert stationRecords, toolRecords
   - Save aliasRules (if any)
   - Record importRun
```

### Schema (v3)

**New Collections:**
- `stationRecords`: StationRecord[] (uid, key, labels, status, timestamps)
- `toolRecords`: ToolRecord[] (uid, key, stationUid, labels, status)
- `robotRecords`: RobotRecord[] (uid, key, stationUid, labels, status)
- `aliasRules`: AliasRule[] (fromKey, toUid, entityType, reason)
- `importRuns`: ImportRun[] (id, sourceFile, counts, timestamps)

**Migration v2 → v3:**
- New collections initialized as empty arrays
- Old snapshots continue to load without errors
- No data loss, backward compatible

### Handling Station Renumbering

**Scenario:** Planning phase has "Station 010", as-built changes to "Station 010A"

**Without UIDs (old behavior):**
```
Import 1: stationId = "REAR UNIT|010"
Import 2: stationId = "REAR UNIT|10A"  ← NEW ID, tools orphaned!
```

**With UIDs (new behavior):**
```
Import 1:
  key = "REAR UNIT|010"
  uid = "st_abc123..."

Import 2:
  key = "REAR UNIT|10A"  ← Key changed
  Resolved to uid = "st_abc123..." (via alias rule or user decision)

Result: Tools remain linked to same uid
```

### Interpreting Diffs

**DiffResult Structure:**
```typescript
{
  creates: [
    { key: "BN_012-020", attributes: {...}, suggestedName: "BN012" }
  ],
  updates: [
    { uid: "st_xyz", key: "AL_010-010", changedFields: ["oemModel"] }
  ],
  deletes: [
    { uid: "st_old", key: "CA_008-005", lastSeen: "2024-01-15..." }
  ],
  renamesOrMoves: [
    {
      oldKey: "CA_008-010",
      newKey: "CA_008-010A",
      uid: "st_abc",
      confidence: 100,
      matchReasons: ["Same UID"]
    }
  ],
  ambiguous: []  // Future: requires user decision
}
```

**What Each Means:**
- **Create**: New station/tool not seen before → New UID assigned
- **Update**: Same UID, attributes changed (OEM model, tool count, etc.)
- **Delete**: UID missing in new import → Marked inactive (soft delete)
- **Rename/Move**: Same UID, key changed → Entity renamed/renumbered

### When Things Go Wrong

**"Ambiguous" Items (Future Feature):**
- Multiple candidates match a new key
- Low confidence score (< 80%)
- User must manually choose: "Same entity" OR "Create new"

**Orphaned Tools:**
- If tool's station key can't resolve to stationUid
- Check: aliasRules for missing mapping
- Check: stationRecords for typo in key
- Reported as warning: "Unlinked station reference: 'AL_010-020'"

**Alias Rules Not Working:**
- Verify fromKey matches exactly (case-sensitive after normalization)
- Check entityType matches ('station', 'tool', 'robot')
- Check rule was persisted (look in IndexedDB snapshot)

### Development Commands

**Run Unit Tests:**
```bash
npm test -- keyDerivation.test.ts
npm test -- diffEngine.test.ts
```

**Check Schema Version:**
```bash
# Should show CURRENT_SNAPSHOT_SCHEMA_VERSION = 3
grep CURRENT_SNAPSHOT_SCHEMA_VERSION src/domain/storeSnapshot.ts
```

**Inspect Persisted Data:**
```bash
# Browser DevTools → Application → IndexedDB → SimPilotDB → snapshots → latest
# Check meta.schemaVersion = 3
# Check stationRecords, toolRecords exist
```

### Known Limitations

1. **Canonical name column missing in Excel**
   - This is the real long-term fix
   - UIDs are a workaround until OEM standardizes Excel

2. **Ambiguous resolution UI not yet implemented**
   - Currently: ambiguous items skipped
   - Future: UI to show candidates and user choice

3. **Split/merge not detected**
   - One station → two stations not automatically handled
   - User must manually create new entities

4. **Alias rule accumulation**
   - Rules grow over time with historical mappings
   - Once Excel improves, we sunset this system

### Future: Canonical Name in Excel

**When OEM adds "Station_ID" column:**
- Import as canonical key directly (no derivation)
- UID system simplifies (1:1 key→uid mapping)
- Alias rules only for historical data
- Key derivation becomes fallback for legacy files

### Detailed Documentation

See [docs/UID_BACKED_LINKING.md](./UID_BACKED_LINKING.md) for full architecture details, entity structures, and migration strategy.

## Support

### Bug Reports
- GitHub Issues: [repo-url]/issues
- Include steps to reproduce
- Include browser/OS version
- Include console errors (if any)

### Feature Requests
- GitHub Discussions or Issues
- Describe use case and expected behavior
- Consider contributing a PR

## Version History

### v0.4 (Current)
- IndexedDB persistence
- Auto-save functionality
- Multiple demo scenarios
- Simulation page
- Assets page
- TypeScript strict mode enabled

### v0.3
- Excel ingestion engine
- Dashboard improvements
- Engineer workflows
- Data Health page

### v0.2
- Initial dashboard
- Project/Cell navigation
- Basic auth integration

### v0.1
- MVP proof of concept
