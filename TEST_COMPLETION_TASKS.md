# Test Completion Tasks - URGENT

## BLOCKING ISSUE: Fix Test Infrastructure

**Problem**: All 59 test suites fail with "No test suite found in file"
**Root Cause**: Vitest configuration or file discovery issue
**Impact**: Cannot run any tests to verify code changes

### Actions:
1. Check `vitest.config.ts` for correct test file patterns
2. Verify test files are discoverable
3. Run `npm test` to confirm tests execute
4. If tests still fail, check for:
   - Incorrect imports in test files
   - Missing test dependencies
   - Workspace configuration issues

---

## TASK 1: Add V801 E2E Test

**File**: `src/ingestion/__tests__/v801Data.e2e.test.ts`

**Purpose**: Test V801 schema with real files, including vacuum parser validation

**Test Files to Use**:
```
C:/Users/georgem/source/repos/SimPilot_Data/TestData/V801/V801_Docs/Ford_OHAP_V801N_Robot_Equipment_List.xlsx
C:/Users/georgem/source/repos/SimPilot_Data/TestData/V801/V801_Docs/V801 Tool List.xlsx
C:/Users/georgem/source/repos/SimPilot_Data/TestData/V801/V801_Docs/Simulation_Status/FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx
```

**Test Cases Needed**:
1. **Basic Ingestion Test**:
   - Verify Tool List parses correctly
   - Verify tools are created
   - Check expected tool count > 0

2. **Vacuum Parser Test** (CRITICAL):
   - Load Tool List file
   - Find a tool by Equipment No or Tooling Number
   - Assert `tool.metadata` exists
   - Assert metadata contains unmapped columns
   - Example columns to check:
     - Any column not in V801RawRow interface
     - Likely: "Sim. Leader", "Responsible Engineer", "Due Date", etc.

3. **RH/LH Entity Creation Test** (73 new lines of code):
   - Find a row with both Tooling Number RH and LH
   - Assert 2 separate entities created (one RH, one LH)
   - Verify each has correct canonicalKey
   - Verify each has correct displayCode

4. **Simulation Status Test**:
   - Load DASH Simulation Status file
   - Verify robots/cells created
   - Check expected counts

**Template Structure** (copy from stlaSData.e2e.test.ts):
```typescript
import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'

const BASE_PATH = path.resolve(process.cwd(), 'SimPilot_Data', 'TestData', 'V801', 'V801_Docs')

const V801_FILES = {
  toolList: ['V801 Tool List.xlsx'],
  robotList: ['Ford_OHAP_V801N_Robot_Equipment_List.xlsx'],
  simStatus: ['Simulation_Status/FORD_V801_DASH_9B-100-to-9B-170_Simulation_Status.xlsx']
}

const DATA_AVAILABLE = fs.existsSync(BASE_PATH) &&
  V801_FILES.toolList.some(file => fs.existsSync(path.join(BASE_PATH, file)))

const describeFn = DATA_AVAILABLE ? describe : describe.skip

describeFn('V801 (Ford) E2E Ingestion', () => {
  it('should ingest V801 Tool List and create tools', async () => {
    // Load workbook
    // Parse with parseToolList
    // Assert tools created
  })

  it('should capture unmapped columns in tool metadata (vacuum parser)', async () => {
    // Load V801 Tool List
    // Parse with parseToolList
    // Find first tool
    // Assert tool.metadata exists and contains unmapped columns
  })

  it('should create separate RH and LH entities when both tooling numbers present', async () => {
    // Load V801 Tool List
    // Find row with both RH and LH tooling numbers
    // Parse the file
    // Assert 2 entities created (not 1)
    // Verify RH entity has correct key
    // Verify LH entity has correct key
  })
})
```

---

## TASK 2: Add BMW E2E Test

**File**: `src/ingestion/__tests__/bmwData.e2e.test.ts`

**Purpose**: Test BMW schema with real files, including vacuum parser validation

**Test Files to Use**:
```
C:/Users/georgem/source/repos/SimPilot_Data/TestData/BMW/02. Tool List/J10735_BMW_NCAR_Robot_Equipment_List_Side_Frame.xlsx
C:/Users/georgem/source/repos/SimPilot_Data/TestData/BMW/03. Sim Status/Side_Frame_Status_BMW_J10735_NCAR_SFI.xlsx
```

**Test Cases Needed**:
1. **Basic Ingestion Test**:
   - Verify Tool List parses correctly
   - Verify tools are created
   - Check expected tool count > 0

2. **Vacuum Parser Test** (CRITICAL):
   - Load Tool List file
   - Find a tool by Equipment No or Tooling Number
   - Assert `tool.metadata` exists
   - Assert metadata contains unmapped columns
   - Example columns to check:
     - Any column not in BMWRawRow interface
     - Likely: "Sim. Leader", "Responsible Engineer", "Due Date", "Comments", etc.

3. **Simulation Status Test**:
   - Load SFI Simulation Status file
   - Verify robots/cells created
   - Check expected counts

