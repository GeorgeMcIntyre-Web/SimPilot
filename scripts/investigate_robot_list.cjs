/**
 * Investigate Robot List Structure
 *
 * Detailed analysis of the robot list to understand actual vs apparent row counts
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const ROBOT_LIST_FILE = String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\01_Equipment_List\Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx`;

function analyzeRobotList() {
  console.log('🔍 Investigating Robot List File Structure\n');
  console.log('='.repeat(80));

  if (!fs.existsSync(ROBOT_LIST_FILE)) {
    console.log('❌ File not found!');
    return;
  }

  try {
    const workbook = XLSX.readFile(ROBOT_LIST_FILE);
    const sheetName = 'STLA-S';

    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`❌ Sheet "${sheetName}" not found`);
      console.log(`Available sheets: ${workbook.SheetNames.join(', ')}`);
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    console.log(`\n📊 Sheet: "${sheetName}"`);
    console.log(`   Declared Range: ${sheet['!ref']}`);
    console.log(`   Rows (by range): ${range.e.r + 1} (from row ${range.s.r} to ${range.e.r})`);
    console.log(`   Columns: ${range.e.c + 1}`);

    // Convert to array to analyze actual data
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    console.log(`\n📋 Actual Data Analysis:`);
    console.log(`   Total rows in array: ${data.length}`);

    // Count non-empty rows
    let nonEmptyRows = 0;
    let completelyEmptyRows = 0;
    let mostlyEmptyRows = 0;

    const rowAnalysis = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nonEmptyCells = row.filter(cell => cell !== null && cell !== '' && cell !== undefined).length;
      const totalCells = row.length;
      const fillRate = totalCells > 0 ? nonEmptyCells / totalCells : 0;

      if (nonEmptyCells === 0) {
        completelyEmptyRows++;
      } else if (fillRate < 0.1) {
        mostlyEmptyRows++;
      } else {
        nonEmptyRows++;
      }

      // Keep track of interesting rows
      if (i < 10 || nonEmptyCells > 0) {
        rowAnalysis.push({
          rowIndex: i + 1,
          nonEmptyCells,
          totalCells,
          fillRate: (fillRate * 100).toFixed(1) + '%',
          sample: row.slice(0, 5).map(c => c === null ? '(empty)' : String(c).substring(0, 20))
        });
      }
    }

    console.log(`   Non-empty rows (>10% filled): ${nonEmptyRows}`);
    console.log(`   Mostly empty rows (<10% filled): ${mostlyEmptyRows}`);
    console.log(`   Completely empty rows: ${completelyEmptyRows}`);

    // Show first 20 rows
    console.log(`\n📄 First 20 Rows Analysis:`);
    console.log('   (showing first 5 columns of each row)\n');

    rowAnalysis.slice(0, 20).forEach(row => {
      console.log(`   Row ${String(row.rowIndex).padStart(3, ' ')}: ${row.fillRate.padStart(6, ' ')} filled | ${row.sample.join(' | ')}`);
    });

    // Find header row
    console.log(`\n🔎 Looking for Header Row...`);
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      const hasHeaderKeywords = row.some(cell =>
        cell && String(cell).match(/index|position|assembly|station|robot|caption/i)
      );
      if (hasHeaderKeywords) {
        headerRowIndex = i;
        console.log(`   Found potential header at row ${i + 1}`);
        console.log(`   Headers: ${row.filter(Boolean).slice(0, 10).join(' | ')}`);
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.log('   ⚠️ No clear header row found in first 10 rows');
    }

    // Count actual data rows (after header)
    const dataStartRow = headerRowIndex + 1;
    let actualDataRows = 0;

    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      const nonEmptyCells = row.filter(cell => cell !== null && cell !== '' && cell !== undefined).length;
      if (nonEmptyCells > 3) { // More than 3 cells filled = likely real data
        actualDataRows++;
      }
    }

    console.log(`\n✅ Actual Robot Data Rows: ${actualDataRows}`);
    console.log(`   (rows after header with >3 cells filled)`);

    // Check for hidden rows
    console.log(`\n👁️ Checking for Hidden Rows...`);
    if (sheet['!rows']) {
      const hiddenRows = sheet['!rows'].filter((r, idx) => r && r.hidden).length;
      console.log(`   Hidden rows: ${hiddenRows}`);
    } else {
      console.log('   No hidden row information available');
    }

    // Show summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n   Excel Reports: ${range.e.r + 1} rows`);
    console.log(`   Actual Data Rows: ${actualDataRows} rows`);
    console.log(`   Empty/Padding Rows: ${data.length - actualDataRows} rows`);
    console.log(`\n   ✅ The "166 robots" claim appears in the file itself (row 5)`);
    console.log(`   ✅ Actual robot records: ~${actualDataRows}`);

    if (actualDataRows > 166) {
      console.log(`\n   ⚠️ Mismatch: File claims 166 but has ${actualDataRows} data rows`);
      console.log(`      Possible reasons:`);
      console.log(`      - Multiple rows per robot (different configurations)`);
      console.log(`      - Includes non-robot equipment`);
      console.log(`      - Number "166" is outdated`);
    } else if (actualDataRows < 166) {
      console.log(`\n   ⚠️ Mismatch: File claims 166 but only has ${actualDataRows} data rows`);
      console.log(`      Possible reasons:`);
      console.log(`      - Many empty rows (padding)`);
      console.log(`      - Number "166" includes other projects`);
    } else {
      console.log(`\n   ✅ Match: Claim of 166 matches actual data rows`);
    }

    console.log('\n');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

analyzeRobotList();
