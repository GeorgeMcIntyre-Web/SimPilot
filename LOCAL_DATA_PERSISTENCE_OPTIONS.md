# Local Data Persistence Options - Keep Excel Local, Track Changes Over Time

## 🎯 Your Requirements:
1. ✅ Excel files stay on user's PC (never uploaded)
2. ✅ Track how import data changes over time
3. ✅ Compare versions (what changed between imports)
4. ✅ View history and trends

---

## 📊 **Recommended Solution: Hybrid Approach**

**Best Practice**: Use **IndexedDB** for data + **LocalStorage** for metadata

### Why This Works:
- ✅ All data stays in browser (never leaves user's PC)
- ✅ Can store 100s of MB of data
- ✅ Can save multiple versions (snapshots)
- ✅ Can query and compare versions
- ✅ Works offline
- ✅ No backend required

---

## 🏆 **OPTION 1: IndexedDB (Recommended) ⭐**

### What It Is:
Browser-based database that can store large amounts of structured data locally.

### Storage Architecture:
```
IndexedDB Database: "SimPilot"
├── Store: "snapshots"
│   ├── Key: "2026-01-12T10:30:00Z" → Full coreStore state
│   ├── Key: "2026-01-11T14:20:00Z" → Previous version
│   └── Key: "2026-01-10T09:15:00Z" → Even older version
│
├── Store: "importMetadata"
│   ├── Key: "import-001" → { timestamp, fileNames, userNotes, changes }
│   └── Key: "import-002" → { timestamp, fileNames, userNotes, changes }
│
└── Store: "comparisons"
    └── Key: "2026-01-12-vs-2026-01-11" → Diff result
```

### Capabilities:
- ✅ **Store unlimited snapshots** (limited by disk space)
- ✅ **100+ MB per snapshot** (enough for large projects)
- ✅ **Query by date/version**
- ✅ **Store diff results** (what changed)
- ✅ **Works offline**
- ✅ **Survives browser refresh**

### Implementation:

```typescript
// File: src/storage/indexedDBStore.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define schema
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
        userNotes?: string;
      };
    };
  };
  comparisons: {
    key: string; // "timestamp1-vs-timestamp2"
    value: {
      from: string;
      to: string;
      diff: DiffResult;
      createdAt: string;
    };
  };
}

// Initialize database
async function initDB(): Promise<IDBPDatabase<SimPilotDB>> {
  return openDB<SimPilotDB>('SimPilot', 1, {
    upgrade(db) {
      // Create snapshots store
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'timestamp' });
        snapshotStore.createIndex('timestamp', 'timestamp');
      }

      // Create comparisons store
      if (!db.objectStoreNames.contains('comparisons')) {
        db.createObjectStore('comparisons', { keyPath: 'key' });
      }
    }
  });
}

// Save snapshot after import
export async function saveSnapshot(
  data: CoreStoreState,
  fileNames: string[],
  userNotes?: string
): Promise<string> {
  const db = await initDB();
  const timestamp = new Date().toISOString();

  const snapshot = {
    timestamp,
    data,
    metadata: {
      fileNames,
      toolCount: data.assets.filter(a => a.kind === 'TOOL').length,
      robotCount: data.assets.filter(a => a.kind === 'ROBOT').length,
      userNotes
    }
  };

  await db.put('snapshots', snapshot);
  return timestamp;
}

// Get all snapshots (for timeline view)
export async function getAllSnapshots(): Promise<Array<{
  timestamp: string;
  metadata: any;
}>> {
  const db = await initDB();
  const snapshots = await db.getAll('snapshots');
  return snapshots.map(s => ({
    timestamp: s.timestamp,
    metadata: s.metadata
  }));
}

// Get specific snapshot
export async function getSnapshot(timestamp: string): Promise<CoreStoreState | null> {
  const db = await initDB();
  const snapshot = await db.get('snapshots', timestamp);
  return snapshot?.data || null;
}

// Compare two snapshots
export async function compareSnapshots(
  timestamp1: string,
  timestamp2: string
): Promise<DiffResult> {
  const db = await initDB();
  const key = `${timestamp1}-vs-${timestamp2}`;

  // Check if we already have this comparison cached
  const cached = await db.get('comparisons', key);
  if (cached) return cached.diff;

  // Load both snapshots
  const snapshot1 = await db.get('snapshots', timestamp1);
  const snapshot2 = await db.get('snapshots', timestamp2);

  if (!snapshot1 || !snapshot2) {
    throw new Error('Snapshots not found');
  }

  // Calculate diff
  const diff = calculateDiff(snapshot1.data, snapshot2.data);

  // Cache the result
  await db.put('comparisons', {
    key,
    from: timestamp1,
    to: timestamp2,
    diff,
    createdAt: new Date().toISOString()
  });

  return diff;
}

// Delete old snapshots (keep last N)
export async function pruneOldSnapshots(keepLast: number = 50): Promise<void> {
  const db = await initDB();
  const snapshots = await db.getAll('snapshots');

  // Sort by timestamp descending
  snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Delete old ones
  const toDelete = snapshots.slice(keepLast);
  for (const snapshot of toDelete) {
    await db.delete('snapshots', snapshot.timestamp);
  }
}
```

### Usage in Import Hook:

```typescript
// src/app/hooks/useLocalFileIngest.ts

import { saveSnapshot } from '../../storage/indexedDBStore';

async function handleIngest() {
  // ... existing ingestion logic ...

  const res = await ingestFiles(input);

  // NEW: Save snapshot to IndexedDB
  const snapshotTimestamp = await saveSnapshot(
    coreStore.getState(),
    simulationFiles.map(f => f.name),
    "Import after design review meeting" // Optional user note
  );

  console.log(`Snapshot saved: ${snapshotTimestamp}`);
}
```

### UI Components Needed:

```typescript
// Component: Version Timeline
function VersionTimelineView() {
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    getAllSnapshots().then(setSnapshots);
  }, []);

  return (
    <div className="timeline">
      {snapshots.map(snap => (
        <div key={snap.timestamp} className="timeline-item">
          <div className="timestamp">{formatDate(snap.timestamp)}</div>
          <div className="metadata">
            <span>Tools: {snap.metadata.toolCount}</span>
            <span>Robots: {snap.metadata.robotCount}</span>
            <span>Files: {snap.metadata.fileNames.join(', ')}</span>
          </div>
          <button onClick={() => loadSnapshot(snap.timestamp)}>
            Load This Version
          </button>
          <button onClick={() => compareWithCurrent(snap.timestamp)}>
            Compare to Current
          </button>
        </div>
      ))}
    </div>
  );
}

// Component: Version Comparison
function VersionComparisonView({ fromTimestamp, toTimestamp }) {
  const [diff, setDiff] = useState(null);

  useEffect(() => {
    compareSnapshots(fromTimestamp, toTimestamp).then(setDiff);
  }, [fromTimestamp, toTimestamp]);

  return (
    <div className="comparison">
      <h3>Changes from {formatDate(fromTimestamp)} to {formatDate(toTimestamp)}</h3>

      <div className="additions">
        <h4>Added ({diff.added.tools} tools, {diff.added.robots} robots)</h4>
        {diff.addedItems.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>

      <div className="removals">
        <h4>Removed ({diff.removed.tools} tools)</h4>
        {diff.removedItems.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>

      <div className="modifications">
        <h4>Modified ({diff.modified.tools} tools)</h4>
        {diff.modifiedItems.map(item => (
          <div key={item.id}>
            <span>{item.name}</span>
            <div className="changes">
              {item.changes.map(change => (
                <div key={change.field}>
                  {change.field}: {change.oldValue} → {change.newValue}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Storage Limits:
- **Chrome/Edge**: ~60% of available disk space
- **Firefox**: ~50% of available disk space
- **Safari**: ~1 GB
- **Practical**: 100-500 MB is comfortable for most projects

### Pros:
- ✅ Large storage capacity (100s of MB)
- ✅ Structured queries (by timestamp, count, etc.)
- ✅ Can store 50-100 snapshots easily
- ✅ Fast queries
- ✅ Automatic indexing
- ✅ Works offline
- ✅ No backend needed

### Cons:
- ⚠️ More complex than LocalStorage
- ⚠️ Async API (but we use `idb` wrapper)
- ⚠️ User can clear browser data

---

## 🥈 **OPTION 2: LocalStorage (Simple, Limited)**

### What It Is:
Simple key-value storage built into browser.

### Storage Architecture:
```javascript
localStorage.setItem('simpilot.snapshots', JSON.stringify({
  'latest': { timestamp: '...', data: {...} },
  'previous': { timestamp: '...', data: {...} },
  'beforePrevious': { timestamp: '...', data: {...} }
}));
```

### Capabilities:
- ✅ **Very simple** to implement
- ✅ **Synchronous API** (easier to use)
- ✅ **Survives browser refresh**
- ❌ **Limited to ~5-10 MB** (not enough for large projects)

### Implementation:

```typescript
// Save snapshot
function saveSnapshot(data: CoreStoreState, label: string) {
  const snapshot = {
    timestamp: new Date().toISOString(),
    label,
    data
  };

  // Get existing snapshots
  const existing = JSON.parse(localStorage.getItem('simpilot.snapshots') || '[]');

  // Add new snapshot (keep last 10)
  existing.unshift(snapshot);
  const limited = existing.slice(0, 10);

  // Save back
  localStorage.setItem('simpilot.snapshots', JSON.stringify(limited));
}

// Load snapshot
function loadSnapshot(timestamp: string): CoreStoreState | null {
  const snapshots = JSON.parse(localStorage.getItem('simpilot.snapshots') || '[]');
  const snapshot = snapshots.find(s => s.timestamp === timestamp);
  return snapshot?.data || null;
}
```

### Pros:
- ✅ Very simple to implement
- ✅ Synchronous API
- ✅ Works immediately
- ✅ No dependencies

### Cons:
- ❌ **Small storage limit** (~5-10 MB)
- ❌ **Can only store ~5-10 snapshots**
- ❌ No structured queries
- ❌ Slower for large data

**Verdict**: Good for **simple projects** or **proof of concept**, but won't scale.

---

## 🥉 **OPTION 3: File System API (User Controls Files)**

### What It Is:
New browser API that lets web apps read/write files with user permission.

### How It Works:
```typescript
// Ask user to select a folder
const dirHandle = await window.showDirectoryPicker();

// Save snapshot as JSON file
const fileHandle = await dirHandle.getFileHandle(
  `snapshot-${timestamp}.json`,
  { create: true }
);
const writable = await fileHandle.createWritable();
await writable.write(JSON.stringify(coreStore.getState()));
await writable.close();

// User has full control - can see files, copy, backup, etc.
```

### Storage Architecture:
```
User's chosen folder (e.g., C:\SimPilot\Snapshots\)
├── snapshot-2026-01-12T10-30-00Z.json (10 MB)
├── snapshot-2026-01-11T14-20-00Z.json (9 MB)
├── snapshot-2026-01-10T09-15-00Z.json (11 MB)
└── metadata.json (list of all snapshots)
```

### Capabilities:
- ✅ **User sees actual files** (transparency)
- ✅ **Unlimited storage** (user's disk)
- ✅ **User can backup** (copy files)
- ✅ **User controls deletion**
- ❌ **Requires user permission** (each time)

### Implementation:

```typescript
// File: src/storage/fileSystemStore.ts

// Save snapshot to user's disk
export async function saveSnapshotToFile() {
  try {
    // Request directory access
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });

    // Create filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `simpilot-snapshot-${timestamp}.json`;

    // Write file
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify({
      version: '1.0',
      timestamp,
      data: coreStore.getState()
    }, null, 2));
    await writable.close();

    console.log(`Snapshot saved: ${filename}`);
    return filename;
  } catch (err) {
    console.error('Failed to save snapshot:', err);
    throw err;
  }
}

