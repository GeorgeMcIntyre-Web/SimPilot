# Data Storage Architecture - Where Your Excel Data Goes

## 📍 **Quick Answer**

When you import Excel files on the real site, the data is stored in **two places**:

1. **In-Memory Store** (`coreStore`) - Main application data
2. **Browser LocalStorage** - Import history only

**Important**: Your actual Excel data is **NOT saved to disk or database** - it only exists in the browser's memory while the app is running.

---

## 🏗️ **Architecture Overview**

```
Excel Files
    ↓
User Uploads via DataLoaderPage
    ↓
useLocalFileIngest hook
    ↓
ingestFiles() - Parses Excel
    ↓
┌─────────────────────────────────────┐
│  VACUUM PARSER (NEW!)               │
│  Captures ALL columns → metadata    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  IN-MEMORY STORE (coreStore)        │
│  Location: RAM/Browser Memory       │
│  Persistence: Session Only          │
│  Data: Projects, Cells, Tools, etc. │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  LOCALSTORAGE (importHistory)       │
│  Location: Browser LocalStorage     │
│  Persistence: Survives Page Refresh │
│  Data: Import metadata only         │
└─────────────────────────────────────┘
```

---

## 💾 **Storage Location #1: In-Memory Store (Primary)**

### File: `src/domain/coreStore.ts`

### What's Stored:
```typescript
{
  projects: Project[],        // BMW, V801, STLA projects
  areas: Area[],             // Manufacturing areas
  cells: Cell[],             // Work cells/stations
  assets: UnifiedAsset[],    // Robots + Tools (merged)
  warnings: string[],        // Ingestion warnings
  changeLog: ChangeRecord[], // Change history
  referenceData: {
    employees: EmployeeRecord[],  // Sim Leaders, etc.
    suppliers: SupplierRecord[]   // Tool suppliers
  },
  // UID-based linking (schema v3)
  stationRecords: StationRecord[],
  toolRecords: ToolRecord[],
  robotRecords: RobotRecord[],
  aliasRules: AliasRule[],
  importRuns: ImportRun[],
  diffResults: DiffResult[],
  auditLog: AuditEntry[]
}
```

### Where Tool Metadata Lives:
```typescript
assets: UnifiedAsset[] // Each asset has:
  {
    id: string,
    name: string,
    kind: 'TOOL' | 'ROBOT' | 'GUN',
    metadata: Record<string, unknown>  // ← YOUR VACUUM PARSER DATA!
    // metadata contains:
    // - "Sim. Leader": "Werner Hamel"
    // - "Sim. Employee": "Alice Johnson"
    // - "Due Date": "2024/12/15"
    // - Designer, Comments, Status, etc.
  }
```

### Characteristics:
- **Location**: JavaScript variable in browser memory (RAM)
- **Persistence**: ❌ **Lost when you close the browser tab or refresh**
- **Size**: Limited by browser memory (typically 100s of MB)
- **Access**: Fast (in-memory)
- **Survival**: Only during current session

### Code Location:
```typescript
// src/domain/coreStore.ts (line 58-78)
let storeState: CoreStoreState = {
  projects: [],
  areas: [],
  cells: [],
  assets: [],  // ← Your tools with metadata live here
  // ...
}
```

---

## 💾 **Storage Location #2: LocalStorage (Import History)**

### File: `src/app/features/importHistory/importHistoryStore.ts`

### What's Stored:
```typescript
localStorage.setItem('simpilot.importHistory.v1', JSON.stringify([
  {
    timestamp: "2026-01-12T10:30:00Z",
    sourceType: "Local Files",
    filename: "STLA_S_ZAR Tool List.xlsx",
    status: "success",
    diff: {
      added: { tools: 150, robots: 20, cells: 10 },
      removed: { tools: 5 },
      modified: { tools: 30 }
    },
    warnings: [/* ... */],
    // ... but NOT the actual tool data
  },
  // ... up to 100 most recent imports
]))
```

