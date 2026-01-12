# Tasks for Cursor - Test Completion

## Context
The vacuum parser has been implemented for all three schemas (BMW, V801, STLA) but only STLA has test coverage. We need to add E2E tests for V801 and BMW to validate the vacuum parser works correctly.

---

## TASK 1: Fix Test Infrastructure (BLOCKING)

**Problem**: Running `npm test` shows all 59 tests fail with "No test suite found in file"

**Actions**:
1. Check if there are any syntax errors in test files
2. Verify `vitest.config.ts` is correct
3. Check if test files have proper imports
4. Try running a single test file: `npx vitest run src/ingestion/__tests__/realWorldIntegration.test.ts`
5. If still failing, check for ESM/CommonJS issues

**Success**: `npm test` runs and shows actual test results (pass/fail), not "No test suite found"

---

## TASK 2: Create File Inspection Script

**File**: `tools/inspectTestFiles.ts`

**Purpose**: Inspect the V801 and BMW Excel files to see what columns they have (to know what metadata to test for)

**Code**:
```typescript
import * as XLSX from 'xlsx'

const V801_TOOL_LIST = 'C:/Users/georgem/source/repos/SimPilot_Data/TestData/V801/V801_Docs/V801 Tool List.xlsx'
const BMW_TOOL_LIST = 'C:/Users/georgem/source/repos/SimPilot_Data/TestData/BMW/02. Tool List/J10735_BMW_NCAR_Robot_Equipment_List_Side_Frame.xlsx'

function inspectFile(filePath: string, projectName: string) {
  try {
    const workbook = XLSX.readFile(filePath)
    console.log(`\n=== ${projectName} ===`)
    console.log(`File: ${filePath}`)
    console.log(`Sheets: ${workbook.SheetNames.join(', ')}`)

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][]

    console.log(`\nHeaders (Row 1):`)
    console.log(data[0])

    console.log(`\nFirst 3 data rows:`)
    console.log(data[1])
    console.log(data[2])
    console.log(data[3])

    console.log(`\nTotal rows: ${data.length}`)

    // Show which columns would be vacuumed (not in schema)
    const headers = data[0] as string[]
    console.log(`\nColumn count: ${headers.length}`)
  } catch (error) {
    console.error(`Error reading ${projectName}:`, error)
  }
}

console.log('Inspecting test files to determine vacuum parser test expectations...\n')
inspectFile(V801_TOOL_LIST, 'V801 Tool List')
inspectFile(BMW_TOOL_LIST, 'BMW Tool List')
```

**Run**: `npx tsx tools/inspectTestFiles.ts`

**Output**: Save the console output to `INSPECTION_RESULTS.txt` so we know what columns exist

---

## TASK 3: Create V801 E2E Test

**File**: `src/ingestion/__tests__/v801Data.e2e.test.ts`

**Reference**: Copy structure from `src/ingestion/__tests__/stlaSData.e2e.test.ts`

**Requirements**:
1. Load `V801 Tool List.xlsx` from TestData
2. Parse it using the tool list parser
3. Verify tools are created
4. **CRITICAL**: Test vacuum parser - check that `tool.metadata` contains unmapped columns
5. Test RH/LH entity splitting (find a row with both RH and LH tooling numbers, verify 2 entities created)

**Template**:
```typescript
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

const BASE_PATH = path.resolve(process.cwd(), '..', 'SimPilot_Data', 'TestData', 'V801', 'V801_Docs')

const V801_FILES = {
  toolList: 'V801 Tool List.xlsx',
  robotList: 'Ford_OHAP_V801N_Robot_Equipment_List.xlsx'
}

const DATA_AVAILABLE =
  fs.existsSync(BASE_PATH) &&
  fs.existsSync(path.join(BASE_PATH, V801_FILES.toolList))

const describeFn = DATA_AVAILABLE ? describe : describe.skip

describeFn('V801 (Ford) E2E Ingestion', () => {
  it('should parse V801 Tool List and create tools', async () => {
    const filePath = path.join(BASE_PATH, V801_FILES.toolList)
    const workbook = XLSX.readFile(filePath)

    // TODO: Parse the file using parseToolListWithSchema or similar
    // TODO: Assert tools.length > 0
    // TODO: Assert project type detected as FORD_V801
  })

  it('should capture unmapped columns in tool metadata (VACUUM PARSER TEST)', async () => {
    const filePath = path.join(BASE_PATH, V801_FILES.toolList)
    const workbook = XLSX.readFile(filePath)

    // TODO: Parse the file
    // TODO: Get first tool
    // TODO: Assert tool.metadata exists
    // TODO: Assert tool.metadata contains columns not in V801RawRow interface
    // Use the inspection results to know which columns should be in metadata
  })

  it('should create separate RH and LH entities when both tooling numbers exist', async () => {
    const filePath = path.join(BASE_PATH, V801_FILES.toolList)
    const workbook = XLSX.readFile(filePath)

    // TODO: Parse the file
    // TODO: Find entities where originalRow had both RH and LH tooling numbers
    // TODO: Assert 2 entities created (one for RH, one for LH)
    // This tests the 73 new lines of code in v801ToolListSchema.ts
  })
})
```