// Load snapshot from file
export async function loadSnapshotFromFile() {
  try {
    // Request file access
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'SimPilot Snapshots',
        accept: { 'application/json': ['.json'] }
      }]
    });

    // Read file
    const file = await fileHandle.getFile();
    const text = await file.text();
    const snapshot = JSON.parse(text);

    // Validate version
    if (snapshot.version !== '1.0') {
      throw new Error('Unsupported snapshot version');
    }

    // Load into coreStore
    coreStore.setData(snapshot.data, 'Local');
    console.log(`Snapshot loaded from: ${file.name}`);
  } catch (err) {
    console.error('Failed to load snapshot:', err);
    throw err;
  }
}
```

### UI:

```typescript
function SnapshotControls() {
  return (
    <div>
      <button onClick={saveSnapshotToFile}>
        💾 Save Snapshot to File
      </button>
      <button onClick={loadSnapshotFromFile}>
        📂 Load Snapshot from File
      </button>
    </div>
  );
}
```

### Pros:
- ✅ User has full control
- ✅ Transparent (files visible)
- ✅ Easy to backup (copy files)
- ✅ Unlimited storage
- ✅ Can email/share files
- ✅ Version control friendly (Git)

### Cons:
- ⚠️ **Browser support limited** (Chrome/Edge only, not Firefox/Safari yet)
- ⚠️ Requires user permission each time
- ⚠️ No automatic comparisons (user must manually manage)
- ⚠️ More user friction

**Verdict**: Great for **power users** who want control, but requires manual management.

---

## 🎯 **RECOMMENDED IMPLEMENTATION: Hybrid Approach**

### Best Practice: Use All Three!

```typescript
// 1. IndexedDB for automatic snapshots (primary)
- Saves after every import automatically
- Stores last 50 snapshots
- Enables timeline view
- Enables automatic comparisons