### Characteristics:
- **Location**: Browser LocalStorage (usually `C:\Users\{user}\AppData\Local\{Browser}\User Data\Default\Local Storage`)
- **Persistence**: ✅ **Survives page refresh** (but can be cleared by user)
- **Size**: ~5-10 MB limit (browser dependent)
- **Access**: Moderate (DOM storage API)
- **Survival**: Until user clears browser data or you clear it programmatically

### What's NOT Stored:
- ❌ Actual tool data
- ❌ Tool metadata
- ❌ Excel file contents
- ❌ Full ingestion results

### What IS Stored:
- ✅ Import metadata (when, what files, how many items)
- ✅ Diff summary (what changed)
- ✅ Warnings
- ✅ Source information

---

## 🚫 **What's NOT Persisted**

### Data Lost on Browser Close/Refresh:
1. ❌ All tools and their metadata
2. ❌ All robots
3. ❌ All cells and projects
4. ❌ Actual ingestion results
5. ❌ Tool metadata from vacuum parser

### Why This Matters:
**Every time you refresh the page, you need to re-import your Excel files.**

---

## 🔄 **Data Flow: Excel → Memory**

### Step-by-Step:

1. **User uploads Excel files** via DataLoaderPage
   ```typescript
   // src/app/routes/DataLoaderPage.tsx
   <FileUploader onFilesSelected={addToolListFiles} />
   ```

2. **Files processed by useLocalFileIngest**
   ```typescript
   // src/app/hooks/useLocalFileIngest.ts (line 73)
   const res = await ingestFiles(input);
   ```

3. **ingestFiles parses Excel** with vacuum parser
   ```typescript
   // src/ingestion/ingestionCoordinator.ts
   // Parses files, runs vacuum parser
   // Returns: { tools, robots, cells, warnings }
   ```

4. **Results stored in coreStore**
   ```typescript
   // src/app/hooks/useLocalFileIngest.ts (line 82)
   syncSimPilotStoreFromLocalData();

   // Which calls:
   // src/domain/simPilotSnapshotBuilder.ts
   coreStore.setData({
     projects, areas, cells, robots, tools
   }, 'Local');
   ```

5. **Import history saved to LocalStorage**
   ```typescript
   // src/app/hooks/useLocalFileIngest.ts (line 81)
   addImportHistoryEntry(buildImportHistoryEntry(input, res, 'Local Files'));

   // Which saves to:
   localStorage.setItem('simpilot.importHistory.v1', JSON.stringify(history));
   ```

---

## 🔍 **How to See Your Data**

### Method 1: Browser DevTools

**Open DevTools** (F12) → **Application/Storage** tab:

1. **In-Memory Data**:
   - Console tab: `coreStore.getState()`
   - View all assets: `coreStore.getState().assets`
   - View tool metadata: `coreStore.getState().assets.find(a => a.kind === 'TOOL')?.metadata`

2. **LocalStorage**:
   - Application → Local Storage → `http://localhost:XXXX`
   - Key: `simpilot.importHistory.v1`
   - Value: JSON array of import history entries

### Method 2: React DevTools

**React DevTools** → **Components** tab:
- Find `DataLoaderPage` or any component
- See state/props with imported data

---

## 💡 **Why This Architecture?**

### Advantages:
1. ✅ **Fast**: In-memory data is instant access
2. ✅ **Simple**: No database setup required
3. ✅ **Privacy**: Data never leaves the browser
4. ✅ **Secure**: No server-side storage to secure
5. ✅ **Flexible**: Easy to implement vacuum parser changes

### Disadvantages:
1. ❌ **Not Persistent**: Lost on refresh
2. ❌ **No Sharing**: Can't share data between users
3. ❌ **No History**: Can't view previous versions
4. ❌ **No Collaboration**: Single user only

---

## 🚀 **Adding Persistence (Future Enhancement)**

