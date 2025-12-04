/**
 * Count ACTUAL non-empty rows in Simulation Status sheets
 *
 * Investigate if the 3,200+ rows are real data or just Excel padding
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILES = {
  desRear: {
    path: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx`,
    name: 'REAR UNIT (DES)'
  },
  desUnderbody: {
    path: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\03_Simulation\00_Simulation_Status\STLA-S_UNDERBODY_Simulation_Status_DES.xlsx`,
    name: 'UNDERBODY (DES)'
  },
  csgFront: {
    path: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\DesignOS\05_Status_Sheets\STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx`,
    name: 'FRONT UNIT (CSG)'
  },
  csgRear: {
    path: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\DesignOS\05_Status_Sheets\STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx`,
    name: 'REAR UNIT (CSG)'
  },
  csgUnderbody: {
    path: String.raw`C:\Users\georgem\source\repos\SimPilot_Data\DesignOS\05_Status_Sheets\STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx`,
    name: 'UNDERBODY (CSG)'
  }
};

function analyzeSimulationSheet(filePath, name) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ${name}`);
  console.log('='.repeat(80));

  if (!fs.existsSync(filePath)) {
    console.log('❌ File not found');
    return null;
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'SIMULATION';

    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`❌ No SIMULATION sheet found`);
      console.log(`   Available: ${workbook.SheetNames.join(', ')}`);
      return null;
    }

    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    console.log(`\n📏 Excel Reports:`);
    console.log(`   Range: ${sheet['!ref']}`);
    console.log(`   Total Rows (by range): ${range.e.r + 1}`);
    console.log(`   Total Columns: ${range.e.c + 1}`);

    // Convert to array
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    console.log(`\n🔍 Analyzing Actual Content:`);

    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      const hasStationKeywords = row.some(cell =>
        cell && String(cell).toUpperCase().includes('STATION')
      );
      if (hasStationKeywords) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.log('   ⚠️ Could not find header row');
      return null;
    }

    console.log(`   Header Row: Row ${headerRowIndex + 1}`);

    // Count actual data rows (after header)
    let completelyEmpty = 0;
    let mostlyEmpty = 0;
    let actualData = 0;

    const dataRows = [];

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      const nonEmptyCells = row.filter(cell =>
        cell !== null &&
        cell !== '' &&
        cell !== undefined &&
        String(cell).trim() !== ''
      ).length;

      const totalCells = row.length;
      const fillRate = totalCells > 0 ? nonEmptyCells / totalCells : 0;

      if (nonEmptyCells === 0) {
        completelyEmpty++;
      } else if (fillRate < 0.05) { // Less than 5% filled
        mostlyEmpty++;
      } else {
        actualData++;
        // Keep first few cells for sample
        dataRows.push({
          rowNum: i + 1,
          nonEmptyCells,
          fillRate: (fillRate * 100).toFixed(1) + '%',
          sample: row.slice(0, 6).map(c => {
            if (c === null || c === undefined || c === '') return '(empty)';
            return String(c).substring(0, 15);
          })
        });
      }
    }

    console.log(`\n📊 Row Classification:`);
    console.log(`   Actual Data Rows (>5% filled): ${actualData}`);
    console.log(`   Mostly Empty (<5% filled): ${mostlyEmpty}`);
    console.log(`   Completely Empty: ${completelyEmpty}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   Total Rows After Header: ${actualData + mostlyEmpty + completelyEmpty}`);

    // Show sample of actual data
    console.log(`\n📄 Sample Data Rows (first 10):`);
    dataRows.slice(0, 10).forEach(row => {
      console.log(`   Row ${String(row.rowNum).padStart(4, ' ')}: ${row.fillRate.padStart(6, ' ')} | ${row.sample.join(' | ')}`);
    });

    if (dataRows.length > 10) {
      console.log(`   ... and ${dataRows.length - 10} more data rows`);
    }

    // Check for hidden rows
    if (sheet['!rows']) {
      const hiddenCount = sheet['!rows'].filter(r => r && r.hidden).length;
      if (hiddenCount > 0) {
        console.log(`\n👁️ Hidden Rows: ${hiddenCount}`);
      }
    }

    return {
      name,
      excelReportedRows: range.e.r + 1,
      actualDataRows: actualData,
      emptyRows: completelyEmpty + mostlyEmpty
    };

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

function main() {
  console.log('🔍 Counting ACTUAL Non-Empty Rows in Simulation Status Sheets\n');
  console.log('This will tell us if 3,200+ rows are real data or just Excel padding...\n');

  const results = [];

  Object.values(FILES).forEach(file => {
    const result = analyzeSimulationSheet(file.path, file.name);
    if (result) {
      results.push(result);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY - What Are Those 3,200 Rows Really?');
  console.log('='.repeat(80));

  if (results.length > 0) {
    console.log('\n');
    results.forEach(r => {
      console.log(`${r.name}:`);
      console.log(`   Excel Says: ${r.excelReportedRows} rows`);
      console.log(`   Actual Data: ${r.actualDataRows} rows`);
      console.log(`   Empty/Padding: ${r.emptyRows} rows (${((r.emptyRows / r.excelReportedRows) * 100).toFixed(1)}%)`);
      console.log('');
    });

    const totalExcelRows = results.reduce((sum, r) => sum + r.excelReportedRows, 0);
    const totalDataRows = results.reduce((sum, r) => sum + r.actualDataRows, 0);
    const totalEmptyRows = results.reduce((sum, r) => sum + r.emptyRows, 0);

    console.log('─'.repeat(80));
    console.log('TOTALS:');
    console.log(`   Excel Reports: ${totalExcelRows} rows across all files`);
    console.log(`   Actual Data: ${totalDataRows} rows across all files`);
    console.log(`   Empty/Padding: ${totalEmptyRows} rows (wasted space)`);
    console.log('');

    const avgDataPerFile = totalDataRows / results.length;
    console.log(`✅ Average REAL data rows per file: ~${Math.round(avgDataPerFile)}`);

    if (avgDataPerFile < 200) {
      console.log(`\n🎯 CONCLUSION: The "3,200+ rows" are MOSTLY EMPTY!`);
      console.log(`   Most rows are blank padding. Actual data is much smaller.`);
    } else if (avgDataPerFile > 500) {
      console.log(`\n⚠️ CONCLUSION: These really do have ${Math.round(avgDataPerFile)} data rows per file!`);
      console.log(`   This is a lot of data. Each file tracks many items.`);
    }
  }

  console.log('\n');
}

main();