// 2. LocalStorage for metadata (secondary)
- Import history (already implemented)
- User preferences
- Last viewed snapshot timestamp

// 3. File System API for manual backups (optional)
- User can manually export snapshots
- User can backup important versions
- User can share with colleagues
```

### Implementation Plan:

```typescript
// File: src/storage/storageManager.ts

export class StorageManager {
  // Automatic: IndexedDB
  async autoSave() {
    await saveSnapshotToIndexedDB(coreStore.getState());
    await pruneOldSnapshots(50); // Keep last 50
  }

  // User-initiated: File System
  async manualBackup() {
    await saveSnapshotToFile();
  }

  // User-initiated: File System
  async manualRestore() {
    await loadSnapshotFromFile();
  }

  // Timeline view
  async getTimeline() {
    return await getAllSnapshots();
  }

  // Comparison
  async compare(timestamp1: string, timestamp2: string) {
    return await compareSnapshots(timestamp1, timestamp2);
  }
}
```

### UI Flow:

```
┌─────────────────────────────────────────┐
│  After User Imports Excel Files         │
│  ↓                                       │
│  1. ingestFiles() processes Excel       │
│  2. coreStore.setData() updates memory  │
│  3. storageManager.autoSave()           │
│     → Saves to IndexedDB automatically  │
│  4. Show success toast:                 │
│     "Snapshot saved: 2026-01-12 10:30"  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  User Wants to View History              │
│  ↓                                       │
│  Click "Version History" button         │
│  ↓                                       │
│  Show timeline with all snapshots       │
│  - Can load any version                 │
│  - Can compare any two versions         │
│  - Can export to file                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  User Wants to Backup                    │
│  ↓                                       │
│  Click "Export Snapshot" button         │
│  ↓                                       │
│  File System API saves JSON file        │
│  → User chooses location                │
│  → File saved (can backup/email/git)    │
└─────────────────────────────────────────┘
```

---

## 📊 **Comparison Table**

| Feature | IndexedDB | LocalStorage | File System API |
|---------|-----------|--------------|-----------------|
| **Storage Size** | 100+ MB | ~5 MB | Unlimited |
| **Automatic Save** | ✅ Yes | ✅ Yes | ❌ No (user action) |
| **Survives Refresh** | ✅ Yes | ✅ Yes | ✅ Yes (user's disk) |
| **Snapshot Count** | 50-100+ | 5-10 | Unlimited |
| **Structured Queries** | ✅ Yes | ❌ No | ❌ No |
| **Timeline View** | ✅ Easy | ⚠️ Limited | ⚠️ Manual |
| **Comparisons** | ✅ Auto | ⚠️ Manual | ❌ No |
| **User Control** | ⚠️ Hidden | ⚠️ Hidden | ✅ Full |
| **Backup** | ⚠️ Complex | ⚠️ Complex | ✅ Easy |
| **Browser Support** | ✅ All | ✅ All | ⚠️ Chrome/Edge only |
| **Implementation** | ⚠️ Medium | ✅ Easy | ⚠️ Medium |

---

## 🎯 **FINAL RECOMMENDATION**

### Phase 1: IndexedDB (Implement First) ⭐⭐⭐
**Why**: Best balance of features, storage, and automation
**Effort**: Medium (1-2 days)
**Value**: High (automatic history, comparisons, timeline)

### Phase 2: File System API (Add Later) ⭐⭐
**Why**: Gives power users control and backup options
**Effort**: Low (4-6 hours)
**Value**: Medium (backup, sharing)

### Phase 3: Enhanced Comparison UI ⭐
**Why**: Make comparisons visual and easy to understand
**Effort**: Medium (1 day)
**Value**: High (understand what changed)

---

## 📁 **Implementation Files Needed**

```
src/storage/
├── indexedDBStore.ts          // IndexedDB operations
├── fileSystemStore.ts         // File System API operations
├── storageManager.ts          // Unified interface
└── diffCalculator.ts          // Calculate differences

src/app/components/versions/
├── VersionTimeline.tsx        // Timeline view
├── VersionComparison.tsx      // Comparison view
├── SnapshotCard.tsx          // Individual snapshot
└── ComparisonChart.tsx       // Visual diff

src/app/routes/
└── VersionHistoryPage.tsx    // Full page for version management
```

---

## ✅ **Benefits of This Approach**

1. ✅ **Excel files never leave PC** - All storage is browser-local
2. ✅ **Track changes over time** - Automatic snapshots after each import
3. ✅ **Compare versions** - See what changed between any two points
4. ✅ **Timeline view** - Visual history of all imports
5. ✅ **User backups** - Export important versions to files
6. ✅ **No backend required** - Works completely offline
7. ✅ **Fast queries** - IndexedDB enables efficient searches
8. ✅ **Scalable** - Can handle 100s of snapshots

---

**Next Step**: Start with IndexedDB implementation for automatic snapshot storage and timeline view. This gives you 80% of the value with reasonable effort.