**Success**: Test file exists and tests pass (or skip if files not found)

---

## TASK 4: Create BMW E2E Test

**File**: `src/ingestion/__tests__/bmwData.e2e.test.ts`

**Similar to V801 test but for BMW**:

**Template**:
```typescript
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

const BASE_PATH = path.resolve(process.cwd(), '..', 'SimPilot_Data', 'TestData', 'BMW')

const BMW_FILES = {
  toolList: '02. Tool List/J10735_BMW_NCAR_Robot_Equipment_List_Side_Frame.xlsx'
}

const DATA_AVAILABLE =
  fs.existsSync(BASE_PATH) &&
  fs.existsSync(path.join(BASE_PATH, BMW_FILES.toolList))

const describeFn = DATA_AVAILABLE ? describe : describe.skip

describeFn('BMW (J10735) E2E Ingestion', () => {
  it('should parse BMW Tool List and create tools', async () => {
    const filePath = path.join(BASE_PATH, BMW_FILES.toolList)
    const workbook = XLSX.readFile(filePath)

    // TODO: Parse the file using parseToolListWithSchema or similar
    // TODO: Assert tools.length > 0
    // TODO: Assert project type detected as BMW_J10735
  })

  it('should capture unmapped columns in tool metadata (VACUUM PARSER TEST)', async () => {
    const filePath = path.join(BASE_PATH, BMW_FILES.toolList)
    const workbook = XLSX.readFile(filePath)

    // TODO: Parse the file
    // TODO: Get first tool
    // TODO: Assert tool.metadata exists
    // TODO: Assert tool.metadata contains columns not in BMWRawRow interface
    // Use the inspection results to know which columns should be in metadata
  })
})
```

**Success**: Test file exists and tests pass (or skip if files not found)

---

## TASK 5: Run All Tests

After completing tasks 1-4:

```bash
npm test
```

**Expected Results**:
- All existing tests pass (or maintain same pass/fail count as before)
- New V801 test: 3 tests (pass or skip)
- New BMW test: 2 tests (pass or skip)
- Vacuum parser is validated for all 3 schemas

---

## Key Points for Cursor

1. **Look at `stlaSData.e2e.test.ts`** as the reference for how to structure E2E tests
2. **Look at `realWorldIntegration.test.ts`** lines 151-198 for how to test vacuum parser metadata
3. **The vacuum parser test is the most important part** - we need to verify that unmapped columns appear in `tool.metadata`
4. **Use the inspection script first** to see what columns exist in the real files
5. **Tests should use `describe.skip`** if data files aren't found (same pattern as stlaSData.e2e.test.ts)

---

## Files You'll Need to Reference

- `src/ingestion/__tests__/stlaSData.e2e.test.ts` - E2E test structure
- `src/ingestion/__tests__/realWorldIntegration.test.ts` - Vacuum parser test pattern
- `src/ingestion/toolListSchemas/toolListSchemaAdapter.ts` - The parser with vacuum logic
- `src/ingestion/toolListSchemas/v801ToolListSchema.ts` - V801 schema (lines 200-273 are RH/LH logic)
- `src/ingestion/toolListSchemas/bmwToolListSchema.ts` - BMW schema

---

## Success Criteria

- [ ] Test infrastructure works (npm test runs)
- [ ] V801 E2E test created with 3 test cases
- [ ] BMW E2E test created with 2 test cases
- [ ] Vacuum parser validated for V801 (metadata test passes)
- [ ] Vacuum parser validated for BMW (metadata test passes)
- [ ] All tests pass or skip appropriately
- [ ] Coverage increased from 24% to ~40-50%

---

## Estimated Time: 2-4 hours

## Start Here:
1. Fix test infrastructure first
2. Run inspection script
3. Write V801 test
4. Write BMW test
5. Run all tests
