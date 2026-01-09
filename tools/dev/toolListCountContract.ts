/**
 * Tool List Count Contract
 *
 * Validates that tool entity counts from Excel files match expected ranges.
 * This prevents regressions in parsing logic that might skip or duplicate entities.
 *
 * Expected counts (with tolerance):
 * - BMW J10735: 145-160 entities (target ≈ 152)
 * - Ford V801: 760-810 entities (target ≈ 784)
 * - STLA S ZAR: No expectation yet (just prints)
 *
 * Usage:
 *   npm run dev:tool-list-count-contract -- <bmw-path> <v801-path> <stla-path>
 *
 * Example:
 *   npm run dev:tool-list-count-contract -- \
 *     "/mnt/data/J10735_BMW_NCAR_SLP_Tool list.xlsx" \
 *     "/mnt/data/V801 Tool List.xlsx" \
 *     "/mnt/data/STLA_S_ZAR Tool List.xlsx"
 *
 * Exit codes:
 *   0 - All counts within expected ranges
 *   1 - One or more counts out of range
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { parseToolListWithSchema } from '../../src/ingestion/toolListSchemas/toolListSchemaAdapter'

// ============================================================================
// TYPES
// ============================================================================

interface CountExpectation {
  name: string
  min: number
  max: number
  target: number
}

interface CountResult {
  name: string
  filePath: string
  count: number
  deletedSkipped: number
  expectation: CountExpectation | null
  passes: boolean
  message: string
}

// ============================================================================
// EXPECTATIONS
// ============================================================================

const BMW_EXPECTATION: CountExpectation = {
  name: 'BMW J10735',
  min: 145,
  max: 160,
  target: 152
}

const V801_EXPECTATION: CountExpectation = {
  name: 'Ford V801',
  min: 760,
  max: 810,
  target: 784
}

const STLA_EXPECTATION: CountExpectation | null = null  // No expectation yet

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.error('Usage: npm run dev:tool-list-count-contract -- <bmw-path> <v801-path> <stla-path>')
    console.error('\nExample:')
    console.error('  npm run dev:tool-list-count-contract -- \\')
    console.error('    "/mnt/data/J10735_BMW_NCAR_SLP_Tool list.xlsx" \\')
    console.error('    "/mnt/data/V801 Tool List.xlsx" \\')
    console.error('    "/mnt/data/STLA_S_ZAR Tool List.xlsx"')
    process.exit(1)
  }

  const [bmwPath, v801Path, stlaPath] = args

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  TOOL LIST COUNT CONTRACT')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const results: CountResult[] = []

  // Test BMW
  console.log(`Testing BMW J10735: ${path.basename(bmwPath)}`)
  const bmwResult = await testFile(bmwPath, BMW_EXPECTATION)
  results.push(bmwResult)
  printResult(bmwResult)

  // Test V801
  console.log(`\nTesting Ford V801: ${path.basename(v801Path)}`)
  const v801Result = await testFile(v801Path, V801_EXPECTATION)
  results.push(v801Result)
  printResult(v801Result)

  // Test STLA
  console.log(`\nTesting STLA S ZAR: ${path.basename(stlaPath)}`)
  const stlaResult = await testFile(stlaPath, STLA_EXPECTATION)
  results.push(stlaResult)
  printResult(stlaResult)

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const passCount = results.filter(r => r.passes).length
  const failCount = results.filter(r => !r.passes).length

  console.log(`Total Tests: ${results.length}`)
  console.log(`Passed: ${passCount}`)
  console.log(`Failed: ${failCount}`)

  if (failCount > 0) {
    console.log('\n❌ COUNT CONTRACT VIOLATION DETECTED\n')
    console.log('Failed tests:')
    results.filter(r => !r.passes).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`)
    })
    process.exit(1)
  }

  console.log('\n✅ All counts within expected ranges\n')
  process.exit(0)
}

// ============================================================================
// TESTING
// ============================================================================

async function testFile(
  filePath: string,
  expectation: CountExpectation | null
): Promise<CountResult> {
  if (!fs.existsSync(filePath)) {
    return {
      name: expectation?.name || path.basename(filePath),
      filePath,
      count: 0,
      deletedSkipped: 0,
      expectation,
      passes: false,
      message: `File not found: ${filePath}`
    }
  }

  try {
    const fileName = path.basename(filePath)
    const buffer = fs.readFileSync(filePath)
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellStyles: true  // Enable style parsing for strike-through detection
    })

    // Find sheet
    let sheetName = workbook.SheetNames.find(name =>
      name.toLowerCase().includes('toollist') ||
      name.toLowerCase().includes('tool list')
    )

    if (!sheetName) {
      sheetName = workbook.SheetNames[0]
    }

    // Parse using schema adapter
    const result = await parseToolListWithSchema(workbook, fileName, sheetName, false)

    const count = result.entities.length
    const deletedSkipped = result.validation.deletedRowsSkipped

    // Check against expectation
    if (!expectation) {
      return {
        name: fileName,
        filePath,
        count,
        deletedSkipped,
        expectation,
        passes: true,
        message: `No expectation set (informational only). Entities: ${count}, Deleted: ${deletedSkipped}`
      }
    }

    const passes = count >= expectation.min && count <= expectation.max

    if (passes) {
      const delta = count - expectation.target
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`
      return {
        name: expectation.name,
        filePath,
        count,
        deletedSkipped,
        expectation,
        passes: true,
        message: `✅ Count ${count} within range [${expectation.min}, ${expectation.max}] (target ${expectation.target} ${deltaStr})`
      }
    }

    return {
      name: expectation.name,
      filePath,
      count,
      deletedSkipped,
      expectation,
      passes: false,
      message: `❌ Count ${count} OUT OF RANGE [${expectation.min}, ${expectation.max}] (target ${expectation.target})`
    }
  } catch (error) {
    return {
      name: expectation?.name || path.basename(filePath),
      filePath,
      count: 0,
      deletedSkipped: 0,
      expectation,
      passes: false,
      message: `Error parsing file: ${error}`
    }
  }
}

function printResult(result: CountResult): void {
  console.log(`  ${result.message}`)
  console.log(`  Entities Produced: ${result.count}`)
  console.log(`  Deleted Rows Skipped: ${result.deletedSkipped}`)
}

// ============================================================================
// RUN
// ============================================================================

main()