If you want to persist data across sessions, here are options:

### Option 1: LocalStorage (Simple)
```typescript
// Save coreStore to LocalStorage on change
localStorage.setItem('simpilot.coreData.v1', JSON.stringify(coreStore.getState()));

// Load on app startup
const savedData = localStorage.getItem('simpilot.coreData.v1');
if (savedData) {
  coreStore.setData(JSON.parse(savedData));
}
```

**Pros**: Simple, works offline
**Cons**: 5-10 MB limit, no sharing between users

### Option 2: IndexedDB (Better)
```typescript
// Use IndexedDB for larger datasets (100s of MB)
import { openDB } from 'idb';

const db = await openDB('SimPilot', 1, {
  upgrade(db) {
    db.createObjectStore('coreData');
  }
});

// Save
await db.put('coreData', coreStore.getState(), 'latest');

// Load
const savedData = await db.get('coreData', 'latest');
```

**Pros**: Larger storage (100s of MB), structured queries
**Cons**: More complex, async API

### Option 3: Backend Database (Best for Multi-User)
```typescript
// Save to server database (PostgreSQL, MongoDB, etc.)
const response = await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify(coreStore.getState())
});

// Load from server
const data = await fetch('/api/projects').then(r => r.json());
coreStore.setData(data);
```

**Pros**: Multi-user, versioning, backups, sharing
**Cons**: Requires backend, server costs, complexity

---

## 📊 **Current Implementation Summary**

### Where Data Lives:

| Data Type | Storage Location | Persists? | Size Limit | Shared? |
|-----------|------------------|-----------|------------|---------|
| **Tools, Robots, Cells** | In-Memory (coreStore) | ❌ No | ~100 MB | ❌ No |
| **Tool Metadata** | In-Memory (coreStore.assets[].metadata) | ❌ No | ~100 MB | ❌ No |
| **Import History** | LocalStorage | ✅ Yes | ~5 MB | ❌ No |
| **Excel Files** | Never stored | ❌ No | N/A | ❌ No |

### Key Takeaway:
**Your Excel data (including vacuum parser metadata) lives in browser memory only. When you close/refresh the browser, you need to re-import.**

---

## 🎯 **Recommendations**

### For Current Architecture (In-Memory):
1. ✅ Keep current design for speed and simplicity
2. ✅ Remind users to keep browser tab open
3. ✅ Add "Export" feature to download current state as JSON
4. ✅ Add "Import State" to restore from JSON file

### For Future Persistence:
1. 🔜 Add LocalStorage save/load for single-user persistence
2. 🔜 Add IndexedDB for larger datasets
3. 🔜 Consider backend database for multi-user features

---

## 📁 **Key Files**

1. **`src/domain/coreStore.ts`** - Main in-memory store (tools with metadata live here)
2. **`src/app/hooks/useLocalFileIngest.ts`** - Handles Excel import flow
3. **`src/app/features/importHistory/importHistoryStore.ts`** - LocalStorage for history
4. **`src/ingestion/ingestionCoordinator.ts`** - Excel parsing with vacuum parser
5. **`src/domain/simPilotSnapshotBuilder.ts`** - Converts ingestion results to coreStore format

---

## ✅ **Verification**

To verify your data is stored correctly after import:

```javascript
// Open browser console (F12) and run:
const state = coreStore.getState();
console.log('Total tools:', state.assets.filter(a => a.kind === 'TOOL').length);
console.log('First tool metadata:', state.assets.find(a => a.kind === 'TOOL')?.metadata);

// Should see your vacuum parser columns:
// { "Sim. Leader": "...", "Sim. Employee": "...", etc. }
```

---

**Summary**: Your Excel data lives in **browser memory only** (not saved to disk). Import history metadata is saved to **LocalStorage** for convenience. To persist tool data across sessions, you'll need to add LocalStorage/IndexedDB/Backend storage.
