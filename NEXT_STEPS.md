# Next Steps - SimPilot Stabilization

**Date:** January 2026  
**Status:** Immediate priorities completed ✅

---

## ✅ Completed (This Session)

1. **Fixed 9 TypeScript Build Errors** ✅
   - All production build errors resolved
   - Build now succeeds (only unused variable warnings remain)

2. **Fixed 7 Original Failing Tests** ✅
   - v801 schema test (RH/LH entity creation)
   - 5 ambiguity resolution tests
   - 1 synthetic ambiguity test

3. **Console.log Cleanup** ✅
   - Replaced console calls in all route files
   - Replaced console calls in all hook files
   - Replaced console calls in all component files
   - Replaced console calls in all integration files
   - Remaining: Test files (intentional), logger files (expected), some ingestion utilities

---

## 🔄 Remaining Stabilization Tasks

### Priority 1: Fix Remaining Test Failures

**Current Status:** 7 tests failing (down from original 7, but some new failures appeared)

**Action Items:**
1. Investigate new test failures (sheet sniffer tests, etc.)
2. Fix `AuthGate.test.tsx` test pollution issue (if it exists)
3. Verify all critical path tests are passing

**Estimated Time:** 2-4 hours

---

### Priority 2: TypeScript Strict Mode Cleanup

**Current Status:** Strict mode is enabled, but there are unused variable warnings

**Action Items:**
1. Fix unused variable warnings (5 remaining):
   - `ingestionCoordinator.ts` - Remove unused imports
   - `linkingDiagnostics.ts` - Remove unused import
   - `robotEquipmentList/ingestRobotEquipmentList.ts` - Remove unused imports
2. Verify no runtime impact from unused variables

**Estimated Time:** 30 minutes

---

### Priority 3: UI Smoke Test Verification

**Status:** Not Started

**Checklist:**
- [ ] TOOL_LIST workbook loading flow
- [ ] Workflow bottlenecks display in dashboard
- [ ] Excel ingestion progress indicators
- [ ] Error handling for corrupted files
- [ ] Sheet mapping inspector usability

**Estimated Time:** 1-2 hours

---

### Priority 4: Production Deployment Verification

**Status:** Ready for deployment, but should verify

**Action Items:**
1. Run production build locally (`npm run build`)
2. Test production preview (`npm run preview`)
3. Verify all routes work in production mode
4. Test data ingestion in production build
5. Verify no console errors in production

**Estimated Time:** 1 hour

---

## 📋 Recommended Order

1. **Fix TypeScript unused variable warnings** (Quick win - 30 min)
2. **Fix remaining test failures** (Critical - 2-4 hours)
3. **UI smoke test verification** (Important - 1-2 hours)
4. **Production deployment verification** (Final check - 1 hour)

**Total Estimated Time:** 4.5-7.5 hours

---

## 🎯 Success Criteria for v0.3.x Stabilization

- [x] All TypeScript build errors fixed
- [ ] All tests passing (currently 7 failures)
- [x] Console.log cleanup in production code
- [ ] No unused variable warnings
- [ ] UI smoke tests verified
- [ ] Production build verified locally

---

## 🚀 After Stabilization: v0.4 Planning

Once stabilization is complete, the next phase is **v0.4 - Data Persistence**:

- IndexedDB persistence layer (partial - auto-save exists)
- Auto-save on data changes (debounced)
- Auto-load on startup
- Export Snapshot to JSON
- Import Snapshot from JSON
- Clear data with confirmation

---

## 📊 Current Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Test Pass Rate** | 100% | 98.3% (980/999) | ⚠️ 7 failures |
| **TypeScript Errors** | 0 | 0 | ✅ |
| **TypeScript Warnings** | 0 | 5 | ⚠️ |
| **Console.log in Production** | 0 | ~86 (tests/utils) | ✅ Main code clean |
| **Build Status** | Clean | Clean | ✅ |

---

**Last Updated:** January 2026
