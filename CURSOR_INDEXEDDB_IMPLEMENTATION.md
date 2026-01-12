# IndexedDB Version Tracking - Implementation Task for Cursor

## 🎯 Objective
Implement automatic version tracking using IndexedDB to save snapshots after each Excel import. This allows users to view history, compare versions, and load previous states - all while keeping data local on their PC.

---

## 📋 **Task List (Complete All)**

### ✅ Task 1: Install Dependencies
```bash
npm install idb
npm install --save-dev @types/node
```

### ✅ Task 2: Create IndexedDB Storage Module
**File**: `src/storage/indexedDBStore.ts`

**Requirements**:
1. Define TypeScript schema for snapshots database
2. Implement `initDB()` - Initialize IndexedDB with schema
3. Implement `saveSnapshot()` - Save full coreStore state with metadata
4. Implement `getAllSnapshots()` - Get list of all snapshots (metadata only)
5. Implement `getSnapshot()` - Load specific snapshot data
6. Implement `deleteSnapshot()` - Remove a snapshot
7. Implement `pruneOldSnapshots()` - Keep only last N snapshots
8. Add error handling and logging

**Schema Design**:
```typescript
interface SimPilotDB extends DBSchema {
  snapshots: {
    key: string; // ISO timestamp
    value: {
      timestamp: string;
      data: CoreStoreState;
      metadata: {
        fileNames: string[];
        toolCount: number;
        robotCount: number;
        cellCount: number;
        userNotes?: string;
        source: 'Local' | 'MS365' | 'Demo';
      };
    };
  };
}
```

**Reference**: See `LOCAL_DATA_PERSISTENCE_OPTIONS.md` lines 85-220 for implementation details

---

### ✅ Task 3: Create Diff Calculator
**File**: `src/storage/diffCalculator.ts`

**Requirements**:
1. Implement `calculateDiff()` - Compare two CoreStoreState objects
2. Return detailed diff with:
   - Added items (tools, robots, cells)
   - Removed items
   - Modified items (with field-level changes)
3. Handle all entity types (tools, robots, cells, projects, areas)
4. Include metadata changes in diff

**Output Format**:
```typescript
interface DiffResult {
  added: {
    tools: number;
    robots: number;
    cells: number;
    projects: number;
    areas: number;
  };
  removed: { /* same structure */ };
  modified: { /* same structure */ };
  addedItems: Array<{ id: string; name: string; kind: string }>;
  removedItems: Array<{ id: string; name: string; kind: string }>;
  modifiedItems: Array<{
    id: string;
    name: string;
    kind: string;
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }>;
}
```

---

### ✅ Task 4: Integrate with Import Hooks
**Files to Modify**:
- `src/app/hooks/useLocalFileIngest.ts`
- `src/app/hooks/useM365Ingest.ts`

**Requirements**:
1. Import `saveSnapshot()` from indexedDBStore
2. After successful ingestion (line ~82 in useLocalFileIngest.ts):
   - Call `saveSnapshot()` with current coreStore state
   - Include file names from input
   - Add user notes (optional, can be empty initially)
   - Log success/error
