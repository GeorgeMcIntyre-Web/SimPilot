// Test STLA-S Tool List parsing
const XLSX = require('xlsx');
const path = require('path');

// We need to manually import and test the parser logic
// Since we can't easily import TS files in Node, we'll simulate the key logic

const toolFile = path.join(__dirname, '../../SimPilot_Data/TestData/STLA_S_ZAR Tool List.xlsx');

console.log('=== TESTING STLA-S TOOL LIST PARSING ===');
console.log('File:', toolFile);
console.log('');

try {
  const workbook = XLSX.readFile(toolFile);
  const sheetName = 'ToolList';
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  console.log(`Sheet: ${sheetName}`);
  console.log(`Total rows: ${data.length}`);
  console.log('');

  // Find header row
  const headerRow = data[0];
  console.log('Header row (first 10 columns):');
  headerRow.slice(0, 10).forEach((header, idx) => {
    if (header) {
      console.log(`  [${idx}]: ${JSON.stringify(header)}`);
    }
  });
  console.log('');

  // Find "Equipment No Shown" column
  const equipNoShownIdx = headerRow.findIndex(cell => {
    if (!cell) return false;
    const normalized = String(cell)
      .toLowerCase()
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized.includes('equipment no') && normalized.includes('shown');
  });

  console.log(`"Equipment No Shown" column index: ${equipNoShownIdx}`);
  if (equipNoShownIdx >= 0) {
    console.log(`Column header: ${JSON.stringify(headerRow[equipNoShownIdx])}`);
  }
  console.log('');

  // Count rows with data in "Equipment No Shown" column
  let rowsWithEquipNo = 0;
  let rowsWithoutEquipNo = 0;
  let totalDataRows = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const hasAnyData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');

    if (!hasAnyData) continue;

    totalDataRows++;

    const equipNoValue = equipNoShownIdx >= 0 ? row[equipNoShownIdx] : null;
    if (equipNoValue !== null && equipNoValue !== undefined && String(equipNoValue).trim() !== '') {
      rowsWithEquipNo++;
    } else {
      rowsWithoutEquipNo++;
    }
  }

  console.log(`Total data rows (non-empty): ${totalDataRows}`);
  console.log(`Rows WITH "Equipment No Shown" value: ${rowsWithEquipNo}`);
  console.log(`Rows WITHOUT "Equipment No Shown" value: ${rowsWithoutEquipNo}`);
  console.log('');

  console.log('===CONCLUSION===');
  if (equipNoShownIdx >= 0) {
    console.log(`The "Equipment No Shown" column EXISTS at index ${equipNoShownIdx}`);
    console.log(`With current filter logic (hasEquipmentNoColumn && !equipmentNoShown):`);
    console.log(`  - Would skip ${rowsWithoutEquipNo} rows (no equipment number)`);
    console.log(`  - Would parse ${rowsWithEquipNo} rows (has equipment number)`);
    console.log('');
    console.log(`Expected tool count in UI: ${rowsWithEquipNo} tools`);
  } else {
    console.log('The "Equipment No Shown" column DOES NOT EXIST');
    console.log(`With current filter logic: Would parse all ${totalDataRows} rows`);
  }

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
