# SimPilot v0.4 - Data Persistence Implementation Guide

**Date**: 2026-01-13
**Current Version**: v0.3.x (Stabilized)
**Next Phase**: v0.4 - Data Persistence
**Target Timeline**: February-March 2026

---

## Executive Summary

SimPilot v0.3.x stabilization is complete. The codebase is production-ready with:
- ✅ 797/806 tests passing (98.9%)
- ✅ All critical React Hooks violations fixed
- ✅ Centralized logging infrastructure in place
- ✅ Clean, maintainable code (net -41 lines from cleanup)

**You are now ready to implement v0.4 - Data Persistence features.**

---

## Project Context

### What is SimPilot?
SimPilot is a "Control Tower" for simulation managers in automotive Body-in-White (BIW) manufacturing. It transforms fragmented Excel trackers and SharePoint files into a unified, real-time dashboard for project health, engineer workload, and equipment tracking.

**Core Value**: Zero-configuration ingestion of messy Excel data → Instant visibility into simulation project status.

### Current State (v0.3.x)
- Universal Excel ingestion engine (schema-agnostic)
- Column profiling and fuzzy matching (128 tests)
- Cross-reference linking (Simulations ↔ Tools/Robots/Guns)
- Workflow bottleneck computation
- Dale Console (Manager's Cockpit)
- Data Health page with quality indicators
- Microsoft 365 integration (optional)

### What's Missing?
**Session persistence** - Currently, all data is lost on page refresh. Users must re-upload Excel files every time they return to the app.

---

## v0.4 Goals - Data Persistence

### Target: February-March 2026

Implement browser-based session persistence so users can:
1. Refresh the page without losing data
2. Export their current state as a backup
3. Import previously saved snapshots
4. Clear data when switching projects

### Success Criteria
- ✅ Data survives page refresh
- ✅ Export/Import works for backup
- ✅ Performance: save < 100ms for typical datasets
- ✅ Clear data with confirmation dialog

---

## Technical Implementation Plan

### 1. Foundation (Already Exists!)

The persistence infrastructure is already in place:

#### Core Files
- **[src/persistence/persistenceService.ts](src/persistence/persistenceService.ts)** - Service interface
- **[src/persistence/indexedDbService.ts](src/persistence/indexedDbService.ts)** - IndexedDB implementation
- **[src/persistence/PersistenceManager.tsx](src/persistence/PersistenceManager.tsx)** - React component that manages persistence
- **[src/domain/storeSnapshot.ts](src/domain/storeSnapshot.ts)** - StoreSnapshot schema

#### Current Implementation Status
```typescript
// ✅ ALREADY IMPLEMENTED
class IndexedDbService implements PersistenceService {
  async save(snapshot: StoreSnapshot): Promise<PersistenceResult>
  async load(): Promise<LoadResult>
  async clear(): Promise<PersistenceResult>
}

// ✅ ALREADY IMPLEMENTED
export interface StoreSnapshot {
  version: string
  timestamp: string
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  assets: SimplifiedAsset[]
  engineers: Engineer[]
  // ... more fields
}

// ✅ ALREADY IMPLEMENTED - Auto-save on changes
PersistenceManager.tsx - debounced auto-save (2 seconds)
```

### 2. Features to Implement

#### Feature 2.1: Auto-load on Startup ⚠️ PARTIALLY IMPLEMENTED

**Current State**: PersistenceManager loads data but needs verification.

**Location**: [src/persistence/PersistenceManager.tsx:95-120](src/persistence/PersistenceManager.tsx#L95-L120)

**What's Needed**:
1. Test auto-load functionality thoroughly
2. Handle edge cases (corrupted data, version mismatches)
3. Add loading indicators in UI
4. Verify data restoration accuracy

**Verification Steps**:
```typescript
// Test scenario:
// 1. Load Excel files into SimPilot
// 2. Verify data appears in UI (Dale Console, Assets Page, etc.)
// 3. Refresh browser (F5)
// 4. Verify all data is restored correctly
// 5. Check console for any errors
```

#### Feature 2.2: Export Snapshot to JSON File ⚠️ NOT IMPLEMENTED

**User Story**: "As Dale, I want to export my current SimPilot state to a JSON file so I can create backups or share with team members."

**Implementation Plan**:

```typescript
// Location: Create new file src/persistence/exportImport.ts

/**
 * Export current store snapshot to downloadable JSON file
 */
export async function exportSnapshot(): Promise<void> {
  // 1. Get current snapshot from persistenceService
  const result = await persistenceService.load()

  if (!result.success || !result.snapshot) {
    throw new Error('No data to export')
  }

  // 2. Create JSON blob
  const json = JSON.stringify(result.snapshot, null, 2)
  const blob = new Blob([json], { type: 'application/json' })

  // 3. Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `simpilot-backup-${timestamp}.json`

  // 4. Trigger download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

**UI Integration**:
- Add "Export Backup" button to Data Loader page or Settings
- Show success toast notification after export
- File naming convention: `simpilot-backup-YYYY-MM-DD-HHmmss.json`

#### Feature 2.3: Import Snapshot from JSON File ⚠️ NOT IMPLEMENTED

**User Story**: "As Dale, I want to import a previously exported snapshot so I can restore a backup or load data shared by a colleague."

**Implementation Plan**:

```typescript
// Location: src/persistence/exportImport.ts

/**
 * Import snapshot from JSON file and restore to store
 */
export async function importSnapshot(file: File): Promise<void> {
  // 1. Read file
  const text = await file.text()

  // 2. Parse and validate
  let snapshot: StoreSnapshot
  try {
    snapshot = JSON.parse(text)
  } catch (error) {
    throw new Error('Invalid JSON file')
  }

  // 3. Validate schema
  if (!snapshot.version || !snapshot.timestamp || !snapshot.projects) {
    throw new Error('Invalid snapshot format')
  }

  // 4. Check version compatibility
  if (!isVersionCompatible(snapshot.version)) {
    throw new Error(`Incompatible version: ${snapshot.version}`)
  }

  // 5. Save to IndexedDB
  const result = await persistenceService.save(snapshot)

  if (!result.success) {
    throw new Error(result.errorMessage || 'Failed to import')
  }

  // 6. Restore to Zustand stores
  restoreStoresFromSnapshot(snapshot)
}

/**
 * Restore all Zustand stores from snapshot
 */
function restoreStoresFromSnapshot(snapshot: StoreSnapshot): void {
  coreStore.setState({
    projects: snapshot.projects,
    areas: snapshot.areas,
    cells: snapshot.cells,
    engineers: snapshot.engineers
  })

  assetStore.setState({
    assets: snapshot.assets
  })

  // ... restore other stores
}
```

**UI Integration**:
- Add "Import Backup" button to Data Loader page
- File input that accepts `.json` files only
- Confirmation dialog: "Import will replace all current data. Continue?"
- Show loading spinner during import
- Success/error toast notifications
- Refresh page after successful import to ensure UI sync

#### Feature 2.4: Clear All Data ⚠️ NOT IMPLEMENTED

**User Story**: "As Dale, I want to clear all data when switching to a different project so I start with a clean slate."

**Implementation Plan**:

```typescript
// Location: src/persistence/exportImport.ts

/**
 * Clear all data from IndexedDB and Zustand stores
 */
export async function clearAllData(): Promise<void> {
  // 1. Clear IndexedDB
  const result = await persistenceService.clear()

  if (!result.success) {
    throw new Error(result.errorMessage || 'Failed to clear data')
  }

  // 2. Reset all Zustand stores
  coreStore.setState({
    projects: [],
    areas: [],
    cells: [],
    engineers: []
  })

  assetStore.setState({
    assets: []
  })

  // ... reset other stores
}
```

**UI Integration**:
- Add "Clear All Data" button to Settings or Data Loader page
- ⚠️ **CRITICAL**: Add confirmation dialog with destructive styling
  ```
  Title: "Clear All Data?"
  Message: "This will permanently delete all imported Excel data and cannot be undone."
  Buttons: [Cancel] [Clear Data (Destructive Red)]
  ```
- Success toast: "All data cleared successfully"
- Redirect to Data Loader page after clearing

---

## Implementation Checklist

### Phase 1: Verification & Testing (Week 1)
- [ ] Verify auto-load works correctly on page refresh
- [ ] Test with different data sizes (small, medium, large)
- [ ] Check for edge cases (empty state, corrupted data)
- [ ] Add loading indicators during restore
- [ ] Write unit tests for PersistenceManager

### Phase 2: Export Functionality (Week 2)
- [ ] Create `src/persistence/exportImport.ts`
- [ ] Implement `exportSnapshot()` function
- [ ] Add "Export Backup" button to UI
- [ ] Test export with real data
- [ ] Verify exported JSON is valid
- [ ] Add success toast notification
- [ ] Write unit tests for export

### Phase 3: Import Functionality (Week 3)
- [ ] Implement `importSnapshot()` function
- [ ] Implement `restoreStoresFromSnapshot()` helper
- [ ] Add version compatibility check
- [ ] Add "Import Backup" button with file picker
- [ ] Add confirmation dialog
- [ ] Test import with exported files
- [ ] Handle error cases gracefully
- [ ] Write unit tests for import

### Phase 4: Clear Data (Week 4)
- [ ] Implement `clearAllData()` function
- [ ] Add "Clear All Data" button to Settings
- [ ] Add confirmation dialog with destructive styling
- [ ] Test clearing and verify all stores reset
- [ ] Redirect to Data Loader after clear
- [ ] Write unit tests for clear

### Phase 5: Integration & Polish (Week 5)
- [ ] End-to-end testing of all features
- [ ] Performance testing (measure save/load times)
- [ ] Add UI polish (loading states, animations)
- [ ] Update documentation
- [ ] Create demo video/screenshots
- [ ] Update ROADMAP.md to mark v0.4 complete

---

## Key Files to Work With

### Core Persistence Layer
```
src/persistence/
├── persistenceService.ts      # Service interface (DO NOT MODIFY)
├── indexedDbService.ts        # IndexedDB implementation (COMPLETE ✅)
├── PersistenceManager.tsx     # React component (VERIFY & TEST)
└── exportImport.ts            # NEW FILE - Create this for export/import/clear
```

### Store Schema
```
src/domain/
└── storeSnapshot.ts           # StoreSnapshot type (COMPLETE ✅)
```

### Zustand Stores (For Restore)
```
src/domain/
├── coreStore.ts              # Main store (projects, areas, cells, engineers)
├── assetStore.ts             # Assets store
├── simulationStatusStore.ts  # Simulation status
└── changeLogStore.ts         # Change tracking
```

### UI Integration Points
```
src/app/routes/
├── DataLoaderPage.tsx        # Add Export/Import/Clear buttons here
└── SettingsPage.tsx          # Alternative location for Clear button
```

---

## Technical Considerations

### 1. Version Compatibility

**Problem**: Snapshots from older versions may have different schemas.

**Solution**: Implement version checking and migration.

```typescript
const CURRENT_VERSION = '0.4.0'

function isVersionCompatible(snapshotVersion: string): boolean {
  const [major, minor] = snapshotVersion.split('.').map(Number)
  const [currentMajor, currentMinor] = CURRENT_VERSION.split('.').map(Number)

  // Allow same major version, any minor version
  return major === currentMajor
}

// Future: Add migration functions if schema changes
function migrateSnapshot(snapshot: StoreSnapshot): StoreSnapshot {
  // Handle schema migrations here
  return snapshot
}
```

### 2. Performance Optimization

**Target**: Save < 100ms for typical datasets

**Current Implementation**: Already debounced at 2 seconds ([PersistenceManager.tsx:127](src/persistence/PersistenceManager.tsx#L127))

**Monitoring**: Add performance logging.

```typescript
async function save(snapshot: StoreSnapshot): Promise<PersistenceResult> {
  const startTime = performance.now()

  const result = await persistenceService.save(snapshot)

  const duration = performance.now() - startTime
  log.debug(`[Persistence] Save completed in ${duration.toFixed(2)}ms`)

  if (duration > 100) {
    log.warn(`[Persistence] Save took ${duration.toFixed(2)}ms (target: <100ms)`)
  }

  return result
}
```

### 3. Error Handling

**Critical**: Don't lose data due to errors!

**Best Practices**:
- Always use try-catch blocks
- Show user-friendly error messages
- Log detailed errors for debugging
- Provide fallback options (retry, skip, cancel)

```typescript
try {
  await importSnapshot(file)
  showToast('Data imported successfully', 'success')
} catch (error) {
  log.error('[Import] Failed to import snapshot:', error)
  showToast(
    `Import failed: ${error.message}. Please check the file and try again.`,
    'error'
  )
}
```

### 4. Testing Strategy

**Unit Tests** (Vitest):
```typescript
describe('exportSnapshot', () => {
  it('should create downloadable JSON blob', async () => {
    // Mock persistenceService.load
    // Call exportSnapshot()
    // Verify blob creation and download trigger
  })

  it('should throw error when no data exists', async () => {
    // Mock empty state
    // Expect error
  })
})
```

**Integration Tests**:
- Test full cycle: Load Excel → Export → Clear → Import → Verify
- Test with real-world data samples
- Test error recovery scenarios

**Manual Testing Checklist**:
- [ ] Export with different data sizes
- [ ] Import exported files
- [ ] Clear all data
- [ ] Page refresh persistence
- [ ] Browser compatibility (Chrome, Firefox, Edge)
- [ ] Error scenarios (corrupted files, network issues)

---

## UI/UX Guidelines

### Button Placement

**Data Loader Page** ([src/app/routes/DataLoaderPage.tsx](src/app/routes/DataLoaderPage.tsx)):
```tsx
<div className="flex gap-4">
  <Button onClick={handleExport} variant="outline">
    <Download className="mr-2 h-4 w-4" />
    Export Backup
  </Button>

  <Button onClick={handleImportClick} variant="outline">
    <Upload className="mr-2 h-4 w-4" />
    Import Backup
  </Button>

  <Button onClick={handleClearClick} variant="destructive">
    <Trash className="mr-2 h-4 w-4" />
    Clear All Data
  </Button>
</div>

<input
  ref={fileInputRef}
  type="file"
  accept=".json"
  className="hidden"
  onChange={handleFileChange}
/>
```

### Toast Notifications

Use existing toast system (check codebase for implementation):
```typescript
showToast('Data exported successfully', 'success')
showToast('Import failed: Invalid file format', 'error')
showToast('All data cleared', 'info')
```

### Confirmation Dialogs

For destructive actions (Import, Clear):
```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete all imported Excel data and cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmClear} className="bg-red-600">
        Clear Data
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Known Issues & Workarounds

### Issue 1: IndexedDB Quota Limits

**Problem**: Browsers limit IndexedDB storage (typically 50-100MB).

**Workaround**: Monitor storage usage and warn users.

```typescript
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate()
  const percentUsed = (estimate.usage / estimate.quota) * 100

  if (percentUsed > 80) {
    log.warn(`[Storage] ${percentUsed.toFixed(1)}% of quota used`)
    showToast('Storage nearly full. Consider exporting and clearing old data.', 'warning')
  }
}
```

### Issue 2: Version Mismatches

**Problem**: Snapshots from v0.3 may not work in v0.5.

**Solution**: Version checking (implemented above) + migration functions.

---

## Success Metrics

After v0.4 implementation, measure:

1. **Functionality**:
   - ✅ 100% of data restored after page refresh
   - ✅ Export/Import cycle successful
   - ✅ Clear data works without errors

2. **Performance**:
   - ✅ Save time < 100ms (measure with logging)
   - ✅ Load time < 500ms for typical datasets
   - ✅ No UI freezing during save/load

3. **User Experience**:
   - ✅ Clear loading indicators
   - ✅ Helpful error messages
   - ✅ Confirmation dialogs for destructive actions
   - ✅ Success feedback for all operations

---

## Resources & References

### Documentation
- [ROADMAP.md](ROADMAP.md) - v0.4 goals and timeline
- [KNOWN_DEBT.md](KNOWN_DEBT.md) - Known technical debt
- [docs/EXCEL_FILE_STRUCTURES.md](docs/EXCEL_FILE_STRUCTURES.md) - Understanding Excel data

### Key Technologies
- **IndexedDB**: Browser storage API ([MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API))
- **idb library**: Promise wrapper for IndexedDB (already used)
- **Zustand**: State management (already used)
- **React Router**: Navigation (already used)

### Testing Tools
- **Vitest**: Unit testing framework (already configured)
- **React Testing Library**: Component testing (already used)

---

## Next AI Agent Instructions

**Dear Next Agent**,

Your mission is to implement v0.4 Data Persistence for SimPilot. Here's what to do:

### Step 1: Understand the Codebase (30 minutes)
1. Read this document thoroughly
2. Review existing persistence files:
   - [src/persistence/indexedDbService.ts](src/persistence/indexedDbService.ts)
   - [src/persistence/PersistenceManager.tsx](src/persistence/PersistenceManager.tsx)
   - [src/domain/storeSnapshot.ts](src/domain/storeSnapshot.ts)
3. Test the current auto-save by:
   - Loading Excel data
   - Refreshing the page
   - Verifying data persists

### Step 2: Implement Export (Week 2)
1. Create `src/persistence/exportImport.ts`
2. Implement `exportSnapshot()` function
3. Add UI button to Data Loader page
4. Test with real data
5. Write unit tests

### Step 3: Implement Import (Week 3)
1. Implement `importSnapshot()` function
2. Implement `restoreStoresFromSnapshot()` helper
3. Add UI file picker and confirmation dialog
4. Test import cycle (export → import → verify)
5. Write unit tests

### Step 4: Implement Clear (Week 4)
1. Implement `clearAllData()` function
2. Add UI button with destructive styling
3. Add confirmation dialog
4. Test clearing and verify stores reset
5. Write unit tests

### Step 5: Polish & Ship (Week 5)
1. End-to-end testing
2. Performance optimization
3. Error handling improvements
4. Documentation updates
5. Create PR with detailed description

### Critical Reminders
- ⚠️ **ALWAYS** add confirmation dialogs for destructive actions (Import, Clear)
- ⚠️ **NEVER** lose user data - use try-catch everywhere
- ⚠️ **ALWAYS** show loading states for async operations
- ⚠️ **TEST** with real Excel files before marking complete

### Getting Help
- Check [ROADMAP.md](ROADMAP.md) for context
- Review [KNOWN_DEBT.md](KNOWN_DEBT.md) for gotchas
- Follow existing patterns in the codebase
- Use the centralized `log` utility for logging
- Ask user for clarification if requirements are unclear

**Good luck! You've got this! 🚀**

---

## Appendix: Code Snippets

### Complete Export Implementation

```typescript
// src/persistence/exportImport.ts

import { persistenceService } from './indexedDbService'
import { StoreSnapshot } from '../domain/storeSnapshot'
import { log } from '../lib/log'
import { coreStore } from '../domain/coreStore'
import { assetStore } from '../domain/assetStore'
// ... import other stores

const CURRENT_VERSION = '0.4.0'

/**
 * Export current snapshot to downloadable JSON file
 */
export async function exportSnapshot(): Promise<void> {
  try {
    const result = await persistenceService.load()

    if (!result.success || !result.snapshot) {
      throw new Error('No data to export')
    }

    const json = JSON.stringify(result.snapshot, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `simpilot-backup-${timestamp}.json`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    log.info(`[Export] Snapshot exported: ${filename}`)
  } catch (error) {
    log.error('[Export] Failed to export snapshot:', error)
    throw error
  }
}

/**
 * Import snapshot from JSON file
 */
export async function importSnapshot(file: File): Promise<void> {
  try {
    const text = await file.text()
    const snapshot = JSON.parse(text) as StoreSnapshot

    // Validate schema
    if (!snapshot.version || !snapshot.timestamp) {
      throw new Error('Invalid snapshot format')
    }

    // Check version compatibility
    if (!isVersionCompatible(snapshot.version)) {
      throw new Error(`Incompatible version: ${snapshot.version}. Current: ${CURRENT_VERSION}`)
    }

    // Save to IndexedDB
    const saveResult = await persistenceService.save(snapshot)
    if (!saveResult.success) {
      throw new Error(saveResult.errorMessage || 'Failed to save snapshot')
    }

    // Restore to stores
    restoreStoresFromSnapshot(snapshot)

    log.info(`[Import] Snapshot imported successfully from ${file.name}`)
  } catch (error) {
    log.error('[Import] Failed to import snapshot:', error)
    throw error
  }
}

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  try {
    // Clear IndexedDB
    const result = await persistenceService.clear()
    if (!result.success) {
      throw new Error(result.errorMessage || 'Failed to clear IndexedDB')
    }

    // Reset stores
    coreStore.setState({
      projects: [],
      areas: [],
      cells: [],
      engineers: []
    })

    assetStore.setState({
      assets: []
    })

    // ... reset other stores

    log.info('[Clear] All data cleared successfully')
  } catch (error) {
    log.error('[Clear] Failed to clear data:', error)
    throw error
  }
}

/**
 * Check version compatibility
 */
function isVersionCompatible(snapshotVersion: string): boolean {
  try {
    const [major] = snapshotVersion.split('.').map(Number)
    const [currentMajor] = CURRENT_VERSION.split('.').map(Number)
    return major === currentMajor
  } catch {
    return false
  }
}

/**
 * Restore all stores from snapshot
 */
function restoreStoresFromSnapshot(snapshot: StoreSnapshot): void {
  coreStore.setState({
    projects: snapshot.projects || [],
    areas: snapshot.areas || [],
    cells: snapshot.cells || [],
    engineers: snapshot.engineers || []
  })

  assetStore.setState({
    assets: snapshot.assets || []
  })

  // ... restore other stores as needed

  log.info('[Restore] All stores restored from snapshot')
}
```

### UI Integration Example

```tsx
// src/app/routes/DataLoaderPage.tsx

import { useState } from 'react'
import { Download, Upload, Trash } from 'lucide-react'
import { exportSnapshot, importSnapshot, clearAllData } from '../../persistence/exportImport'
import { Button } from '../../ui/components/Button'
import { useToast } from '../../ui/hooks/useToast'
import { AlertDialog } from '../../ui/components/AlertDialog'

export function DataLoaderPage() {
  const { showToast } = useToast()
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      await exportSnapshot()
      showToast('Data exported successfully', 'success')
    } catch (error) {
      showToast(`Export failed: ${error.message}`, 'error')
    }
  }

  const handleImportClick = () => {
    setShowImportDialog(true)
  }

  const handleImportConfirm = () => {
    fileInputRef.current?.click()
    setShowImportDialog(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await importSnapshot(file)
      showToast('Data imported successfully', 'success')
      // Refresh page to ensure UI sync
      window.location.reload()
    } catch (error) {
      showToast(`Import failed: ${error.message}`, 'error')
    }

    // Reset input
    e.target.value = ''
  }

  const handleClearClick = () => {
    setShowClearDialog(true)
  }

  const handleClearConfirm = async () => {
    try {
      await clearAllData()
      showToast('All data cleared successfully', 'success')
      setShowClearDialog(false)
    } catch (error) {
      showToast(`Clear failed: ${error.message}`, 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing content */}

      <div className="flex gap-4">
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Backup
        </Button>

        <Button onClick={handleImportClick} variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Backup
        </Button>

        <Button onClick={handleClearClick} variant="destructive">
          <Trash className="mr-2 h-4 w-4" />
          Clear All Data
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Clear Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all imported Excel data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearConfirm} className="bg-red-600">
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Importing will replace all current data. Make sure you've exported a backup first if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

---

**End of Handoff Document**

Good luck with v0.4 implementation! 🎯
