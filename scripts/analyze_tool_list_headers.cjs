// Analyze Tool List headers to see why 0 tools are parsed
const XLSX = require('xlsx');
const path = require('path');

const toolFile = path.join(__dirname, '../../SimPilot_Data/TestData/STLA_S_ZAR Tool List.xlsx');

console.log('=== ANALYZING TOOL LIST ===');
console.log('File:', toolFile);
console.log('');

try {
  const workbook = XLSX.readFile(toolFile);

  console.log('Sheets:', workbook.SheetNames.join(', '));
  console.log('');

  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n=== SHEET: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    console.log(`Total rows: ${data.length}`);

    // Find header row (look for "EQUIPMENT" or "TOOL" or "GUN")
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      const rowStr = JSON.stringify(row).toUpperCase();
      if (rowStr.includes('EQUIPMENT') || rowStr.includes('TOOL') || rowStr.includes('GUN')) {
        headerRowIdx = i;
        console.log(`\nHeader row at index ${i}:`);
        console.log(row);

        // Check for "EQUIPMENT NO SHOWN" column
        const hasEquipNoShown = row.some(cell => {
          if (!cell) return false;
          const cellStr = String(cell).toUpperCase();
          return cellStr.includes('EQUIPMENT') && cellStr.includes('SHOWN');
        });

        console.log(`\nHas "EQUIPMENT NO SHOWN" column: ${hasEquipNoShown}`);

        // List all columns
        console.log('\nAll column headers:');
        row.forEach((header, idx) => {
          if (header) {
            console.log(`  [${idx}]: ${header}`);
          }
        });

        break;
      }
    }

    if (headerRowIdx >= 0) {
      // Count non-empty data rows
      let count = 0;
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
        if (hasData) count++;
      }
      console.log(`\nNon-empty data rows after header: ${count}`);
    }
  });

} catch (error) {
  console.error('Error:', error.message);
}