**Template Structure** (same as V801):
```typescript
import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'

const BASE_PATH = path.resolve(process.cwd(), 'SimPilot_Data', 'TestData', 'BMW')

const BMW_FILES = {
  toolList: ['02. Tool List/J10735_BMW_NCAR_Robot_Equipment_List_Side_Frame.xlsx'],
  simStatus: ['03. Sim Status/Side_Frame_Status_BMW_J10735_NCAR_SFI.xlsx']
}

const DATA_AVAILABLE = fs.existsSync(BASE_PATH) &&
  BMW_FILES.toolList.some(file => fs.existsSync(path.join(BASE_PATH, file)))

const describeFn = DATA_AVAILABLE ? describe : describe.skip

describeFn('BMW (J10735) E2E Ingestion', () => {
  it('should ingest BMW Tool List and create tools', async () => {
    // Load workbook
    // Parse with parseToolList
    // Assert tools created
  })

  it('should capture unmapped columns in tool metadata (vacuum parser)', async () => {
    // Load BMW Tool List
    // Parse with parseToolList
    // Find first tool
    // Assert tool.metadata exists and contains unmapped columns
  })
})
```

---

## TASK 3: Inspect Real Files First

**Before writing tests, inspect the actual Excel files to understand their structure**:

### V801 Tool List Inspection:
```bash
# Use Node.js script or manual inspection to check:
1. What are the column headers?
2. Which columns are mapped by V801RawRow interface?
3. Which columns are unmapped (should be vacuumed)?
4. Are there rows with both RH and LH tooling numbers?
```

### BMW Tool List Inspection:
```bash
# Check:
1. What are the column headers?
2. Which columns are mapped by BMWRawRow interface?
3. Which columns are unmapped (should be vacuumed)?
4. How many rows/tools exist?
```

**Use this inspection script** (save as `tools/inspectTestFiles.ts`):
```typescript
import * as XLSX from 'xlsx'
import * as path from 'path'

const V801_TOOL_LIST = 'C:/Users/georgem/source/repos/SimPilot_Data/TestData/V801/V801_Docs/V801 Tool List.xlsx'
const BMW_TOOL_LIST = 'C:/Users/georgem/source/repos/SimPilot_Data/TestData/BMW/02. Tool List/J10735_BMW_NCAR_Robot_Equipment_List_Side_Frame.xlsx'

function inspectFile(filePath: string, projectName: string) {
  const workbook = XLSX.readFile(filePath)
  console.log(`\n=== ${projectName} ===`)
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`)

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

  console.log(`\nHeaders (Row 1):`)
  console.log(data[0])

  console.log(`\nFirst data row (Row 2):`)
  console.log(data[1])

  console.log(`\nTotal rows: ${data.length}`)
}

inspectFile(V801_TOOL_LIST, 'V801 Tool List')
inspectFile(BMW_TOOL_LIST, 'BMW Tool List')
```

**Run**: `npx tsx tools/inspectTestFiles.ts`

---

## TASK 4: Optional - Remove Debug Code

**File**: `src/ingestion/fuzzyMatcher.ts`
**Lines**: 185-196

**Change**:
```typescript
// Current - always logs
if (candidates.length === 0 && debugChecked > 0 && labels.toolCode) {
  log.debug(`[FuzzyMatcher] No candidates found...`)
}

// Recommended - only in debug mode
if (debug && candidates.length === 0 && debugChecked > 0 && labels.toolCode) {
  log.debug(`[FuzzyMatcher] No candidates found...`)
}
```

**Priority**: Low (can do in follow-up)

---

## TASK 5: Strengthen Test Assertion

**File**: `src/ingestion/__tests__/realWorldIntegration.test.ts`
**Line**: 187

**Change**:
```typescript
// Current - weak assertion
const tool = tools.find(a => a.metadata &&
  (a.metadata['ID'] === 'TOOL-001' || a.metadata['id'] === 'TOOL-001')) || tools[0]

// Better - fail if not found
const tool = tools.find(a => a.metadata &&
  (a.metadata['ID'] === 'TOOL-001' || a.metadata['id'] === 'TOOL-001'))
expect(tool).toBeDefined()
expect(tool?.metadata).toBeDefined()
```

**Priority**: Low (can do in follow-up)

---

## SUCCESS CRITERIA

### Before Merge:
- [x] TypeScript builds cleanly ✅
- [ ] Test infrastructure fixed (tests run)
- [ ] V801 E2E test exists and passes
- [ ] BMW E2E test exists and passes
- [ ] Vacuum parser validated for all 3 schemas

### After tests pass:
- [ ] All existing tests still pass
- [ ] New V801 test validates vacuum parser
- [ ] New BMW test validates vacuum parser
- [ ] Coverage increased from 24% to ~50%+

---

## EXECUTION ORDER

1. **Fix test infrastructure** (blocks everything)
2. **Inspect V801 and BMW files** (understand structure)
3. **Write V801 E2E test** (30-60 min)
4. **Write BMW E2E test** (30-60 min)
5. **Run all tests** (verify everything works)
6. **Commit and push** (PR ready for final review)

---

## ESTIMATED TIME

- Fix test infrastructure: 15-30 min
- Inspect files: 15 min
- Write V801 test: 30-60 min
- Write BMW test: 30-60 min
- Debug/fix issues: 30-60 min
- **Total**: 2-4 hours

---

## NOTES

- Use `stlaSData.e2e.test.ts` as reference for structure
- Copy test patterns from `realWorldIntegration.test.ts` for vacuum parser assertions
- Files are conditionally tested (`describe.skip` if files not found)
- Focus on vacuum parser validation - that's the core feature being added
