// Analyze Robot List Excel to understand actual structure
const XLSX = require('xlsx');
const path = require('path');

const robotFile = path.join(__dirname, '../../SimPilot_Data/TestData/Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx');

console.log('=== ANALYZING ROBOT LIST ===');
console.log('File:', robotFile);
console.log('');

try {
  const workbook = XLSX.readFile(robotFile);

  console.log('Sheets:', workbook.SheetNames.join(', '));
  console.log('');

  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n=== SHEET: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    console.log(`Total rows (including headers): ${data.length}`);

    // Show first 5 rows to understand structure
    console.log('\nFirst 5 rows:');
    data.slice(0, 5).forEach((row, idx) => {
      console.log(`Row ${idx}:`, row);
    });

    // Count non-empty data rows (skip header and empty rows)
    let nonEmptyRows = 0;
    let headerRowIdx = -1;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Try to detect header row (has "ROBOT" or "AREA" etc)
      if (headerRowIdx === -1) {
        const rowStr = JSON.stringify(row).toUpperCase();
        if (rowStr.includes('ROBOT') || rowStr.includes('AREA') || rowStr.includes('STATION')) {
          headerRowIdx = i;
          console.log(`\nHeader row detected at index ${i}:`, row);
          continue;
        }
      }

      // Count non-empty rows after header
      if (headerRowIdx >= 0 && i > headerRowIdx) {
        const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
        if (hasData) {
          nonEmptyRows++;
        }
      }
    }

    console.log(`\nNon-empty data rows (after header): ${nonEmptyRows}`);
    console.log(`Expected in UI: Should show ${nonEmptyRows} robots from this sheet`);
  });

} catch (error) {
  console.error('Error:', error.message);
}