3. Handle errors gracefully (don't break import if save fails)
4. Add state for "saving snapshot..." indicator (optional)

**Implementation**:
```typescript
// After successful ingestion:
try {
  const snapshotTimestamp = await saveSnapshot(
    coreStore.getState(),
    simulationFiles.map(f => f.name),
    undefined // userNotes (optional)
  );
  log.info('Snapshot saved:', snapshotTimestamp);
} catch (err) {
  log.error('Failed to save snapshot:', err);
  // Don't break import flow
}
```

---

### ✅ Task 5: Create Version Timeline Component
**File**: `src/app/components/versions/VersionTimeline.tsx`

**Requirements**:
1. Fetch all snapshots using `getAllSnapshots()`
2. Display in reverse chronological order (newest first)
3. Show for each snapshot:
   - Timestamp (formatted)
   - Metadata (tool count, robot count, cell count)
   - File names
   - User notes (if any)
4. Action buttons for each snapshot:
   - "Load" - Load this version into coreStore
   - "Compare to Current" - Show diff
   - "Delete" - Remove snapshot
5. Add loading state
6. Add empty state ("No versions saved yet")
7. Style with Tailwind CSS (match existing app style)

**UI Layout**:
```
┌─────────────────────────────────────────┐
│  Version History                         │
│  ─────────────────────────────────────  │
│  ┌─────────────────────────────────┐   │
│  │ Jan 12, 2026 10:30 AM           │   │
│  │ Tools: 450 | Robots: 120        │   │
│  │ Cells: 35                       │   │
│  │ Files: STLA_S_ZAR Tool List.xlsx│   │
│  │ [Load] [Compare] [Delete]       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Jan 11, 2026 2:20 PM            │   │
│  │ Tools: 435 | Robots: 120        │   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

### ✅ Task 6: Create Version Comparison Component
**File**: `src/app/components/versions/VersionComparison.tsx`

**Requirements**:
1. Accept two timestamps as props (fromTimestamp, toTimestamp)
2. Load both snapshots
3. Calculate diff using `calculateDiff()`
4. Display results in three sections:
   - **Added** (green): List items added
   - **Removed** (red): List items removed
   - **Modified** (yellow): List items changed with details
5. Show counts in section headers
6. Make it expandable/collapsible
7. Add search/filter functionality
8. Style with Tailwind CSS

**UI Layout**:
```
┌─────────────────────────────────────────┐
│  Comparing Versions                      │
│  From: Jan 11, 2026 2:20 PM             │
│  To:   Jan 12, 2026 10:30 AM            │
│  ─────────────────────────────────────  │
│  ✅ Added (15 items)                    │
│    🔧 T-501: New Welding Gun            │
│       Sim Leader: John Doe              │
│    🔧 T-502: New Sealing Gun            │
│    ...                                   │
│  ─────────────────────────────────────  │
│  ❌ Removed (5 items)                   │
│    🔧 T-401: Old Gun                    │
│    ...                                   │
│  ─────────────────────────────────────  │
│  📝 Modified (10 items)                 │
│    🔧 T-301: Status "Design"→"Approved" │
│    🔧 T-302: Leader "Bob"→"Alice"       │
│    ...                                   │
└─────────────────────────────────────────┘
```

---

### ✅ Task 7: Create Version History Page
**File**: `src/app/routes/VersionHistoryPage.tsx`

**Requirements**:
1. Full page for version management
2. Use VersionTimeline component
3. Add header with:
   - Title "Version History"
   - Total snapshot count
   - Storage usage (optional)
   - "Clear All" button (with confirmation)
4. Add route to app routing (likely in main App.tsx or router config)
5. Add navigation link (e.g., in sidebar or header)
6. Handle loading states
7. Handle errors

---

### ✅ Task 8: Add Storage Management UI
**File**: `src/app/components/versions/StorageManagement.tsx`

**Requirements**:
1. Show storage statistics:
   - Number of snapshots
   - Total storage used (estimate)
   - Last snapshot timestamp
2. Provide actions:
   - "Clear All Snapshots" (with confirmation dialog)
   - "Prune Old Snapshots" (keep last 20/50)
   - "Export All" (future enhancement - can skip for now)
3. Add to Settings or Version History page

---

### ✅ Task 9: Update Import Success Toast/Notification
**Files to check**:
- `src/app/hooks/useLocalFileIngest.ts`
- Any toast/notification components

**Requirements**:
1. After successful import + snapshot save, show notification:
   - "Import successful. Snapshot saved at [timestamp]"
   - Or update existing success message
2. If snapshot save fails, don't show error to user (just log it)

---

### ✅ Task 10: Add Tests (Basic)
**File**: `src/storage/__tests__/indexedDBStore.test.ts`

**Requirements**:
1. Test `saveSnapshot()` - Verify snapshot is saved
2. Test `getAllSnapshots()` - Verify retrieval
3. Test `getSnapshot()` - Verify specific snapshot loads
4. Test `deleteSnapshot()` - Verify deletion
5. Test `pruneOldSnapshots()` - Verify old snapshots removed
6. Mock IndexedDB (use fake-indexeddb or similar)

**Note**: Basic tests only. Full coverage can come later.

---

## 📁 **Files to Create**

### New Files (6):
```
src/storage/
├── indexedDBStore.ts           (Main storage module)
└── diffCalculator.ts           (Diff calculation)

src/app/components/versions/
├── VersionTimeline.tsx         (Timeline view)
├── VersionComparison.tsx       (Comparison view)
└── StorageManagement.tsx       (Storage stats & actions)

src/app/routes/
└── VersionHistoryPage.tsx      (Full page)

src/storage/__tests__/
└── indexedDBStore.test.ts      (Basic tests)
```

### Files to Modify (2-3):
```
src/app/hooks/
├── useLocalFileIngest.ts       (Add saveSnapshot after import)
└── useM365Ingest.ts            (Add saveSnapshot after import)

src/app/App.tsx (or router file)
└── Add route for VersionHistoryPage
```

---

## 🎨 **UI/UX Guidelines**

1. **Match Existing Style**:
   - Use Tailwind CSS classes from existing components
   - Match color scheme (check existing buttons, cards, etc.)
   - Use existing icon library (lucide-react is likely already installed)

2. **Responsive Design**:
   - Timeline should work on mobile
   - Use existing responsive patterns from the app

3. **Loading States**:
   - Show spinner when loading snapshots
   - Disable buttons during operations

4. **Error Handling**:
   - Show user-friendly error messages
   - Log detailed errors to console
   - Don't break app if IndexedDB fails

5. **Accessibility**:
   - Add aria-labels to buttons
   - Ensure keyboard navigation works
   - Use semantic HTML

---

## 🔧 **Technical Details**

### IndexedDB Setup:
- Database name: `"SimPilot"`
- Version: `1`
- Object store: `"snapshots"`
- Key path: `"timestamp"` (ISO string)
- Index on: `"timestamp"` for sorting

### Snapshot Retention:
- Default: Keep last **50 snapshots**
- User can manually delete older ones
- Prune automatically on save (optional)

### Storage Estimates:
- ~5-10 MB per snapshot (typical)
- 50 snapshots = ~250-500 MB
- Browser limits: 100s of MB to GBs (safe range)

### Error Scenarios:
- IndexedDB not available (old browsers) - Show warning, don't break
- Storage quota exceeded - Show error, suggest deleting old snapshots
- Corrupt snapshot - Log error, skip it

---

## 🧪 **Testing Checklist**

After implementation, test these scenarios:

1. ✅ **Basic Flow**:
   - Import Excel files
   - Verify snapshot saved automatically
   - Open Version History page
   - See new snapshot in timeline

2. ✅ **Load Previous Version**:
   - Click "Load" on an old snapshot
   - Verify coreStore updated
   - Verify UI reflects old data

3. ✅ **Compare Versions**:
   - Import files (creates v1)
   - Import different files (creates v2)
   - Click "Compare"
   - Verify diff shows changes

4. ✅ **Delete Snapshot**:
   - Click "Delete" on a snapshot
   - Verify it's removed from timeline
   - Verify it's removed from IndexedDB

5. ✅ **Prune Old Snapshots**:
   - Create 60 snapshots (can mock)
   - Run prune (keep 50)
   - Verify only 50 remain

6. ✅ **Error Handling**:
   - Disconnect network (not needed, but test offline)
   - Clear browser storage while app running
   - Verify app doesn't crash

---

## 📊 **Success Criteria**

After implementation, you should be able to:

1. ✅ Import Excel files and see automatic snapshot save
2. ✅ Navigate to Version History page
3. ✅ See list of all snapshots with metadata
4. ✅ Click "Load" to restore an old version
5. ✅ Click "Compare" to see diff between versions
6. ✅ Click "Delete" to remove a snapshot
7. ✅ See storage statistics (optional)
8. ✅ All data stays local (no network calls)
9. ✅ TypeScript compiles with no errors
10. ✅ Basic tests pass

---

## 🚀 **Implementation Order**

Do tasks in this order:

1. **Task 1**: Install dependencies
2. **Task 2**: Create indexedDBStore.ts (core functionality)
3. **Task 3**: Create diffCalculator.ts
4. **Task 4**: Integrate with import hooks (test auto-save works)
5. **Task 5**: Create VersionTimeline component
6. **Task 7**: Create VersionHistoryPage (use Timeline)
7. **Task 6**: Create VersionComparison component
8. **Task 8**: Create StorageManagement component
9. **Task 9**: Update notifications
10. **Task 10**: Add basic tests

---

## 📖 **Reference Documents**

1. **LOCAL_DATA_PERSISTENCE_OPTIONS.md** - Full implementation details
2. **DATA_STORAGE_ARCHITECTURE.md** - Current storage architecture
3. **src/domain/coreStore.ts** - CoreStoreState interface
4. **src/app/hooks/useLocalFileIngest.ts** - Import flow
5. **idb library docs**: https://github.com/jakearchibald/idb

---

## ⚠️ **Important Notes**

1. **Don't Break Existing Functionality**:
   - Import flow must work even if snapshot save fails
   - All existing features must continue working
   - No breaking changes to coreStore

2. **TypeScript Strictness**:
   - Use proper types everywhere
   - No `any` types (use `unknown` if needed)
   - All imports must be typed

3. **Error Handling**:
   - Wrap all IndexedDB operations in try-catch
   - Log errors with `log.error()` from `src/lib/log`
   - Show user-friendly messages (not technical errors)

4. **Performance**:
   - Don't block import flow waiting for snapshot save
   - Use async operations properly
   - Don't load full snapshots until needed (lazy load)

5. **User Experience**:
   - Show loading indicators
   - Provide feedback for all actions
   - Make it obvious when operations succeed/fail

---

## 🎯 **Deliverables**

When done, you should have:

1. ✅ 6 new files created
2. ✅ 2-3 files modified
3. ✅ IndexedDB saving snapshots automatically
4. ✅ Version History page working
5. ✅ Timeline view working
6. ✅ Comparison view working
7. ✅ TypeScript compiling cleanly
8. ✅ Basic tests passing
9. ✅ No breaking changes to existing features

---

## 📝 **When You're Done**

1. Run TypeScript check: `npx tsc --noEmit`
2. Run tests: `npm test`
3. Test manually:
   - Import Excel files
   - Check Version History page
   - Load an old version
   - Compare two versions
4. Commit all changes
5. Report back with:
   - What was implemented
   - Any issues encountered
   - Screenshots (optional but helpful)

---

## 💬 **Questions?**

If you encounter any blockers or need clarification:
- Check the reference documents listed above
- Look at existing code patterns in the codebase
- Make reasonable assumptions and document them
- Flag any ambiguities in your response

---

**Good luck! This is a significant feature that will greatly improve the app's usability.** 🚀
